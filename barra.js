import { supabase } from './conexion.js';

const tituloBarra = document.getElementById('tituloBarra');
const identificadorUsuario = document.getElementById('identificadorUsuario');
const listaPendientes = document.getElementById('listaPendientes');
const listaEntregados = document.getElementById('listaEntregados');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

let negocioIdActual = null;
let listaProductosGlobal = [];
let listaMesasGlobal = [];

// --- 1. INICIALIZACIÓN ---
async function inicializarBarra() {
    const usuario = window.usuarioActual;
    negocioIdActual = usuario.negocio_id;
    
    // Estandarizar identificador
    const rolFormateado = usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1);
    identificadorUsuario.textContent = `${usuario.nombre_completo} (${rolFormateado})`;

    // Título del Bar
    const { data: negocio } = await supabase.from('negocios').select('nombre_comercial').eq('id', negocioIdActual).single();
    if(negocio) tituloBarra.textContent = `🍹 ${negocio.nombre_comercial} - Barra`;

    // Cargamos catálogos base en memoria para no hacer tantas consultas
    await obtenerCatalogosBase();
    
    // Dibujamos por primera vez
    await actualizarTableros();

    // Arrancamos el ciclo de actualización automática (cada 4 segundos)
    setInterval(actualizarTableros, 90000);
}

// --- 2. CATÁLOGOS BASE ---
async function obtenerCatalogosBase() {
    // Traemos productos y mesas para saber cómo se llaman
    const { data: productos } = await supabase.from('productos').select('id, nombre').eq('negocio_id', negocioIdActual);
    if(productos) listaProductosGlobal = productos;

    const { data: mesas } = await supabase.from('mesas').select('id, etiqueta').eq('negocio_id', negocioIdActual);
    if(mesas) listaMesasGlobal = mesas;
}

// --- 3. ACTUALIZAR TABLEROS AUTOMÁTICAMENTE ---
async function actualizarTableros() {
    try {
        // 1. Buscamos todas las comandas pendientes de este bar, ordenadas por la más antigua primero (FIFO)
        const { data: pendientes } = await supabase.from('comandas')
            .select('id, cuenta_id, producto_id, cantidad, fecha_solicitud')
            .eq('negocio_id', negocioIdActual)
            .eq('estado_preparacion', 'pendiente')
            .order('fecha_solicitud', { ascending: true }); // El truco del FIFO está aquí

        // 2. Buscamos comandas entregadas, pero SOLO de cuentas que sigan ABIERTAS
        const { data: entregados } = await supabase.from('comandas')
            .select(`
                id, cuenta_id, producto_id, cantidad, fecha_solicitud,
                cuentas!inner ( estado, mesa_id ) 
            `)
            .eq('negocio_id', negocioIdActual)
            .eq('estado_preparacion', 'entregado')
            .eq('cuentas.estado', 'abierta') // Tu filtro brillante
            .order('fecha_solicitud', { ascending: false }) // Los entregados más recientes arriba
            .limit(10); // Solo mostramos los últimos 10 para no saturar

        // 3. Dibujamos PENDIENTES
        listaPendientes.innerHTML = '';
        if (!pendientes || pendientes.length === 0) {
            listaPendientes.innerHTML = '<p style="color: #7f8c8d; font-style: italic; font-size: 1.2em; text-align: center; padding: 20px;">Sin pedidos pendientes 🙌</p>';
        } else {
            for (const item of pendientes) {
                // Buscamos el nombre del producto
                const producto = listaProductosGlobal.find(p => p.id === item.producto_id);
                const nombreProducto = producto ? producto.nombre : 'Producto Desconocido';
                
                // Para saber la mesa, buscamos la cuenta
                const { data: cuenta } = await supabase.from('cuentas').select('mesa_id').eq('id', item.cuenta_id).single();
                const mesa = listaMesasGlobal.find(m => m.id === cuenta.mesa_id);
                const nombreMesa = mesa ? mesa.etiqueta : 'Mesa ?';

                // Calculamos hace cuántos minutos lo pidieron
                const minutos = calcularMinutosTranscurridos(item.fecha_solicitud);
                const alertaTiempo = minutos > 5 ? '<span style="color: #e74c3c; font-weight: bold;">(RETRASADO)</span>' : '';

                listaPendientes.innerHTML += `
                    <div class="ticket">
                        <div class="ticket-info">
                            <div class="ticket-mesa">${nombreMesa}</div>
                            <div class="ticket-producto">${item.cantidad}x ${nombreProducto}</div>
                            <div class="ticket-tiempo">Pedido hace ${minutos} min ${alertaTiempo}</div>
                        </div>
                        <button class="btn-despachar" onclick="despacharPedido('${item.id}')">✅ Despachar</button>
                    </div>
                `;
            }
        }

        // 4. Dibujamos ENTREGADOS
        listaEntregados.innerHTML = '';
        if (!entregados || entregados.length === 0) {
            listaEntregados.innerHTML = '<p style="color: #7f8c8d; font-style: italic; font-size: 1em; text-align: center; padding: 20px;">Sin entregas recientes.</p>';
        } else {
            entregados.forEach(item => {
                const producto = listaProductosGlobal.find(p => p.id === item.producto_id);
                const nombreProducto = producto ? producto.nombre : 'Producto Desconocido';
                const mesa = listaMesasGlobal.find(m => m.id === item.cuentas.mesa_id);
                const nombreMesa = mesa ? mesa.etiqueta : 'Mesa ?';

                listaEntregados.innerHTML += `
                    <div class="ticket entregado">
                        <div class="ticket-info">
                            <div class="ticket-mesa">${nombreMesa}</div>
                            <div class="ticket-producto" style="font-size: 1.2em;">${item.cantidad}x ${nombreProducto}</div>
                        </div>
                        <div style="font-size: 2em;">✅</div>
                    </div>
                `;
            });
        }

    } catch (error) {
        console.error("Error al actualizar tableros", error);
    }
}

// --- 4. FUNCIÓN PARA DESPACHAR ---
window.despacharPedido = async function(comandaId) {
    try {
        const { error } = await supabase.from('comandas')
            .update({ estado_preparacion: 'entregado' })
            .eq('id', comandaId);
            
        if(error) throw error;
        
        // Forzamos la actualización inmediata visual
        actualizarTableros();
    } catch (error) {
        alert("Error al despachar: " + error.message);
    }
};

// --- AUXILIARES ---
function calcularMinutosTranscurridos(fechaString) {
    const pedido = new Date(fechaString);
    const ahora = new Date();
    const diferenciaMs = ahora - pedido;
    return Math.floor(diferenciaMs / 60000); // Convierte ms a minutos
}

btnCerrarSesion.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('login.html');
});

// Arrancar cuando el guardián inyecte los datos
const intervalo = setInterval(() => {
    if (window.usuarioActual) {
        clearInterval(intervalo);
        inicializarBarra();
    }
}, 50);