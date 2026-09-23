import { supabase } from './conexion.js';

const form = document.getElementById('formNuevoCliente');
const mensajeEstado = document.getElementById('mensajeEstado');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const listaNegocios = document.getElementById('listaNegocios');

// --- FUNCIONES PARA EL MODAL DE EDICIÓN ---
window.abrirModalEditar = function(id, nombreBar, nombreAdmin) {
    document.getElementById('modalEditId').value = id;
    document.getElementById('editNombreBar').value = nombreBar;
    document.getElementById('editNombreAdmin').value = nombreAdmin;
    document.getElementById('editPassword').value = '';
    document.getElementById('modalEditMensaje').textContent = '';
    document.getElementById('modalEditarCliente').style.display = 'flex';
};

window.cerrarModalEditar = function() {
    document.getElementById('modalEditarCliente').style.display = 'none';
};

window.guardarEdicionCliente = async function() {
    const negocioId = document.getElementById('modalEditId').value;
    const nuevoNombreBar = document.getElementById('editNombreBar').value;
    const nuevoNombreAdmin = document.getElementById('editNombreAdmin').value;
    const nuevaPassword = document.getElementById('editPassword').value;
    const modalMensaje = document.getElementById('modalEditMensaje');

    modalMensaje.style.color = '#f39c12';
    modalMensaje.textContent = '⏳ Actualizando datos...';

    try {
        const { error } = await supabase.functions.invoke('editar_cliente', {
            body: { negocioId, nuevoNombreBar, nuevoNombreAdmin, nuevaPassword }
        });

        if (error) throw error;

        modalMensaje.style.color = '#2ecc71';
        modalMensaje.textContent = '✅ ¡Cambios guardados!';
        setTimeout(() => {
            cerrarModalEditar();
            cargarNegocios(); 
        }, 1500);
        
    } catch (error) {
        modalMensaje.style.color = '#e74c3c';
        modalMensaje.textContent = '❌ Error al editar cliente.';
    }
};

// --- FUNCIÓN DE ESTATUS ---
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
            .select(`
                id, nombre_comercial, fecha_registro, estatus_suscripcion,
                usuarios ( nombre_completo, rol )
            `)
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
            
            const admin = negocio.usuarios.find(u => u.rol === 'admin');
            const nombreAdmin = admin ? admin.nombre_completo : 'Sin Admin';

            li.innerHTML = `
                <div>
                    <strong>🏢 ${negocio.nombre_comercial}</strong>
                    <div style="font-size: 0.85em; color: #7f8c8d; margin-top: 4px;">👤 Dueño: ${nombreAdmin}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: ${isActivo ? '#e8f8f5' : '#fdedec'}; color: ${isActivo ? '#2ecc71' : '#e74c3c'}; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
                        ${isActivo ? '✅ Activo' : '❌ Inactivo'}
                    </span>
                    
                    <button onclick="abrirModalEditar('${negocio.id}', '${negocio.nombre_comercial}', '${nombreAdmin}')" 
                            style="background: #f39c12; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 0.85em; font-weight: bold;" title="Editar Cliente">
                        ✏️ Editar
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

// --- CREACIÓN DE CLIENTES NUEVOS ---
form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const nombreComercial = document.getElementById('nombreComercial').value;
    const nombreAdmin = document.getElementById('nombreAdmin').value;
    const emailAdmin = document.getElementById('emailAdmin').value;
    const passwordAdmin = document.getElementById('passwordAdmin').value;

    mensajeEstado.style.color = '#f39c12';
    mensajeEstado.textContent = '⏳ Creando entorno del restaurante...';

    try {
        const { error } = await supabase.functions.invoke('registrar_cliente', {
            body: { nombreComercial, nombreAdmin, emailAdmin, passwordAdmin }
        });
        if (error) throw error;

        mensajeEstado.style.color = '#2ecc71';
        mensajeEstado.textContent = '✅ ¡Restaurante creado con éxito!';
        form.reset();
        cargarNegocios();
    } catch (error) {
        mensajeEstado.style.color = '#e74c3c';
        mensajeEstado.textContent = '❌ Error al crear el restaurante.';
    }
});

btnCerrarSesion.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
});

// --- INICIALIZACIÓN DIRECTA DEL PANEL MAESTRO ---
async function inicializarMaestro() {
    try {
        // Le preguntamos directamente a Supabase quién está logueado
        const { data: { user }, error } = await supabase.auth.getUser();
        
        const identificadorElement = document.getElementById('identificadorUsuario');
        
        if (user && identificadorElement) {
            // Usamos el correo del Súper Admin como su placa de identidad
            identificadorElement.textContent = `${user.email} (SaaS Admin)`;
        }

        // Cargamos los negocios sin esperar más
        cargarNegocios();
        
    } catch (error) {
        console.error("Error al verificar la sesión del maestro:", error);
        cargarNegocios(); // Cargamos la lista de todos modos
    }
}

// Arrancamos inmediatamente
inicializarMaestro();