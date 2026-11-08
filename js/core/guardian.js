// guardian.js
import { supabase } from './conexion.js';

function irALogin() {
    const rutaLogin = window.location.pathname.includes('/views/')
        ? '../auth/login.html'
        : './views/auth/login.html';
    window.location.replace(rutaLogin);
}

export async function protegerRuta(rolesPermitidos) {
    // 1. Revisamos si hay una sesión activa en el navegador
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        irALogin();
        return null;
    }

    // 2. Si está logueado, verificamos qué rol y datos tiene en la base de datos
    const userId = session.user.id;
    const { data: perfil, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !perfil) {
        irALogin();
        return null;
    }

    // 3. Validamos si su rol está en la lista de permitidos para esta página
    if (!rolesPermitidos.includes(perfil.rol)) {
        alert('Acceso denegado: No tienes el nivel de permisos requerido.');
        irALogin();
        return null;
    }

    return perfil;
}
