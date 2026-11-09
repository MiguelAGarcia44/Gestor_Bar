// js/core/scrollbars.js
// Gestor Bar - Scrollbars auto-ocultables: solo se muestran mientras el usuario hace scroll.

const DELAY_OCULTAR_MS = 900;
const temporizadores = new WeakMap();
let iniciado = false;

/**
 * Marca con `.is-scrolling` el elemento que está haciendo scroll (o <html> para la página)
 * y la retira tras un breve periodo de inactividad. El CSS hace visible el thumb solo con esa clase.
 */
export function iniciarScrollbarsAutoOcultables() {
  if (iniciado || typeof document === 'undefined') return;
  iniciado = true;

  document.addEventListener('scroll', (e) => {
    const objetivo = (e.target === document || e.target === document.body)
      ? document.documentElement
      : e.target;

    if (!(objetivo instanceof Element)) return;

    objetivo.classList.add('is-scrolling');
    clearTimeout(temporizadores.get(objetivo));
    temporizadores.set(objetivo, setTimeout(() => {
      objetivo.classList.remove('is-scrolling');
    }, DELAY_OCULTAR_MS));
  }, { capture: true, passive: true });
}
