import { supabase } from '../core/conexion.js';

// Elementos del DOM
const form = document.getElementById('formNuevoEmpleado');
const mensajeEstado = document.getElementById('mensajeEstado');
const listaEmpleados = document.getElementById('listaEmpleados');
const tituloNegocio = document.getElementById('tituloNegocio');
const identificadorUsuario = document.getElementById('identificadorUsuario'); // NUEVO

let negocioIdActual = null;
let listaProductosGlobal = []; // Para guardar el catálogo temporalmente

// --- 1. INICIALIZACIÓN ---
async function inicializarPanel() {
    try {
        const { id, nombre_completo, rol, negocio_id } = window.usuarioActual;
        negocioIdActual = negocio_id;
        
        const rolFormateado = rol.charAt(0).toUpperCase() + rol.slice(1);
        identificadorUsuario.textContent = `${nombre_completo} (${rolFormateado})`;

        const { data: negocio, error: errorNegocio } = await supabase
            .from('negocios').select('nombre_comercial').eq('id', negocio_id).single();

        if (errorNegocio) throw errorNegocio;
        tituloNegocio.textContent = `🏢 ${negocio.nombre_comercial}`;

        cargarEmpleados();
        await obtenerCatálogoProductos(); 
        
        // --- NUEVO: Inicializar el reporte de ventas con el día de hoy ---
        configurarFechasPorDefecto();
        await generarReporteVentas();

    } catch (error) {
        tituloNegocio.textContent = '❌ Error al cargar datos';
    }
}

// ==========================================
// MÓDULO DE PRODUCTOS E INVENTARIO
// ==========================================

async function obtenerCatálogoProductos() {
    const { data } = await supabase.from('productos')
        .select('*').eq('negocio_id', negocioIdActual).order('nombre');
    if (data) listaProductosGlobal = data;
}

window.abrirModalNuevoProducto = function() {
    document.getElementById('modalNuevoProducto').style.display = 'flex';
};

window.guardarNuevoProducto = async function() {
    const nombre = document.getElementById('nuevoNombreProd').value;
    const costo = parseFloat(document.getElementById('nuevoPrecioProd').value);
    
    if (nombre.trim() === '' || isNaN(costo) || costo <= 0) return alert('Ingresa datos válidos.');
    
    const { error } = await supabase.from('productos').insert([{ 
        negocio_id: negocioIdActual, nombre, precio_actual: costo, disponible: true 
    }]);
    
    if (error) {
        alert('Error al guardar producto');
    } else {
        alert('¡Producto guardado exitosamente!');
        document.getElementById('modalNuevoProducto').style.display = 'none';
        document.getElementById('nuevoNombreProd').value = '';
        document.getElementById('nuevoPrecioProd').value = '';
        obtenerCatálogoProductos();
    }
};

window.abrirModalModificarProducto = function() {
    document.getElementById('modalModificarProducto').style.display = 'flex';
    const select = document.getElementById('selectModificarProd');
    select.innerHTML = '<option value="">-- Elige un producto --</option>';
    
    listaProductosGlobal.forEach(p => {
        select.innerHTML += `<option value="${p.id}" data-precio="${p.precio_actual}">${p.nombre} - $${p.precio_actual}</option>`;
    });
};

window.cargarDatosModificarProd = function() {
    const select = document.getElementById('selectModificarProd');
    const prodId = select.value;
    if (!prodId) return;
    
    const producto = listaProductosGlobal.find(p => p.id === prodId);
    document.getElementById('modificarNombreProd').value = producto.nombre;
    document.getElementById('modificarPrecioProd').value = producto.precio_actual;
};

window.guardarModificacionProd = async function() {
    const idOriginal = document.getElementById('selectModificarProd').value;
    const nuevoNombre = document.getElementById('modificarNombreProd').value;
    const nuevoCosto = parseFloat(document.getElementById('modificarPrecioProd').value);
    
    if (!idOriginal || nuevoNombre.trim() === '' || isNaN(nuevoCosto)) return alert('Datos inválidos.');
    
    const { error } = await supabase.from('productos').update({ 
        nombre: nuevoNombre, precio_actual: nuevoCosto 
    }).eq('id', idOriginal);
    
    if (error) {
        alert('Error al modificar');
    } else {
        alert('¡Producto actualizado exitosamente!');
        document.getElementById('modalModificarProducto').style.display = 'none';
        obtenerCatálogoProductos();
    }
};


// ==========================================
// MÓDULO DE EMPLEADOS (INTACTO)
// ==========================================

async function cargarEmpleados() {
    try {
        const { data: empleados, error } = await supabase.from('usuarios')
            .select('id, nombre_completo, rol, activo').eq('negocio_id', negocioIdActual).in('rol', ['mesero', 'bartender']).order('fecha_creacion', { ascending: false });

        if (error) throw error;
        listaEmpleados.innerHTML = '';

        if (empleados.length === 0) {
            listaEmpleados.innerHTML = '<li style="color: #7f8c8d; padding: 10px;">Aún no tienes personal registrado.</li>';
            return;
        }

        empleados.forEach(empleado => {
            const li = document.createElement('li');
            li.style.padding = '12px'; li.style.borderBottom = '1px solid #eee'; li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
            const colorRol = empleado.rol === 'mesero' ? '#f39c12' : '#9b59b6';
            const isActivo = empleado.activo;
            
            li.innerHTML = `
                <div>
                    <strong>${empleado.nombre_completo}</strong> 
                    <span style="background: ${colorRol}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">${empleado.rol.toUpperCase()}</span>
                    <span style="margin-left: 8px; font-size: 0.85em; color: ${isActivo ? '#2ecc71' : '#e74c3c'};">${isActivo ? '✅ Activo' : '❌ Inactivo'}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="abrirModalEditarEmpleado('${empleado.id}', '${empleado.nombre_completo}')" style="background: #f39c12; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 0.85em; font-weight: bold;">✏️ Editar</button>
                    <button onclick="cambiarEstatusEmpleado('${empleado.id}', ${!isActivo})" style="background: ${isActivo ? '#e74c3c' : '#2ecc71'}; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 0.85em; font-weight: bold;">${isActivo ? 'Dar de baja' : 'Reactivar'}</button>
                </div>
            `;
            listaEmpleados.appendChild(li);
        });
    } catch (error) {
        listaEmpleados.innerHTML = '<li style="color: #e74c3c;">❌ Error al cargar el personal.</li>';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const nombreEmpleado = document.getElementById('nombreEmpleado').value;
    const emailEmpleado = document.getElementById('emailEmpleado').value;
    const passwordEmpleado = document.getElementById('passwordEmpleado').value;
    const rolEmpleado = document.getElementById('rolEmpleado').value;

    mensajeEstado.style.color = '#f39c12';
    mensajeEstado.textContent = '⏳ Registrando en la bóveda segura...';

    try {
        const { error } = await supabase.functions.invoke('registrar_empleado', {
            body: { negocioId: negocioIdActual, nombreCompleto: nombreEmpleado, email: emailEmpleado, password: passwordEmpleado, rol: rolEmpleado }
        });
        if (error) throw error;
        mensajeEstado.style.color = '#2ecc71';
        mensajeEstado.textContent = '✅ ¡Personal registrado con éxito!';
        form.reset();
        cargarEmpleados();
    } catch (error) {
        mensajeEstado.style.color = '#e74c3c';
        mensajeEstado.textContent = '❌ Error: ' + error.message;
    }
});

window.abrirModalEditarEmpleado = function(id, nombre) {
    document.getElementById('modalEditEmpleadoId').value = id;
    document.getElementById('editNombreEmpleado').value = nombre;
    document.getElementById('editPasswordEmpleado').value = '';
    document.getElementById('modalEditarEmpleado').style.display = 'flex';
};
window.cerrarModalEditarEmpleado = function() { document.getElementById('modalEditarEmpleado').style.display = 'none'; };
window.guardarEdicionEmpleado = async function() {
    const empleadoId = document.getElementById('modalEditEmpleadoId').value;
    const nuevoNombre = document.getElementById('editNombreEmpleado').value;
    const nuevaPassword = document.getElementById('editPasswordEmpleado').value;
    try {
        await supabase.functions.invoke('editar_empleado', { body: { empleadoId, nuevoNombre, nuevaPassword } });
        cerrarModalEditarEmpleado();
        cargarEmpleados();
    } catch (error) { alert('Error al editar empleado.'); }
};
window.cambiarEstatusEmpleado = async function(id, nuevoEstado) {
    await supabase.from('usuarios').update({ activo: nuevoEstado }).eq('id', id);
    cargarEmpleados();
};

document.getElementById('btnCerrarSesion').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
});

const intervalo = setInterval(() => {
    if (window.usuarioActual) {
        clearInterval(intervalo);
        inicializarPanel();
    }
}, 50);

// ==========================================
// MÓDULO DE REPORTES Y VENTAS (DASHBOARD)
// ==========================================

function configurarFechasPorDefecto() {
    // Coloca la fecha local de hoy en ambos inputs
    const hoy = new Date();
    const hoyString = hoy.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD compatible con inputs
    document.getElementById('filtroDesde').value = hoyString;
    document.getElementById('filtroHasta').value = hoyString;
}

// Transformador de Fechas Operativas (6:00 AM a 5:59 AM del día siguiente)
function obtenerRangoOperativoISO(fechaDesde, fechaHasta) {
    // Parseamos los strings (Ej. '2026-11-05')
    const [yearD, monthD, dayD] = fechaDesde.split('-').map(Number);
    const [yearH, monthH, dayH] = fechaHasta.split('-').map(Number);

    // Inicio: 06:00:00 local del día 'Desde'
    const inicio = new Date(yearD, monthD - 1, dayD, 6, 0, 0);
    
    // Fin: 05:59:59 local del día *siguiente* al 'Hasta'
    const fin = new Date(yearH, monthH - 1, dayH + 1, 5, 59, 59);

    return { 
        inicioISO: inicio.toISOString(), 
        finISO: fin.toISOString() 
    };
}

window.generarReporteVentas = async function() {
    const fechaDesde = document.getElementById('filtroDesde').value;
    const fechaHasta = document.getElementById('filtroHasta').value;

    if(!fechaDesde || !fechaHasta) {
        alert("Por favor selecciona un rango de fechas válido."); return;
    }

    const { inicioISO, finISO } = obtenerRangoOperativoISO(fechaDesde, fechaHasta);

    try {
        // 1. Obtener Cuentas Cerradas en el rango operativo
        const { data: cuentas } = await supabase.from('cuentas')
            .select('id, total')
            .eq('negocio_id', negocioIdActual)
            .eq('estado', 'cerrada')
            .gte('fecha_cierre', inicioISO)
            .lte('fecha_cierre', finISO);

        // Sumar Total Vendido
        let totalVendido = 0;
        let idsCuentas = [];
        
        if (cuentas && cuentas.length > 0) {
            totalVendido = cuentas.reduce((sum, c) => sum + Number(c.total), 0);
            idsCuentas = cuentas.map(c => c.id);
        }

        document.getElementById('resumenTotal').textContent = `$${totalVendido.toFixed(2)}`;
        document.getElementById('resumenCuentas').textContent = `${cuentas ? cuentas.length : 0} cuentas cerradas`;

        // Si no hay ventas, limpiamos las otras tarjetas y salimos
        if (idsCuentas.length === 0) {
            document.getElementById('resumenFavorito').textContent = 'Sin ventas';
            document.getElementById('resumenFavoritoCant').textContent = '-';
            document.getElementById('resumenEstancado').textContent = 'Revisar inventario';
            document.getElementById('resumenEstancadoCant').textContent = '-';
            document.getElementById('listaTopProductos').innerHTML = '<li style="color: #7f8c8d;">No hay datos en este periodo.</li>';
            return;
        }

        // 2. Obtener las comandas de esas cuentas cerradas
        const { data: comandas } = await supabase.from('comandas')
            .select('producto_id, cantidad')
            .in('cuenta_id', idsCuentas);

        // 3. Agrupar cantidades por producto
        const cantidadesPorProducto = {};
        if (comandas) {
            comandas.forEach(c => {
                if (!cantidadesPorProducto[c.producto_id]) cantidadesPorProducto[c.producto_id] = 0;
                cantidadesPorProducto[c.producto_id] += c.cantidad;
            });
        }

        // 4. Cruzar con el Catálogo Global (para encontrar los ceros y ponerles nombre)
        let ranking = [];
        listaProductosGlobal.forEach(prod => {
            ranking.push({
                nombre: prod.nombre,
                vendidos: cantidadesPorProducto[prod.id] || 0 // Si no está en comandas, vendió 0
            });
        });

        // Ordenamos de mayor a menor venta
        ranking.sort((a, b) => b.vendidos - a.vendidos);

        // 5. Poblar las Tarjetas
        // El Favorito (El número 1 del ranking)
        const favorito = ranking[0];
        document.getElementById('resumenFavorito').textContent = favorito.nombre;
        document.getElementById('resumenFavoritoCant').textContent = `${favorito.vendidos} unidades`;

        // Para Impulsar (El último del ranking)
        const estancado = ranking[ranking.length - 1];
        document.getElementById('resumenEstancado').textContent = estancado.nombre;
        document.getElementById('resumenEstancadoCant').textContent = estancado.vendidos === 0 ? '¡0 unidades vendidas!' : `${estancado.vendidos} unidades`;

        // 6. Poblar Tabla Top 5
        const listaTop = document.getElementById('listaTopProductos');
        listaTop.innerHTML = '';
        
        const top5 = ranking.slice(0, 5);
        top5.forEach((item, index) => {
            const medalla = index === 0 ? '🔹' : index === 1 ? '🔹' : index === 2 ? '🔹' : '🔹';
            listaTop.innerHTML += `
                <li style="display: flex; justify-content: space-between; background: #f9f9f9; padding: 10px 15px; border-radius: 4px; border: 1px solid #eee;">
                    <span>${medalla} <strong>${item.nombre}</strong></span>
                    <span style="font-weight: bold; color: #27ae60;">${item.vendidos} unidades</span>
                </li>
            `;
        });

    } catch (error) {
        console.error("Error al generar reporte:", error);
        alert("Hubo un error al procesar las ventas.");
    }
};