// js/components/toast.js
// Gestor Bar - Sistema de Notificaciones Toast Flotantes (Reemplazo de alerts)

import { iconSvg } from '../core/icons.js';

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
      max-width: 380px;
      width: calc(100% - 2.5rem);
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Muestra una notificación toast accesible y estilizada.
 * @param {string} mensaje - Texto de la notificación
 * @param {'success'|'danger'|'warning'|'info'} tipo - Tipo de notificación
 * @param {number} duracion - Duración en ms (default 3200ms)
 */
export function showToast(mensaje, tipo = 'info', duracion = 3200) {
  const container = ensureContainer();

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  let iconName = 'info';
  let borderColor = 'var(--accent-primary)';
  let iconColor = 'var(--accent-primary)';

  if (tipo === 'success') {
    iconName = 'check-circle-2';
    borderColor = 'var(--color-success)';
    iconColor = 'var(--color-success)';
  } else if (tipo === 'danger') {
    iconName = 'x-circle';
    borderColor = 'var(--color-danger)';
    iconColor = 'var(--color-danger)';
  } else if (tipo === 'warning') {
    iconName = 'alert-triangle';
    borderColor = 'var(--color-warning)';
    iconColor = 'var(--color-warning)';
  }

  toast.style.cssText = `
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-left: 4px solid ${borderColor};
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: 500;
    pointer-events: auto;
    animation: toastSlideIn 200ms ease;
    transition: opacity 200ms ease, transform 200ms ease;
  `;

  toast.innerHTML = `
    ${iconSvg(iconName, { size: 18, color: iconColor })}
    <span style="flex:1; line-height:1.4;">${mensaje}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }, duracion);
}

// Estilos de animación en el DOM
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}
