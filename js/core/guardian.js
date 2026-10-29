// guardian.js
import { supabase } from './conexion.js';

export async function protegerRuta(rolesPermitidos) {
    // 1. Revisamos si hay una sesión activa en el navegador
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // No está logueado, lo mandamos al login
        window.location.replace('login.html');
        return null;
    }

    // 2. Si está logueado, verificamos qué rol y datos tiene en la base de datos
    const userId = session.user.id;
    const { data: perfil, error } = await supabase
        .from('usuarios')
        .select('*') // <-- CAMBIO 1: Seleccionamos todo (nombre, negocio_id, rol)
        .eq('id', userId)
        .single();

    if (error || !perfil) {
        window.location.replace('login.html');
        return null;
    }

    // 3. Validamos si su rol está en la lista de permitidos para esta página
    if (!rolesPermitidos.includes(perfil.rol)) {
        alert('Acceso denegado: No tienes el nivel de permisos requerido.');
        // Lo regresamos al login o a una página segura
        window.location.replace('login.html');
        return null;
    }

    // CAMBIO 2: Devolvemos el "perfil" con toda la info de la tabla usuarios
    return perfil;
}