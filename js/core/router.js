// js/core/router.js
// Gestor Bar - Enrutador Central de Vistas y Navegación por Pestañas

import { supabase } from './conexion.js';
import { iconSvg, initIcons } from './icons.js';

export const RUTAS = {
  LOGIN: '/login',
  TERMINAL: '/terminal',
  BARRA: '/barra',
  ADMIN: '/admin',
  MAESTRO: '/maestro',
  PREVIEW: '/preview'
};

class Router {
  constructor() {
    this.currentRoute = null;
    this.usuarioActual = null;
    this.viewsMounted = false;

    // Escuchar navegación del navegador (flechas atrás / adelante)
    window.addEventListener('popstate', () => {
      this.resolverRutaActual();
    });
  }

  /**
   * Obtiene la ruta limpia a partir de la URL actual del navegador.
   */
  obtenerRutaActual() {
    let path = window.location.pathname.toLowerCase();

    // Normalizar si viene de views/...
    if (path.includes('/views/auth/login.html')) return RUTAS.LOGIN;
    if (path.includes('/views/pos/terminal.html')) return RUTAS.TERMINAL;
    if (path.includes('/views/kds/barra.html')) return RUTAS.BARRA;
    if (path.includes('/views/crm/panel_local.html')) return RUTAS.ADMIN;
    if (path.includes('/views/saas/panel_maestro.html')) return RUTAS.MAESTRO;

    // Quitar slash final si existe
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Normalizar rutas limpias
    if (path === '' || path === '/' || path.endsWith('/index.html')) {
      return '/';
    }
    if (path.endsWith('/terminal')) return RUTAS.TERMINAL;
    if (path.endsWith('/barra')) return RUTAS.BARRA;
    if (path.endsWith('/admin')) return RUTAS.ADMIN;
    if (path.endsWith('/maestro')) return RUTAS.MAESTRO;
    if (path.endsWith('/login')) return RUTAS.LOGIN;
    if (path.endsWith('/preview')) return RUTAS.PREVIEW;

    return path;
  }

  /**
   * Navega a una ruta limpia sin recargar la página.
   * @param {string} ruta - Destino (ej. '/terminal', '/barra')
   */
  navegar(ruta) {
    if (this.currentRoute === ruta) return;

    // Actualizar historial del navegador con URL limpia
    window.history.pushState(null, '', ruta);
    this.activarRuta(ruta);
  }

  /**
   * Resuelve y activa la ruta en base a la URL actual.
   */
  resolverRutaActual() {
    const ruta = this.obtenerRutaActual();
    this.activarRuta(ruta);
  }

  /**
   * Muestra la vista correspondiente y actualiza las pestañas activas.
   */
  activarRuta(ruta) {
    this.currentRoute = ruta;

    // Ocultar todas las vistas
    const vistas = document.querySelectorAll('.app-view');
    vistas.forEach(v => {
      v.style.display = 'none';
      v.classList.remove('active');
    });

    // Actualizar estado de las pestañas en el header
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      const tabRoute = tab.getAttribute('data-route');
      if (tabRoute === ruta) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Mapeo a ID de contenedor de vista
    let viewId = 'view-login';
    switch (ruta) {
      case RUTAS.TERMINAL:
        viewId = 'view-terminal';
        break;
      case RUTAS.BARRA:
        viewId = 'view-barra';
        break;
      case RUTAS.ADMIN:
        viewId = 'view-admin';
        break;
      case RUTAS.MAESTRO:
        viewId = 'view-maestro';
        break;
      case RUTAS.LOGIN:
      case '/':
      default:
        viewId = 'view-login';
        break;
    }

    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.style.display = 'block';
      targetView.classList.add('active');

      // Notificar al controlador correspondiente para refrescar sus datos
      window.dispatchEvent(new CustomEvent('ruta-cambiada', { detail: { ruta, viewId } }));
    }

    // Actualizar visibilidad del Header de navegación (oculto en pantalla de login)
    const header = document.querySelector('.app-header');
    if (header) {
      header.style.display = (viewId === 'view-login') ? 'none' : 'flex';
    }

    initIcons();
  }

  /**
   * Configura las pestañas del Header según el rol del usuario conectado.
   */
  configurarPestanasPorRol(usuario) {
    this.usuarioActual = usuario;
    const headerTabs = document.getElementById('headerTabs');
    if (!headerTabs) return;

    headerTabs.innerHTML = '';
    const rol = usuario ? usuario.rol : null;

    if (!rol) return;

    // Definición de pestañas por rol
    const tabsConfig = [];

    if (rol === 'admin') {
      tabsConfig.push(
        { ruta: RUTAS.TERMINAL, label: 'Mesas (POS)', icon: 'layout-grid' },
        { ruta: RUTAS.BARRA, label: 'Barra (KDS)', icon: 'wine' },
        { ruta: RUTAS.ADMIN, label: 'Administración', icon: 'store' }
      );
    } else if (rol === 'mesero') {
      tabsConfig.push(
        { ruta: RUTAS.TERMINAL, label: 'Mesas (POS)', icon: 'layout-grid' }
      );
    } else if (rol === 'bartender') {
      tabsConfig.push(
        { ruta: RUTAS.BARRA, label: 'Monitor Barra (KDS)', icon: 'wine' }
      );
    } else if (rol === 'super_admin') {
      tabsConfig.push(
        { ruta: RUTAS.MAESTRO, label: 'Panel Maestro SaaS', icon: 'shield' }
      );
    }

    tabsConfig.forEach(tab => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-tab' + (this.currentRoute === tab.ruta ? ' active' : '');
      btn.setAttribute('data-route', tab.ruta);
      btn.innerHTML = `${iconSvg(tab.icon, { size: 16 })} <span>${tab.label}</span>`;
      btn.onclick = () => this.navegar(tab.ruta);
      headerTabs.appendChild(btn);
    });

    // Actualizar menú de usuario (avatar con iniciales, nombre y rol)
    const nombre = usuario.nombre_completo || usuario.email || 'Usuario';
    const iniciales = nombre
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('') || 'U';
    const ROLES = { super_admin: 'Súper Admin', admin: 'Admin', mesero: 'Mesero', bartender: 'Bartender' };

    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setText('userAvatarIniciales', iniciales);
    setText('userMenuAvatar', iniciales);
    setText('userMenuNombre', nombre);
    setText('userMenuRol', ROLES[rol] || rol);

    const btnUserMenu = document.getElementById('btnUserMenu');
    if (btnUserMenu) btnUserMenu.setAttribute('aria-label', `Menú de usuario: ${nombre}`);
  }
}

export const router = new Router();
