// js/core/icons.js
// Gestor Bar - Módulo de Iconografía Vectorial SVG con Lucide

function toPascal(str) {
  if (!str) return '';
  return str
    .replace(/(^\w|-\w)/g, c => c.replace('-', '').toUpperCase());
}

function toKebab(str) {
  if (!str) return '';
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Obtiene la referencia a Lucide en el contexto del navegador.
 */
function getLucide() {
  if (typeof window !== 'undefined' && window.lucide) {
    return window.lucide;
  }
  return null;
}

/**
 * Genera la cadena HTML completa del SVG de un icono de Lucide.
 * Ideal para interpolar en template strings (innerHTML).
 *
 * @param {string} name - Nombre del icono (ej. 'wine', 'beer', 'user', 'x')
 * @param {object} options - Opciones de renderizado (size, color, strokeWidth, className)
 * @returns {string} Código SVG seguro
 */
export function iconSvg(name, {
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  className = ''
} = {}) {
  const lucide = getLucide();
  const pascal = toPascal(name);

  if (lucide && lucide.icons && lucide.icons[pascal]) {
    const iconData = lucide.icons[pascal];
    const children = iconData
      .map(([tag, attrs]) => {
        const attrStr = Object.entries(attrs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        return `<${tag} ${attrStr}></${tag}>`;
      })
      .join('');

    const kebab = toKebab(pascal);
    const cls = ['lucide', `lucide-${kebab}`, className].filter(Boolean).join(' ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${children}</svg>`;
  }

  // Fallback si Lucide no se ha inicializado aún
  return `<i data-lucide="${toKebab(name)}" class="${className}" style="display:inline-flex; width:${size}px; height:${size}px;" aria-hidden="true"></i>`;
}

/**
 * Retorna un elemento DOM SVG listo para agregar con appendChild.
 */
export function renderIcon(name, options = {}) {
  const html = iconSvg(name, options);
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

/**
 * Inicializa y convierte todos los elementos <i data-lucide="..."></i> en SVGs
 * dentro de un contenedor dado (o el documento entero por defecto).
 */
export function initIcons(root = document) {
  const lucide = getLucide();
  if (lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons({ root });
  }
}
