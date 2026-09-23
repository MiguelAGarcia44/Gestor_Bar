import { supabase } from './conexion.js';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btnSubmit = document.getElementById('btnSubmit');
    const errorMensaje = document.getElementById('errorMensaje');

    // Restaurar estado visual
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Verificando...';
    errorMensaje.style.display = 'none';

    try {
        // 1. Validar credenciales en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        // 2. Obtener el perfil y rol del usuario desde la tabla pública
        const userId = authData.user.id;
        const { data: perfil, error: perfilError } = await supabase
            .from('usuarios')
            .select('rol, activo')
            .eq('id', userId)
            .single(); // Exigimos un solo resultado

        if (perfilError || !perfil) {
            throw new Error('No se encontró el perfil de usuario en la base de datos.');
        }

        if (!perfil.activo) {
            await supabase.auth.signOut(); // Destruimos la sesión si está dado de baja
            throw new Error('Esta cuenta ha sido desactivada.');
        }

        // 3. Redirección táctica basada en el rol
        const rol = perfil.rol;
        switch (rol) {
            case 'super_admin':
                window.location.href = 'panel_maestro.html'; // Tu panel global
                break;
            case 'admin':
                window.location.href = 'panel_local.html'; // Panel del dueño del bar
                break;
            case 'mesero':
                window.location.href = 'terminal.html'; // El Punto de Venta operativo
                break;
            case 'bartender':
                window.location.href = 'barra.html'; // Panel del dueño del bar
                break;    
            default:
                throw new Error('Rol no reconocido por el sistema.');
        }

    } catch (error) {
        errorMensaje.textContent = error.message === 'Invalid login credentials' 
            ? 'Correo o contraseña incorrectos.' 
            : error.message;
        errorMensaje.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Ingresar';
    }
});