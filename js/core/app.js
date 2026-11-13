// js/core/app.js
// Gestor Bar - Coordinador Principal de la Aplicación y Ciclo de Vida

import { supabase } from './conexion.js';
import { router, RUTAS } from './router.js';
import { iconSvg, initIcons } from './icons.js';
import { mostrarConfirmacion } from '../components/modal.js';
import { inicializarLogin } from '../controllers/login.js';
import { inicializarTerminal } from '../controllers/terminal.js';
import { inicializarBarra } from '../controllers/barra.js';
import { inicializarPanel } from '../controllers/local.js';
import { inicializarMaestro } from '../controllers/maestro.js';
import { iniciarScrollbarsAutoOcultables } from './scrollbars.js';

class App {
  constructor() {
    this.iniciarTema();
    this.bindUserMenu();
    this.bindThemeButton();
    this.bindLogoutButton();
    this.bindRouteChange();
    iniciarScrollbarsAutoOcultables();
  }

  /**
   * Menú de usuario: popover anclado al avatar (desktop) / bottom sheet (mobile).
   */
  bindUserMenu() {
    const btn = document.getElementById('btnUserMenu');
    const menu = document.getElementById('userMenu');
    const backdrop = document.getElementById('userMenuBackdrop');
    if (!btn || !menu) return;

    const esMobile = () => window.matchMedia('(max-width: 768px)').matches;

    const posicionar = () => {
      if (esMobile()) {
        menu.style.top = '';
        menu.style.right = '';
        return;
      }
      const r = btn.getBoundingClientRect();
      menu.style.top = `${r.bottom + 8}px`;
      menu.style.right = `${Math.max(12, window.innerWidth - r.right)}px`;
    };

    this.cerrarMenuUsuario = (devolverFoco = false) => {
      if (menu.hidden) return;
      menu.hidden = true;
      menu.classList.remove('open');
      if (backdrop) backdrop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (devolverFoco) btn.focus();
    };

    const abrir = () => {
      posicionar();
      menu.hidden = false;
      if (backdrop) backdrop.hidden = !esMobile();
      btn.setAttribute('aria-expanded', 'true');
      initIcons(menu);
      requestAnimationFrame(() => menu.classList.add('open'));
      const primero = menu.querySelector('.user-menu-item');
      if (primero) setTimeout(() => primero.focus({ preventScroll: true }), 50);
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.hidden) abrir();
      else this.cerrarMenuUsuario();
    });

    if (backdrop) backdrop.addEventListener('click', () => this.cerrarMenuUsuario());

    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) this.cerrarMenuUsuario();
    });

    document.addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.cerrarMenuUsuario(true);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...menu.querySelectorAll('.user-menu-item')];
        const idx = items.indexOf(document.activeElement);
        const sig = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        e.preventDefault();
        items[sig].focus();
      }
    });

    window.addEventListener('resize', () => {
      if (!menu.hidden) {
        posicionar();
        if (backdrop) backdrop.hidden = !esMobile();
      }
    });
    window.addEventListener('ruta-cambiada', () => this.cerrarMenuUsuario());
  }

  iniciarTema() {
    const temaGuardado = localStorage.getItem('GESTOR_BAR_THEME') || 'dark';
    document.documentElement.setAttribute('data-theme', temaGuardado);
    this.actualizarBotonTema(temaGuardado);
  }

  bindThemeButton() {
    const btn = document.getElementById('btnHeaderTheme');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const temaActual = document.documentElement.getAttribute('data-theme') || 'dark';
      const nuevoTema = temaActual === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nuevoTema);
      localStorage.setItem('GESTOR_BAR_THEME', nuevoTema);
      this.actualizarBotonTema(nuevoTema);
    });
  }

  actualizarBotonTema(tema) {
    const btn = document.getElementById('btnHeaderTheme');
    if (!btn) return;
    const isDark = tema === 'dark';
    btn.innerHTML = `${iconSvg(isDark ? 'sun' : 'moon', { size: 18 })} <span>${isDark ? 'Modo claro' : 'Modo oscuro'}</span>`;
    btn.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }

  bindLogoutButton() {
    const btn = document.getElementById('btnHeaderLogout');
    if (!btn) return;

    btn.onclick = () => {
      if (this.cerrarMenuUsuario) this.cerrarMenuUsuario();
      mostrarConfirmacion({
        titulo: 'Cerrar Sesión',
        mensaje: '¿Estás seguro de que deseas salir de tu cuenta?',
        tipo: 'warning',
        btnAceptarTexto: 'Cerrar Sesión',
        onConfirm: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) console.warn('[Gestor Bar] signOut con error, se limpia la sesión local:', error);
          window.usuarioActual = null;
          router.navegar(RUTAS.LOGIN);
        }
      });
    };
  }

  bindRouteChange() {
    window.addEventListener('ruta-cambiada', (e) => {
      const { ruta } = e.detail;
      this.despacharControlador(ruta);
    });
  }

  despacharControlador(ruta) {
    switch (ruta) {
      case RUTAS.TERMINAL:
        inicializarTerminal();
        break;
      case RUTAS.BARRA:
        inicializarBarra();
        break;
      case RUTAS.ADMIN:
        inicializarPanel();
        break;
      case RUTAS.MAESTRO:
        inicializarMaestro();
        break;
      case RUTAS.LOGIN:
        inicializarLogin((perfil) => {
          this.iniciarSesion(perfil);
        });
        break;
    }
  }

  async iniciar() {
    // 1. Mostrar pantalla de carga breve mientras valida sesión
    const loader = document.getElementById('appLoader');
    if (loader) loader.style.display = 'flex';

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (loader) loader.style.display = 'none';
        router.navegar(RUTAS.LOGIN);
        inicializarLogin((perfil) => this.iniciarSesion(perfil));
        return;
      }

      // Obtener perfil
      const { data: perfil, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !perfil || !perfil.activo) {
        await supabase.auth.signOut();
        if (loader) loader.style.display = 'none';
        router.navegar(RUTAS.LOGIN);
        return;
      }

      window.usuarioActual = perfil;
      this.iniciarSesion(perfil);

    } catch (err) {
      console.error('Error al iniciar la app:', err);
      router.navegar(RUTAS.LOGIN);
    } finally {
      if (loader) loader.style.display = 'none';
      initIcons();
    }
  }

  async iniciarSesion(perfil) {
    router.configurarPestanasPorRol(perfil);

    // Actualizar nombre de la organización en el header
    let nombreBar = 'Bar La Oveja Negra (Local Demo)';
    if (perfil.negocio_id) {
      try {
        const { data: neg } = await supabase
          .from('negocios')
          .select('nombre_comercial')
          .eq('id', perfil.negocio_id)
          .single();
        if (neg && neg.nombre_comercial) {
          nombreBar = neg.nombre_comercial;
        }
      } catch (err) {
        console.warn('Usando nombre de bar por defecto:', err);
      }
    }
    const tituloBarGlobal = document.getElementById('tituloBarGlobal');
    if (tituloBarGlobal) {
      tituloBarGlobal.textContent = nombreBar;
    }

    // Revisar si venía de un enlace directo guardado en sessionStorage (ej. /barra o /admin)
    const directRoute = sessionStorage.getItem('DIRECT_ROUTE');
    sessionStorage.removeItem('DIRECT_ROUTE');

    let rutaDestino = directRoute || router.obtenerRutaActual();

    // Si está en raíz o login, redirigir a la vista según su rol
    if (!rutaDestino || rutaDestino === '/' || rutaDestino === RUTAS.LOGIN) {
      switch (perfil.rol) {
        case 'super_admin':
          rutaDestino = RUTAS.MAESTRO;
          break;
        case 'bartender':
          rutaDestino = RUTAS.BARRA;
          break;
        case 'admin':
        case 'mesero':
        default:
          rutaDestino = RUTAS.TERMINAL;
          break;
      }
    }

    router.navegar(rutaDestino);
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => {
  app.iniciar();
});
