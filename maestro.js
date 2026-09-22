import { supabase } from './conexion.js';

const form = document.getElementById('formNuevoCliente');
const mensajeEstado = document.getElementById('mensajeEstado');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const listaNegocios = document.getElementById('listaNegocios');

// --- NUEVAS FUNCIONES PARA EL MODAL DE CONTRASEÑA ---
window.abrirModalPassword = function(id, nombre) {
    document.getElementById('modalNegocioId').value = id;
    document.getElementById('modalNegocioNombre').textContent = `Administrador de: ${nombre}`;
    document.getElementById('nuevaPassword').value = '';
    document.getElementById('modalMensaje').textContent = '';
    document.getElementById('modalPassword').style.display = 'flex';
};

window.cerrarModal = function() {
    document.getElementById('modalPassword').style.display = 'none';
};

window.guardarNuevaPassword = async function() {
    const negocioId = document.getElementById('modalNegocioId').value;
    const nuevaPassword = document.getElementById('nuevaPassword').value;
    const modalMensaje = document.getElementById('modalMensaje');

    if(nuevaPassword.length < 6) {
        modalMensaje.style.color = '#e74c3c';
        modalMensaje.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        return;
    }

    modalMensaje.style.color = '#f39c12';
    modalMensaje.textContent = '⏳ Actualizando bóveda...';

    try {
        // Llamaremos a una nueva función en la nube que crearemos en el paso 3
        const { data, error } = await supabase.functions.invoke('cambiar_password', {
            body: { negocioId, nuevaPassword }
        });

        if (error) throw error;

        modalMensaje.style.color = '#2ecc71';
        modalMensaje.textContent = '✅ ¡Contraseña actualizada!';
        setTimeout(cerrarModal, 2000); // Cierra el modal después de 2 segundos
        
    } catch (error) {
        console.error('Error:', error);
        modalMensaje.style.color = '#e74c3c';
        modalMensaje.textContent = '❌ Error al cambiar contraseña.';
    }
};
// ----------------------------------------------------

window.cambiarEstatus = async function(id, nuevoEstado) {
    try {
        const { error } = await supabase.from('negocios').update({ estatus_suscripcion: nuevoEstado }).eq('id', id);
        if (error) throw error;
        cargarNegocios();
    } catch (error) {
        alert('Hubo un error al cambiar el estatus.');
    }
};

async function cargarNegocios() {
    try {
        const { data: negocios, error } = await supabase
            .from('negocios')
            .select('id, nombre_comercial, fecha_registro, estatus_suscripcion')
            .neq('nombre_comercial', 'Administración Central SaaS')
            .order('fecha_registro', { ascending: false });

        if (error) throw error;

        listaNegocios.innerHTML = '';
        if (negocios.length === 0) {
            listaNegocios.innerHTML = '<li style="color: #7f8c8d; padding: 10px;">Aún no hay clientes registrados.</li>';
            return;
        }

        negocios.forEach(negocio => {
            const li = document.createElement('li');
            li.style.padding = '12px';
            li.style.borderBottom = '1px solid #eee';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            
            const fecha = new Date(negocio.fecha_registro).toLocaleDateString();
            const isActivo = negocio.estatus_suscripcion;

            // DIBUJAMOS EL NUEVO BOTÓN AZUL JUNTO AL DE ESTATUS
            li.innerHTML = `
                <span><strong>🏢 ${negocio.nombre_comercial}</strong></span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: ${isActivo ? '#e8f8f5' : '#fdedec'}; color: ${isActivo ? '#2ecc71' : '#e74c3c'}; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
                        ${isActivo ? '✅ Activo' : '❌ Inactivo'} (Alta: ${fecha})
                    </span>
                    
                    <button onclick="abrirModalPassword('${negocio.id}', '${negocio.nombre_comercial}')" 
                            style="background: #3498db; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 0.85em; font-weight: bold;" title="Cambiar Contraseña">
                        🔑 
                    </button>
                    
                    <button onclick="cambiarEstatus('${negocio.id}', ${!isActivo})" 
                            style="background: ${isActivo ? '#e74c3c' : '#2ecc71'}; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 0.85em; font-weight: bold;">
                        ${isActivo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                </div>
            `;
            listaNegocios.appendChild(li);
        });
    } catch (error) {
        listaNegocios.innerHTML = '<li style="color: #e74c3c;">❌ Error al cargar la lista de clientes.</li>';
    }
}

cargarNegocios();

form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const nombreComercial = document.getElementById('nombreComercial').value;
    const emailAdmin = document.getElementById('emailAdmin').value;
    const passwordAdmin = document.getElementById('passwordAdmin').value;

    mensajeEstado.style.color = '#f39c12';
    mensajeEstado.textContent = '⏳ Creando entorno del restaurante...';

    try {
        const { error } = await supabase.functions.invoke('registrar_cliente', {
            body: { nombreComercial, emailAdmin, passwordAdmin }
        });
        if (error) throw error;

        mensajeEstado.style.color = '#2ecc71';
        mensajeEstado.textContent = '✅ ¡Restaurante y administrador creados con éxito!';
        form.reset();
        cargarNegocios();
    } catch (error) {
        mensajeEstado.style.color = '#e74c3c';
        mensajeEstado.textContent = '❌ Error al crear el restaurante: ' + error.message;
    }
});

btnCerrarSesion.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
});