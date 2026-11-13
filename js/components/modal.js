// js/components/modal.js
// Gestor Bar - Sistema de Modales Accesibles (WCAG AAA, Soporte Teclado, Mobile-Safe)

import { iconSvg } from '../core/icons.js';

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.previousActiveElement = null;
    this.modalOptions = new Map();

    this.bindGlobalKeyboard();
  }

  bindGlobalKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        e.preventDefault();
        this.attemptClose(this.activeModal);
      }

      if (e.key === 'Tab' && this.activeModal) {
        this.handleFocusTrap(e);
      }
    });
  }

  handleFocusTrap(e) {
    const focusable = this.activeModal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * Abre un modal accesible.
   * @param {string|HTMLElement} modalEl - Selector o elemento backdrop del modal
   * @param {object} options - Opciones de accesibilidad y seguridad
   */
  open(modalEl, options = {}) {
    const el = typeof modalEl === 'string' ? document.querySelector(modalEl) : modalEl;
    if (!el) return;

    this.previousActiveElement = document.activeElement;

    const defaults = {
      preventMobileBackdropClose: true,
      hasPendingBalance: () => false,
      onClose: () => {},
    };

    const config = { ...defaults, ...options };
    this.modalOptions.set(el, config);
    this.activeModal = el;

    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.classList.add('open');
    el.style.display = 'flex';

    // Manejo de clic en backdrop (fondo oscuro)
    el.onclick = (e) => {
      if (e.target === el) {
        const isMobileOrTouch = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
        if (config.preventMobileBackdropClose && isMobileOrTouch) {
          // Bloqueo intencional en móvil para prevenir pérdidas por toques accidentales
          return;
        }
        this.attemptClose(el);
      }
    };

    // Botones de cerrar estándar [data-modal-close]
    const closeBtns = el.querySelectorAll('[data-modal-close]');
    closeBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.attemptClose(el);
      };
    });

    // Enfoque inicial al primer botón o input
    setTimeout(() => {
      const firstFocusable = el.querySelector(
        'input:not([type="hidden"]), select, button:not([data-modal-close]), button'
      );
      if (firstFocusable) firstFocusable.focus();
    }, 50);
  }

  /**
   * Intenta cerrar el modal. Si hay saldo pendiente y el usuario quiere salir,
   * muestra confirmación visual de alerta.
   */
  attemptClose(modalEl) {
    const config = this.modalOptions.get(modalEl) || {};
    const hasPending = typeof config.hasPendingBalance === 'function'
      ? config.hasPendingBalance()
      : !!config.hasPendingBalance;

    if (hasPending) {
      const balanceAmount = typeof config.getBalanceAmount === 'function'
        ? config.getBalanceAmount()
        : '0.00';

      mostrarConfirmacion({
        titulo: 'Mesa con Saldo Pendiente',
        mensaje: `Esta mesa tiene una cuenta activa de $${balanceAmount}. ¿Seguro que deseas salir sin cobrar? La mesa se mantendrá como OCUPADA.`,
        tipo: 'warning',
        btnAceptarTexto: 'Salir sin cobrar',
        onConfirm: () => {
          this.forceClose(modalEl);
        }
      });
      return;
    }

    this.forceClose(modalEl);
  }

  forceClose(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    modalEl.style.display = 'none';

    const config = this.modalOptions.get(modalEl);
    if (config && typeof config.onClose === 'function') {
      config.onClose();
    }

    this.modalOptions.delete(modalEl);

    if (this.activeModal === modalEl) {
      this.activeModal = null;
    }

    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }

  closeAll() {
    if (this.activeModal) {
      this.forceClose(this.activeModal);
    }
  }
}

export const modalManager = new ModalManager();

export function openModal(idOrEl, options) {
  modalManager.open(idOrEl, options);
}

export function closeModal(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.querySelector(idOrEl) : idOrEl;
  modalManager.attemptClose(el);
}

export function forceCloseModal(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.querySelector(idOrEl) : idOrEl;
  modalManager.forceClose(el);
}

/**
 * Diálogo de confirmación accesible dentro de la app (sustituto del confirm nativo).
 */
export function mostrarConfirmacion({
  titulo = 'Confirmar Acción',
  mensaje = '¿Estás seguro de continuar?',
  tipo = 'warning', // 'warning', 'danger', 'success'
  btnAceptarTexto = 'Confirmar',
  onConfirm = () => {}
} = {}) {
  const modal = document.getElementById('modalConfirmacion');
  if (!modal) {
    // Fallback seguro si el DOM no tiene el modal aún
    if (confirm(`${titulo}\n\n${mensaje}`)) {
      onConfirm();
    }
    return;
  }

  const textoTitulo = document.getElementById('textoTituloConfirm');
  const iconoConfirm = document.getElementById('iconoModalConfirm');
  const mensajeEl = document.getElementById('mensajeModalConfirm');
  const btnAceptar = document.getElementById('btnAceptarConfirm');

  if (textoTitulo) textoTitulo.textContent = titulo;
  if (mensajeEl) mensajeEl.textContent = mensaje;
  if (btnAceptar) {
    btnAceptar.textContent = btnAceptarTexto;
    btnAceptar.className = tipo === 'danger' ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';
    btnAceptar.onclick = () => {
      forceCloseModal(modal);
      onConfirm();
    };
  }

  if (iconoConfirm) {
    const iconName = tipo === 'danger' ? 'alert-triangle' : (tipo === 'success' ? 'check-circle-2' : 'alert-circle');
    const iconColor = tipo === 'danger' ? 'var(--color-danger)' : (tipo === 'success' ? 'var(--color-success)' : 'var(--color-warning)');
    iconoConfirm.innerHTML = iconSvg(iconName, { size: 18, color: iconColor });
  }

  openModal(modal);
}
