import { supabase } from './conexion.js';

let negocioIdActual = null;
let usuarioId = null;
let rolUsuario = null;
let listaProductosGlobal = []; 
let mesaActualId = null; 
let cuentaActivaId = null; 

// --- 1. INICIALIZACIÓN ---
async function inicializarTerminal() {
    const usuario = window.usuarioActual;
    negocioIdActual = usuario.negocio_id;
    usuarioId = usuario.id;
    rolUsuario = usuario.rol;

    // 1. Estandarizamos el identificador visual AQUÍ ADENTRO (seguro)
    const rolFormateado = rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1);
    const identificadorElement = document.getElementById('identificadorUsuario');
    if (identificadorElement) {
        identificadorElement.textContent = `${usuario.nombre_completo} (${rolFormateado})`;
    }

    // 2. Cargar nombre del bar
    const { data: negocio } = await supabase.from('negocios').select('nombre_comercial').eq('id', negocioIdActual).single();
    if(negocio) {
        document.getElementById('tituloBar').textContent = `🍻 ${negocio.nombre_comercial} - Terminal POS`;
    }

    await obtenerProductos();
    await cargarMesas();
}

// --- 2. GESTIÓN DE PRODUCTOS (Reemplazo de Google Script) ---
async function obtenerProductos() {
    const { data, error } = await supabase.from('productos')
        .select('*').eq('negocio_id', negocioIdActual).eq('disponible', true).order('nombre');
    
    if(error) { alert("Error al cargar productos: " + error.message); return; }
    
    listaProductosGlobal = data;
    const select = document.getElementById('selectProducto');
    select.innerHTML = '<option value="">-- Selecciona un producto --</option>';
    
    data.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id; // Usamos ID en vez de nombre
        option.setAttribute('data-precio', producto.precio_actual);
        option.textContent = `${producto.nombre} - $${producto.precio_actual}`;
        select.appendChild(option);
    });
}

// --- 3. DIBUJAR MESAS DESDE SUPABASE ---
async function cargarMesas() {
    const { data: mesas } = await supabase.from('mesas').select('*').eq('negocio_id', negocioIdActual).eq('activa', true).order('etiqueta');
    const { data: cuentas } = await supabase.from('cuentas').select('*').eq('negocio_id', negocioIdActual).eq('estado', 'abierta');

    const contenedor = document.getElementById('contenedorMesas');
    if(!contenedor) return;
    contenedor.innerHTML = '';
    
    if(!mesas || mesas.length === 0) {
        contenedor.innerHTML = '<p style="color: #7f8c8d;">No hay mesas habilitadas.</p>';
        return;
    }

    mesas.forEach(mesa => {
        const cuentaAbierta = (cuentas || []).find(c => c.mesa_id === mesa.id);
        const isOcupada = !!cuentaAbierta;

        const div = document.createElement('div');
        div.className = `mesa ${isOcupada ? 'ocupada' : ''}`;
        
        // Inyectamos el botón del tache (X) y forzamos el diseño del texto
        div.innerHTML = `
            <button class="btn-borrar-mesa" title="Ocultar Mesa" onclick="event.stopPropagation(); ocultarMesa('${mesa.id}', ${isOcupada})">✖</button>
            <span style="font-size: 1.2em; font-weight: bold;">${mesa.etiqueta}</span>
            <div class="estado" style="color: ${isOcupada ? '#c0392b' : '#27ae60'};">${isOcupada ? 'Ocupada' : 'Libre'}</div>
        `;
        
        div.onclick = () => window.abrirModal(mesa.id, mesa.etiqueta, cuentaAbierta);
        contenedor.appendChild(div);
    });
}

// --- 4. HABILITAR NUEVAS MESAS ---
document.getElementById('btnAgregarMesa')?.addEventListener('click', async () => {
    const etiqueta = prompt('Escribe el nombre de la mesa (Ej. Mesa 1, Terraza A):');
    if(!etiqueta) return;
    await supabase.from('mesas').insert([{ negocio_id: negocioIdActual, etiqueta: etiqueta, activa: true }]);
    cargarMesas();
});

window.cerrarModalPedido = function() {
    document.getElementById('modalPedido').style.display = 'none';
    document.getElementById('selectProducto').value = '';
    mesaActualId = null;
    cuentaActivaId = null;
};

// --- 5. LOGICA DEL MODAL DE PEDIDOS ---
window.abrirModal = async function(mesaId, etiqueta, cuentaExistente) {
    mesaActualId = mesaId;
    document.getElementById('tituloModalMesa').textContent = etiqueta;
    
    if (cuentaExistente) {
        cuentaActivaId = cuentaExistente.id;
        await actualizarVistaCuenta();
    } else {
        // La mesa está libre, NO creamos la cuenta todavía
        cuentaActivaId = null;
        const lista = document.getElementById('listaCuenta');
        lista.innerHTML = '<li style="color: #7f8c8d; font-style: italic;">Mesa libre. Agrega un producto para abrir la cuenta.</li>';
        document.getElementById('totalCuenta').textContent = '0.00';
    }
    
    document.getElementById('modalPedido').style.display = 'flex';
};

// --- 6. AGREGAR A LA COMANDA ---
window.agregarProductoCuenta = async function() {
    const select = document.getElementById('selectProducto');
    const productoId = select.value;
    const cantidadInput = document.getElementById('cantidadProducto');
    const cantidad = cantidadInput ? parseInt(cantidadInput.value) : 1;
    
    if (!productoId) { alert('Por favor selecciona un producto.'); return; }

    // Si la mesa estaba libre, creamos la cuenta en este preciso instante
    if (!cuentaActivaId) {
        const { data: nuevaCuenta } = await supabase.from('cuentas').insert([{
            negocio_id: negocioIdActual, 
            mesa_id: mesaActualId, 
            mesero_id: usuarioId, 
            estado: 'abierta', 
            total: 0,
            fecha_apertura: obtenerFechaLocal() // <-- ¡Hora local exacta de apertura!
        }]).select().single();
        
        cuentaActivaId = nuevaCuenta.id;
        cargarMesas(); 
    }

    const producto = listaProductosGlobal.find(p => p.id === productoId);
    
    const { data: existente } = await supabase.from('comandas')
        .select('*').eq('cuenta_id', cuentaActivaId).eq('producto_id', productoId).eq('estado_preparacion', 'pendiente').single();

    if (existente) {
        await supabase.from('comandas').update({ cantidad: existente.cantidad + cantidad }).eq('id', existente.id);
    } else {
        await supabase.from('comandas').insert([{
            negocio_id: negocioIdActual, cuenta_id: cuentaActivaId, producto_id: productoId, 
            cantidad: cantidad, precio_unitario: producto.precio_actual, estado_preparacion: 'pendiente'
        }]);
    }
    
    select.value = ''; 
    if(cantidadInput) cantidadInput.value = 1;
    await actualizarVistaCuenta();
};

// --- 7. DIBUJAR CUENTA Y BOTONES +/- ---
async function actualizarVistaCuenta() {
    const lista = document.getElementById('listaCuenta');
    const labelTotal = document.getElementById('totalCuenta');
    lista.innerHTML = '';
    let totalGlobal = 0;

    const { data: comandas } = await supabase.from('comandas').select('*').eq('cuenta_id', cuentaActivaId).order('fecha_solicitud');

    if (!comandas || comandas.length === 0) {
        lista.innerHTML = '<li style="color: #7f8c8d; font-style: italic;">Sin productos aún</li>';
    } else {
        comandas.forEach(function(item) {
            const producto = listaProductosGlobal.find(p => p.id === item.producto_id);
            const nombre = producto ? producto.nombre : 'Desconocido';
            const subtotal = item.precio_unitario * item.cantidad;
            totalGlobal += subtotal;
            const estadoEmoji = item.estado_preparacion === 'pendiente' ? '⏳' : '✅';
            
            lista.innerHTML += `
            <li style="border-bottom: 1px solid #f0f0f0; padding: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex-grow: 1;">
                    <strong style="color: #2c3e50;">${nombre} ${estadoEmoji}</strong><br>
                    <span style="color: #7f8c8d; font-size: 0.85rem;">$${item.precio_unitario} c/u</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="display: flex; align-items: center; background-color: #ecf0f1; border-radius: 20px; padding: 2px 8px;">
                        <button onclick="disminuirCantidad('${item.id}', ${item.cantidad})" style="border: none; background: none; color: #e74c3c; font-weight: bold; cursor: pointer;">-</button>
                        <span style="font-weight: bold; min-width: 20px; text-align: center;">${item.cantidad}</span>
                        <button onclick="aumentarCantidad('${item.id}', ${item.cantidad})" style="border: none; background: none; color: #27ae60; font-weight: bold; cursor: pointer;">+</button>
                    </div>
                    <strong style="min-width: 65px; text-align: right;">$${subtotal.toFixed(2)}</strong>
                    <button onclick="eliminarProducto('${item.id}')" style="background: none; border: none; color: #c0392b; cursor: pointer; font-size: 1.2rem;">&times;</button>
                </div>
            </li>`;
        });
    }
    
    labelTotal.textContent = totalGlobal.toFixed(2);
}

// Funciones globales para botones +/-/Eliminar en Supabase
window.aumentarCantidad = async function(comandaId, cantidadActual) {
    await supabase.from('comandas').update({ cantidad: cantidadActual + 1 }).eq('id', comandaId);
    actualizarVistaCuenta();
};
window.disminuirCantidad = async function(comandaId, cantidadActual) {
    if (cantidadActual > 1) {
        await supabase.from('comandas').update({ cantidad: cantidadActual - 1 }).eq('id', comandaId);
        actualizarVistaCuenta();
    } else {
        window.eliminarProducto(comandaId);
    }
};
window.eliminarProducto = async function(comandaId) {
    await supabase.from('comandas').delete().eq('id', comandaId);
    actualizarVistaCuenta();
};

// --- 8. COBRAR CUENTA ---
document.getElementById('btnPagar')?.addEventListener('click', async () => {
    if(!cuentaActivaId) {
        alert("Error: No se detectó una cuenta activa.");
        return; 
    }

    const totalCalculado = parseFloat(document.getElementById('totalCuenta').textContent);
    if(totalCalculado === 0) { 
        alert('La cuenta está en ceros, no hay nada que cobrar.'); 
        return; 
    }

    if (confirm(`¿Confirmas el cobro total por $${totalCalculado} y liberar la mesa?`)) {
        try {
            // Generamos la fecha compensando la diferencia de zona horaria local
            const fechaActual = new Date();
            const compensacionMinutos = fechaActual.getTimezoneOffset();
            const fechaLocalCompensada = new Date(fechaActual.getTime() - (compensacionMinutos * 60000));
            // Formateamos para que Supabase lo acepte perfectamente
            const timestampLocal = fechaLocalCompensada.toISOString();

            const { error } = await supabase.from('cuentas')
                .update({ 
                    estado: 'cerrada', 
                    total: totalCalculado,
                    fecha_cierre: obtenerFechaLocal()
                })
                .eq('id', cuentaActivaId);

            if (error) {
                console.error("Detalle técnico del error:", error);
                throw new Error(error.message);
            }

            alert('¡Cuenta pagada y mesa liberada!');
            window.cerrarModalPedido();
            cargarMesas();
            
        } catch (error) {
            alert('❌ No se pudo liberar la mesa. Revisa la consola.');
        }
    }
});

// --- 9. INVENTARIO (Solo Admin) ---
window.abrirModalNuevoProducto = function() {
    document.getElementById('modalNuevoProducto').style.display = 'flex';
};
window.cerrarModalProducto = function() {
    document.getElementById('modalNuevoProducto').style.display = 'none';
    document.getElementById('nuevoNombre').value = '';
    document.getElementById('nuevoCosto').value = '';
};
window.guardarProducto = async function(event) {
    const nombre = document.getElementById('nuevoNombre').value;
    const costo = parseFloat(document.getElementById('nuevoCosto').value);
    if (nombre.trim() === '' || isNaN(costo) || costo <= 0) return alert('Ingresa datos válidos.');
    
    const btn = event.target;
    btn.textContent = "Guardando..."; btn.disabled = true;

    await supabase.from('productos').insert([{ negocio_id: negocioIdActual, nombre, precio_actual: costo, disponible: true }]);
    
    alert('¡Producto guardado exitosamente!');
    cerrarModalProducto();
    btn.textContent = "💾 Guardar en Inventario"; btn.disabled = false;
    await obtenerProductos(); // Recargamos el menú
};

// --- MODIFICAR PRODUCTO ---
window.abrirModalModificarProducto = function() {
    document.getElementById('modalModificarProducto').style.display = 'flex';
    const select = document.getElementById('selectModificar');
    select.innerHTML = '<option value="">-- Elige un producto --</option>';
    listaProductosGlobal.forEach(p => {
        select.innerHTML += `<option value="${p.id}" data-precio="${p.precio_actual}">${p.nombre} - $${p.precio_actual}</option>`;
    });
};
window.cerrarModalModificar = function() {
    document.getElementById('modalModificarProducto').style.display = 'none';
};
window.cargarDatosModificar = function() {
    const select = document.getElementById('selectModificar');
    const prodId = select.value;
    if (!prodId) return;
    const producto = listaProductosGlobal.find(p => p.id === prodId);
    document.getElementById('modificarNombre').value = producto.nombre;
    document.getElementById('modificarCosto').value = producto.precio_actual;
};
window.guardarModificacion = async function(event) {
    const idOriginal = document.getElementById('selectModificar').value;
    const nuevoNombre = document.getElementById('modificarNombre').value;
    const nuevoCosto = parseFloat(document.getElementById('modificarCosto').value);
    
    if (!idOriginal || nuevoNombre.trim() === '' || isNaN(nuevoCosto)) return alert('Datos inválidos.');
    
    const btn = event.target;
    btn.textContent = "Actualizando..."; btn.disabled = true;

    await supabase.from('productos').update({ nombre: nuevoNombre, precio_actual: nuevoCosto }).eq('id', idOriginal);
    
    alert('¡Producto actualizado exitosamente!');
    cerrarModalModificar();
    btn.textContent = "💾 Actualizar Producto"; btn.disabled = false;
    await obtenerProductos();
};

document.getElementById('btnCerrarSesionTerminal')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('login.html');
});

const intervalo = setInterval(() => {
    if (window.usuarioActual) {
        clearInterval(intervalo);
        inicializarTerminal();
    }
}, 50);

window.ocultarMesa = async function() {
    if (cuentaActivaId) {
        alert("No puedes eliminar una mesa mientras tenga una cuenta abierta.");
        return;
    }
    if (confirm("¿Seguro que deseas quitar esta mesa del piso de ventas?")) {
        await supabase.from('mesas').update({ activa: false }).eq('id', mesaActualId);
        window.cerrarModalPedido();
        cargarMesas();
    }
};

// --- FUNCIÓN PARA OCULTAR MESAS (SOFT DELETE) ---
window.ocultarMesa = async function(mesaId, isOcupada) {
    if (isOcupada) {
        alert("❌ No puedes borrar una mesa que tiene una cuenta abierta. Por favor, cóbrala primero.");
        return;
    }
    
    const confirmar = confirm("¿Seguro que deseas quitar esta mesa de la vista? (Sus ventas históricas quedarán intactas).");
    if (confirmar) {
        try {
            await supabase.from('mesas').update({ activa: false }).eq('id', mesaId);
            cargarMesas(); // Recargamos para que desaparezca
        } catch (error) {
            alert("Hubo un error al ocultar la mesa.");
        }
    }
};

// --- FUNCIÓN AUXILIAR PARA HORA LOCAL ---
function obtenerFechaLocal() {
    const fechaActual = new Date();
    const compensacionMinutos = fechaActual.getTimezoneOffset();
    const fechaLocalCompensada = new Date(fechaActual.getTime() - (compensacionMinutos * 60000));
    return fechaLocalCompensada.toISOString();
}