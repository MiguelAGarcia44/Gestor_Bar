// js/controllers/barra.js
import { supabase } from '../core/conexion.js';
import { iconSvg, initIcons } from '../core/icons.js';
import { showToast } from '../components/toast.js';
import { notificarError } from '../core/errors.js';

let negocioIdActual = null;
let listaProductosGlobal = [];
let listaMesasGlobal = [];
let intervaloActualizacion = null;
let errorTablerosNotificado = false;

export async function inicializarBarra() {
  const usuario = window.usuarioActual;
  if (!usuario) return;

  negocioIdActual = usuario.negocio_id;

  await obtenerCatalogosBase();
  await actualizarTableros();

  // Ciclo de actualización automática cada 5 segundos
  if (intervaloActualizacion) clearInterval(intervaloActualizacion);
  intervaloActualizacion = setInterval(actualizarTableros, 5000);
}

async function obtenerCatalogosBase() {
  const [resProductos, resMesas] = await Promise.all([
    supabase.from('productos').select('id, nombre').eq('negocio_id', negocioIdActual),
    supabase.from('mesas').select('id, etiqueta').eq('negocio_id', negocioIdActual)
  ]);

  if (resProductos.error || resMesas.error) {
    notificarError(resProductos.error || resMesas.error, 'Error al cargar catálogos de barra');
  }
  if (resProductos.data) listaProductosGlobal = resProductos.data;
  if (resMesas.data) listaMesasGlobal = resMesas.data;
}

export async function actualizarTableros() {
  const listaPendientes = document.getElementById('listaPendientes');
  const listaEntregados = document.getElementById('listaEntregados');
  if (!listaPendientes || !listaEntregados) return;

  try {
    // 1. Comandas pendientes de este bar ordenadas por FIFO
    const { data: pendientes, error: errPendientes } = await supabase
      .from('comandas')
      .select('id, cuenta_id, producto_id, cantidad, fecha_solicitud, cuentas ( mesa_id )')
      .eq('negocio_id', negocioIdActual)
      .eq('estado_preparacion', 'pendiente')
      .order('fecha_solicitud', { ascending: true });

    // 2. Comandas entregadas de cuentas aún abiertas
    const { data: entregados, error: errEntregados } = await supabase
      .from('comandas')
      .select(`
        id, cuenta_id, producto_id, cantidad, fecha_solicitud,
        cuentas!inner ( estado, mesa_id )
      `)
      .eq('negocio_id', negocioIdActual)
      .eq('estado_preparacion', 'entregado')
      .eq('cuentas.estado', 'abierta')
      .order('fecha_solicitud', { ascending: false })
      .limit(10);

    if (errPendientes) throw errPendientes;
    if (errEntregados) throw errEntregados;

    // 3. Renderizar PENDIENTES
    listaPendientes.innerHTML = '';
    if (!pendientes || pendientes.length === 0) {
      listaPendientes.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          ${iconSvg('check-circle-2', { size: 36, color: 'var(--color-success)' })}
          <p style="margin-top: 0.5rem; font-style: italic;">¡Todo despachado! Sin pedidos pendientes en barra.</p>
        </div>
      `;
    } else {
      for (const item of pendientes) {
        const producto = listaProductosGlobal.find(p => p.id === item.producto_id);
        const nombreProducto = producto ? producto.nombre : 'Producto';

        const mesa = listaMesasGlobal.find(m => m.id === (item.cuentas ? item.cuentas.mesa_id : null));
        const nombreMesa = mesa ? mesa.etiqueta : 'Mesa ?';

        const minutos = calcularMinutosTranscurridos(item.fecha_solicitud);
        const esRetrasado = minutos > 5;

        const alertaHtml = esRetrasado
          ? `<span class="ticket-retraso">${iconSvg('alert-triangle', { size: 13 })} RETRASADO (${minutos} min)</span>`
          : `<span>${minutos} min</span>`;

        const ticket = document.createElement('div');
        ticket.className = 'ticket-card';
        ticket.innerHTML = `
          <div class="ticket-info">
            <div class="ticket-mesa">${nombreMesa}</div>
            <div class="ticket-producto">${item.cantidad}x ${nombreProducto}</div>
            <div class="ticket-tiempo">
              ${iconSvg('clock', { size: 13 })} <span>Pedido hace</span> ${alertaHtml}
            </div>
          </div>
          <button class="btn btn-success btn-sm" onclick="window.despacharPedidoBarra('${item.id}')">
            ${iconSvg('check', { size: 16 })}
            <span>Despachar</span>
          </button>
        `;
        listaPendientes.appendChild(ticket);
      }
    }

    // 4. Renderizar ENTREGADOS
    listaEntregados.innerHTML = '';
    if (!entregados || entregados.length === 0) {
      listaEntregados.innerHTML = '<p style="color: var(--text-muted); font-style: italic; text-align: center; padding: 1.5rem;">Sin entregas recientes.</p>';
    } else {
      for (const item of entregados) {
        const producto = listaProductosGlobal.find(p => p.id === item.producto_id);
        const nombreProducto = producto ? producto.nombre : 'Producto';
        const mesa = listaMesasGlobal.find(m => m.id === item.cuentas.mesa_id);
        const nombreMesa = mesa ? mesa.etiqueta : 'Mesa ?';

        const ticket = document.createElement('div');
        ticket.className = 'ticket-card entregado';
        ticket.innerHTML = `
          <div class="ticket-info">
            <div class="ticket-mesa">${nombreMesa}</div>
            <div class="ticket-producto" style="font-size: var(--text-base);">${item.cantidad}x ${nombreProducto}</div>
            <div class="ticket-tiempo">
              ${iconSvg('check-circle-2', { size: 13, color: 'var(--color-success)' })} <span>Despachado</span>
            </div>
          </div>
        `;
        listaEntregados.appendChild(ticket);
      }
    }

    initIcons();
    errorTablerosNotificado = false;
  } catch (err) {
    // El refresco corre cada 5 s: notificar una sola vez hasta que se recupere
    if (!errorTablerosNotificado) {
      errorTablerosNotificado = true;
      notificarError(err, 'Error al actualizar el monitor de barra');
    } else {
      console.error('Error al actualizar barra:', err);
    }
  }
}

function calcularMinutosTranscurridos(fechaIso) {
  const inicio = new Date(fechaIso);
  const ahora = new Date();
  const diffMs = ahora - inicio;
  return Math.floor(diffMs / 60000);
}

window.despacharPedidoBarra = async function(comandaId) {
  try {
    const { error } = await supabase
      .from('comandas')
      .update({ estado_preparacion: 'entregado' })
      .eq('id', comandaId);

    if (error) throw error;
    showToast('Comanda despachada con éxito.', 'success');
    await actualizarTableros();
  } catch (err) {
    notificarError(err, 'Error al despachar comanda');
  }
};
