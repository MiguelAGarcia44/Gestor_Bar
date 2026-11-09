// js/controllers/login.js
import { supabase } from '../core/conexion.js';
import { router, RUTAS } from '../core/router.js';
import { extraerMensajeError } from '../core/errors.js';

export function inicializarLogin(onLoginSuccess = () => {}) {
  const form = document.getElementById('loginForm');
  if (!form) return;

  // Evitar duplicar listeners
  form.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btnSubmit = document.getElementById('btnSubmit');
    const errorMensaje = document.getElementById('errorMensaje');

    // Estado visual de carga
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>Verificando credenciales...</span>';
    errorMensaje.style.display = 'none';

    try {
      // 1. Validar credenciales en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // 2. Obtener el perfil y rol del usuario
      const userId = authData.user.id;
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (perfilError || !perfil) {
        throw new Error('No se encontró el perfil de usuario en la base de datos.');
      }

      if (!perfil.activo) {
        await supabase.auth.signOut();
        throw new Error('Esta cuenta ha sido desactivada por el administrador.');
      }

      window.usuarioActual = perfil;
      router.configurarPestanasPorRol(perfil);
      onLoginSuccess(perfil);

      // 3. Redirección limpia basada en el rol
      switch (perfil.rol) {
        case 'super_admin':
          router.navegar(RUTAS.MAESTRO);
          break;
        case 'admin':
          router.navegar(RUTAS.TERMINAL);
          break;
        case 'mesero':
          router.navegar(RUTAS.TERMINAL);
          break;
        case 'bartender':
          router.navegar(RUTAS.BARRA);
          break;
        default:
          throw new Error('Rol no reconocido por el sistema.');
      }

    } catch (error) {
      errorMensaje.textContent = await extraerMensajeError(error);
      errorMensaje.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Iniciar Sesión</span>';
    }
  };
}
