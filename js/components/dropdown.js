// js/components/dropdown.js
// Custom Select Component accesible con búsqueda integrada y soporte de teclado

import { iconSvg } from '../core/icons.js';

export class CustomSelect {
  /**
   * @param {HTMLElement|string} targetElement - Contenedor o elemento select original
   * @param {object} options - Configuración
   */
  constructor(targetElement, {
    placeholder = 'Selecciona una opción...',
    searchPlaceholder = 'Buscar...',
    options = [],
    initialValue = '',
    onSelect = () => {},
    icon = 'glass-water'
  } = {}) {
    this.container = typeof targetElement === 'string'
      ? document.querySelector(targetElement)
      : targetElement;

    this.placeholder = placeholder;
    this.searchPlaceholder = searchPlaceholder;
    this.options = options; // Array de { value, label, price, subtitle }
    this.selectedValue = initialValue;
    this.onSelect = onSelect;
    this.icon = icon;
    this.isOpen = false;
    this.highlightedIndex = -1;
    this.filteredOptions = [...this.options];

    this.init();
  }

  init() {
    if (!this.container) return;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'custom-dropdown';

    const selectedItem = this.options.find(o => o.value === this.selectedValue);
    const initialText = selectedItem ? selectedItem.label : this.placeholder;

    this.wrapper.innerHTML = `
      <button type="button" class="dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="trigger-left" style="display:flex; align-items:center; gap:0.5rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${this.icon ? iconSvg(this.icon, { size: 16, className: 'trigger-icon' }) : ''}
          <span class="trigger-label">${initialText}</span>
        </span>
        <span class="chevron">${iconSvg('chevron-down', { size: 16 })}</span>
      </button>

      <div class="dropdown-popover" role="listbox" style="display:none;">
        <div class="dropdown-search-box">
          <input type="search" class="dropdown-search-input" placeholder="${this.searchPlaceholder}" aria-label="${this.searchPlaceholder}">
        </div>
        <ul class="dropdown-options-list" tabindex="-1"></ul>
      </div>
    `;

    // Si reemplaza a un select nativo, lo insertamos en el DOM
    if (this.container.tagName === 'SELECT') {
      this.nativeSelect = this.container;
      this.nativeSelect.style.display = 'none';
      this.nativeSelect.parentNode.insertBefore(this.wrapper, this.nativeSelect.nextSibling);
    } else {
      this.container.innerHTML = '';
      this.container.appendChild(this.wrapper);
    }

    this.triggerBtn = this.wrapper.querySelector('.dropdown-trigger');
    this.popover = this.wrapper.querySelector('.dropdown-popover');
    this.searchInput = this.wrapper.querySelector('.dropdown-search-input');
    this.optionsList = this.wrapper.querySelector('.dropdown-options-list');
    this.labelEl = this.wrapper.querySelector('.trigger-label');

    this.bindEvents();
    this.renderOptions();
  }

  setOptions(newOptions, preserveValue = false) {
    this.options = newOptions;
    this.filteredOptions = [...newOptions];
    if (!preserveValue) {
      this.selectedValue = '';
      this.labelEl.textContent = this.placeholder;
    }
    this.renderOptions();
  }

  renderOptions() {
    this.optionsList.innerHTML = '';

    if (this.filteredOptions.length === 0) {
      const emptyEl = document.createElement('li');
      emptyEl.style.padding = '0.75rem';
      emptyEl.style.color = 'var(--text-muted)';
      emptyEl.style.fontSize = 'var(--text-xs)';
      emptyEl.style.textAlign = 'center';
      emptyEl.textContent = 'Sin resultados';
      this.optionsList.appendChild(emptyEl);
      return;
    }

    this.filteredOptions.forEach((opt, idx) => {
      const li = document.createElement('li');
      li.className = 'dropdown-option' + (opt.value === this.selectedValue ? ' selected' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', opt.value === this.selectedValue ? 'true' : 'false');
      li.dataset.value = opt.value;
      li.dataset.index = idx;

      const priceTag = opt.price ? `<span style="font-weight:700; color:var(--accent-gold); margin-left:auto; padding-left:0.5rem;">$${opt.price}</span>` : '';

      li.innerHTML = `
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${opt.label}</span>
        ${priceTag}
        <span class="check-icon" style="margin-left:0.5rem;">${iconSvg('check', { size: 16 })}</span>
      `;

      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(opt);
      });

      this.optionsList.appendChild(li);
    });
  }

  bindEvents() {
    this.triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    this.searchInput.addEventListener('input', () => {
      const query = this.searchInput.value.toLowerCase().trim();
      this.filteredOptions = this.options.filter(opt =>
        opt.label.toLowerCase().includes(query) || (opt.subtitle && opt.subtitle.toLowerCase().includes(query))
      );
      this.highlightedIndex = -1;
      this.renderOptions();
    });

    // Accesibilidad de teclado (el popover puede vivir fuera del wrapper cuando se abre como portal)
    const onKeydown = (e) => {
      if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.open();
        return;
      }

      if (this.isOpen) {
        if (e.key === 'Tab') {
          // Mantener el orden de tabulación natural (el popover vive en <body>)
          this.close();
          this.triggerBtn.focus({ preventScroll: true });
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation(); // Evita que el Esc cierre también el modal contenedor
          this.close();
          this.triggerBtn.focus();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveHighlight(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveHighlight(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredOptions.length) {
            this.selectOption(this.filteredOptions[this.highlightedIndex]);
          }
        }
      }
    };
    this.wrapper.addEventListener('keydown', onKeydown);
    this.popover.addEventListener('keydown', onKeydown);

    // Clic fuera para cerrar (considera el popover aunque esté montado en <body>)
    document.addEventListener('click', (e) => {
      if (!this.wrapper.contains(e.target) && !this.popover.contains(e.target)) {
        this.close();
      }
    });
  }

  moveHighlight(step) {
    const items = this.optionsList.querySelectorAll('.dropdown-option');
    if (items.length === 0) return;

    items.forEach(el => el.classList.remove('highlighted'));
    this.highlightedIndex = Math.max(0, Math.min(items.length - 1, this.highlightedIndex + step));
    const target = items[this.highlightedIndex];
    if (target) {
      target.classList.add('highlighted');
      target.scrollIntoView({ block: 'nearest' });
    }
  }

  selectOption(opt) {
    this.selectedValue = opt.value;
    this.labelEl.textContent = opt.label;
    if (this.nativeSelect) {
      this.nativeSelect.value = opt.value;
      this.nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    this.renderOptions();
    this.close();
    this.triggerBtn.focus();
    this.onSelect(opt);
  }

  open() {
    this.isOpen = true;
    this.triggerBtn.classList.add('open');
    this.triggerBtn.setAttribute('aria-expanded', 'true');
    this.searchInput.value = '';
    this.filteredOptions = [...this.options];
    this.renderOptions();

    // Portal: montar el popover en <body> con posición fija para que ningún
    // contenedor con overflow/transform (p. ej. modales) lo recorte.
    document.body.appendChild(this.popover);
    this.popover.classList.add('is-portal');
    this.popover.style.display = 'flex';
    this.popover.classList.add('visible');
    this.lastRect = null;
    this.position();
    this.trackPosition();

    setTimeout(() => this.searchInput.focus({ preventScroll: true }), 50);
  }

  /**
   * Coloca el popover pegado al trigger; abre hacia arriba si abajo no hay espacio.
   */
  position() {
    const rect = this.triggerBtn.getBoundingClientRect();
    const margen = 12;
    const separacion = 6;
    const alturaIdeal = 300;
    const alturaMinima = 180;
    const vh = window.innerHeight;

    const espacioAbajo = vh - rect.bottom - margen - separacion;
    const espacioArriba = rect.top - margen - separacion;
    const abrirArriba = espacioAbajo < Math.min(alturaIdeal, alturaMinima + 40) && espacioArriba > espacioAbajo;
    const disponible = abrirArriba ? espacioArriba : espacioAbajo;

    const pop = this.popover.style;
    pop.left = `${Math.max(margen, rect.left)}px`;
    pop.width = `${Math.min(rect.width, window.innerWidth - margen * 2)}px`;
    pop.maxHeight = `${Math.max(alturaMinima, Math.min(alturaIdeal, disponible))}px`;

    if (abrirArriba) {
      pop.top = 'auto';
      pop.bottom = `${vh - rect.top + separacion}px`;
    } else {
      pop.bottom = 'auto';
      pop.top = `${rect.bottom + separacion}px`;
    }
    this.popover.classList.toggle('open-up', abrirArriba);
  }

  /**
   * Sigue al trigger mientras el popover está abierto (scroll, resize, animaciones del modal)
   * y lo cierra si el trigger desaparece o su modal se cierra.
   */
  trackPosition() {
    cancelAnimationFrame(this.rafId);
    const tick = () => {
      if (!this.isOpen) return;

      const modalCerrado = this.wrapper.closest('.modal-backdrop:not(.open)');
      const rect = this.triggerBtn.getBoundingClientRect();
      if (!this.wrapper.isConnected || modalCerrado || rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
        this.close();
        return;
      }

      const r = this.lastRect;
      if (!r || r.top !== rect.top || r.left !== rect.left || r.width !== rect.width || r.bottom !== rect.bottom) {
        this.lastRect = rect;
        this.position();
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.triggerBtn.classList.remove('open');
    this.triggerBtn.setAttribute('aria-expanded', 'false');
    this.popover.style.display = 'none';
    this.popover.classList.remove('visible', 'is-portal', 'open-up');
    cancelAnimationFrame(this.rafId);
    // Devolver el popover a su wrapper original
    ['top', 'bottom', 'left', 'width', 'maxHeight'].forEach(prop => { this.popover.style[prop] = ''; });
    this.wrapper.appendChild(this.popover);
    this.highlightedIndex = -1;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  setValue(val) {
    this.selectedValue = val;
    const item = this.options.find(o => o.value === val);
    this.labelEl.textContent = item ? item.label : this.placeholder;
    if (this.nativeSelect) {
      this.nativeSelect.value = val;
    }
    this.renderOptions();
  }

  getValue() {
    return this.selectedValue;
  }
}
