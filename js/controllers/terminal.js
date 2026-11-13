// js/controllers/terminal.js
import { supabase } from '../core/conexion.js';
import { iconSvg, initIcons } from '../core/icons.js';
import { openModal, forceCloseModal, mostrarConfirmacion } from '../components/modal.js';
import { CustomSelect } from '../components/dropdown.js';
import { showToast } from '../components/toast.js';
import { notificarError } from '../core/errors.js';

let negocioIdActual = null;
let usuarioId = null;
let rolUsuario = null;
let listaProductosGlobal = [];
let mesaActualId = null;
let cuentaActivaId = null;
let selectorProductos = null;
let totalCuentaActual = 0;

export async function inicializarTerminal() {
  const usuario = window.usuarioActual;
  if (!usuario) return;

  negocioIdActual = usuario.negocio_id;
  usuarioId = usuario.id;
  rolUsuario = usuario.rol;

  // Si no es admin, ocultar controles de administración de menú
  const panelAdmin = document.getElementById('panelAdminTerminal');
  if (panelAdmin) {
    panelAdmin.style.display = (rolUsuario === 'admin') ? 'flex' : 'none';
  }

  await obtenerProductos();
  await cargarMesas();
  bindTerminalEvents();
}

/**
 * Carga el catálogo de productos y monta el CustomSelect moderno con búsqueda.
 */
async function obtenerProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('negocio_id', negocioIdActual)
    .eq('disponible', true)
    .order('nombre');

  if (error) {
    notificarError(error, 'Error al cargar productos');
    return;
  }

  listaProductosGlobal = data || [];

  const dropdownContainer = document.getElementById('contenedorDropdownProducto');
  if (dropdownContainer) {
    const opciones = listaProductosGlobal.map(p => ({
      value: p.id,
      label: p.nombre,
      price: parseFloat(p.precio_actual).toFixed(2),
      subtitle: `$${p.precio_actual}`
    }));

    if (!selectorProductos) {
      selectorProductos = new CustomSelect(dropdownContainer, {
        placeholder: '-- Selecciona un producto para la mesa --',
        searchPlaceholder: 'Escribe para buscar bebida o platillo...',
        options: opciones,
        icon: 'glass-water'
      });
    } else {
      selectorProductos.setOptions(opciones);
    }
  }
}

/**
 * Dibuja las mesas del bar en el grid responsivo.
 */
export async function cargarMesas() {
  const [resMesas, resCuentas] = await Promise.all([
    supabase.from('mesas').select('*').eq('negocio_id', negocioIdActual).eq('activa', true).order('etiqueta'),
    supabase.from('cuentas').select('*').eq('negocio_id', negocioIdActual).eq('estado', 'abierta')
  ]);

  const contenedor = document.getElementById('contenedorMesas');
  if (!contenedor) return;

  if (resMesas.error || resCuentas.error) {
    notificarError(resMesas.error || resCuentas.error, 'Error al cargar las mesas');
    contenedor.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted);">
        ${iconSvg('wifi-off', { size: 36 })}
        <p style="margin-top: 0.5rem;">No pudimos sincronizar las mesas. Intenta de nuevo en unos segundos.</p>
      </div>
    `;
    return;
  }

  const mesas = resMesas.data;
  const cuentas = resCuentas.data;
  const totalOcupadas = (mesas || []).filter(m => (cuentas || []).some(c => c.mesa_id === m.id)).length;
  actualizarResumenMesas((mesas || []).length - totalOcupadas, totalOcupadas);

  contenedor.innerHTML = '';

  if (!mesas || mesas.length === 0) {
    contenedor.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted);">
        ${iconSvg('layout-grid', { size: 36, className: 'text-muted' })}
        <p style="margin-top: 0.5rem; font-size: var(--text-base);">No hay mesas habilitadas en el piso.</p>
      </div>
    `;
    return;
  }

  mesas.forEach(mesa => {
    const cuentaAbierta = (cuentas || []).find(c => c.mesa_id === mesa.id);
    const isOcupada = !!cuentaAbierta;

    const card = document.createElement('div');
    card.className = `mesa-card ${isOcupada ? 'ocupada' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <button class="btn-mesa-eliminar" title="Ocultar Mesa" onclick="event.stopPropagation(); window.ocultarMesa('${mesa.id}', ${isOcupada})">
        ${iconSvg('x', { size: 14 })}
      </button>
      <div class="mesa-etiqueta">${mesa.etiqueta}</div>
      <span class="mesa-badge-estado ${isOcupada ? 'mesa-badge-ocupada' : 'mesa-badge-libre'}">
        ${isOcupada ? 'Ocupada' : 'Libre'}
      </span>
    `;

    card.onclick = () => abrirModalMesa(mesa.id, mesa.etiqueta, cuentaAbierta);
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirModalMesa(mesa.id, mesa.etiqueta, cuentaAbierta);
      }
    };

    contenedor.appendChild(card);
  });

  initIcons(contenedor);
}

/**
 * Actualiza los chips de resumen (libres / ocupadas) del encabezado de Mesas.
 */
function actualizarResumenMesas(libres, ocupadas) {
  const elLibres = document.getElementById('resumenMesasLibres');
  const elOcupadas = document.getElementById('resumenMesasOcupadas');
  if (elLibres) elLibres.textContent = `${libres} ${libres === 1 ? 'libre' : 'libres'}`;
  if (elOcupadas) elOcupadas.textContent = `${ocupadas} ${ocupadas === 1 ? 'ocupada' : 'ocupadas'}`;
}

/**
 * Abre el modal de comanda y cuenta para la mesa seleccionada.
 */
async function abrirModalMesa(mesaId, etiqueta, cuentaAbierta) {
  mesaActualId = mesaId;
  const modal = document.getElementById('modalPedido');
  const tituloModal = document.getElementById('tituloModalMesa');
  const listaCuenta = document.getElementById('listaCuenta');
  const totalCuenta = document.getElementById('totalCuenta');

  tituloModal.textContent = `${etiqueta}`;
  listaCuenta.innerHTML = '<li style="color: var(--text-muted); padding: 0.5rem;">Cargando pedidos...</li>';
  totalCuenta.textContent = '0.00';
  totalCuentaActual = 0;

  if (cuentaAbierta) {
    cuentaActivaId = cuentaAbierta.id;
    await actualizarListaCuenta();
  } else {
    cuentaActivaId = null;
    listaCuenta.innerHTML = '<li style="color: var(--text-muted); font-style: italic; padding: 0.5rem;">Mesa libre. Agrega productos para abrir la cuenta.</li>';
  }

  openModal(modal, {
    hasPendingBalance: () => totalCuentaActual > 0,
    getBalanceAmount: () => totalCuentaActual.toFixed(2),
    preventMobileBackdropClose: true
  });

  initIcons(modal);
}

async function actualizarListaCuenta() {
  const listaCuenta = document.getElementById('listaCuenta');
  const totalCuenta = document.getElementById('totalCuenta');

  if (!cuentaActivaId) return;

  const { data: comandas, error } = await supabase
    .from('comandas')
    .select('id, producto_id, cantidad, precio_unitario, estado_preparacion')
    .eq('cuenta_id', cuentaActivaId);

  if (error) {
    listaCuenta.innerHTML = '<li style="color: var(--color-danger);">Error al cargar comanda.</li>';
    notificarError(error, 'Error al cargar la comanda');
    return;
  }

  listaCuenta.innerHTML = '';
  let suma = 0;

  if (!comandas || comandas.length === 0) {
    listaCuenta.innerHTML = '<li style="color: var(--text-muted); font-style: italic; padding: 0.5rem;">Sin productos registrados.</li>';
    totalCuenta.textContent = '0.00';
    totalCuentaActual = 0;
    return;
  }

  comandas.forEach(item => {
    const producto = listaProductosGlobal.find(p => p.id === item.producto_id);
    const nombre = producto ? producto.nombre : 'Producto';
    const precio = Number(item.precio_unitario ?? (producto ? producto.precio_actual : 0));
    const subtotal = precio * item.cantidad;
    suma += subtotal;

    const li = document.createElement('li');
    li.className = 'cuenta-item';

    const isListo = item.estado_preparacion === 'entregado';
    const iconEstado = isListo
      ? iconSvg('check-circle-2', { size: 14, color: 'var(--color-success)' })
      : iconSvg('clock', { size: 14, color: 'var(--accent-gold)' });
    const textoEstado = isListo ? 'Despachado en barra' : 'En preparación (FIFO)';

    li.innerHTML = `
      <div>
        <div style="font-weight: 700; color: var(--text-primary);">${item.cantidad}x ${nombre}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted); display:flex; align-items:center; gap:0.25rem; margin-top:2px;">
          ${iconEstado} <span>${textoEstado}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: var(--text-primary);">$${subtotal.toFixed(2)}</div>
        <button class="btn btn-ghost btn-sm" style="color: var(--color-danger); padding: 2px 6px; margin-top: 4px;" onclick="window.eliminarItemComanda('${item.id}', ${subtotal})">
          ${iconSvg('trash-2', { size: 13 })} <span>Quitar</span>
        </button>
      </div>
    `;

    listaCuenta.appendChild(li);
  });

  totalCuentaActual = suma;
  totalCuenta.textContent = suma.toFixed(2);
}

/**
 * Agrega un producto a la cuenta de la mesa actual.
 */
async function agregarProductoCuenta() {
  if (!selectorProductos) return;
  const prodId = selectorProductos.getValue();
  const cantidadInput = document.getElementById('cantidadProducto');
  const cantidad = parseInt(cantidadInput.value, 10);

  if (!prodId) {
    showToast('Por favor selecciona un producto del menú.', 'warning');
    return;
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    showToast('Ingresa una cantidad válida mayor a cero.', 'warning');
    return;
  }

  const producto = listaProductosGlobal.find(p => p.id === prodId);
  if (!producto) {
    showToast('Ese producto ya no está disponible. Refresca el menú e inténtalo de nuevo.', 'warning');
    return;
  }

  // Sin mesero/usuario identificado no se puede abrir la cuenta de la mesa
  if (!usuarioId || !mesaActualId || !negocioIdActual) {
    showToast('No se pudo identificar al mesero o la mesa. Vuelve a iniciar sesión para registrar la orden.', 'warning');
    return;
  }

  const btnAgregar = document.getElementById('btnAgregarProductoCuenta');
  if (btnAgregar) btnAgregar.disabled = true;

  try {
    // Si no hay cuenta abierta para esta mesa, la abrimos ahora
    if (!cuentaActivaId) {
      const { data: nuevaCuenta, error: errCuenta } = await supabase
        .from('cuentas')
        .insert([{
          negocio_id: negocioIdActual,
          mesa_id: mesaActualId,
          mesero_id: usuarioId,
          estado: 'abierta',
          fecha_apertura: new Date().toISOString()
        }])
        .select()
        .single();

      if (errCuenta) throw errCuenta;
      cuentaActivaId = nuevaCuenta.id;
    }

    // Insertar la comanda para la barra
    const { error: errComanda } = await supabase
      .from('comandas')
      .insert([{
        negocio_id: negocioIdActual,
        cuenta_id: cuentaActivaId,
        producto_id: prodId,
        cantidad: cantidad,
        precio_unitario: producto.precio_actual,
        estado_preparacion: 'pendiente',
        fecha_solicitud: new Date().toISOString()
      }]);

    if (errComanda) throw errComanda;

    // Resetear cantidad a 1
    cantidadInput.value = '1';
    await actualizarListaCuenta();
    await cargarMesas(); // Actualiza color a ocupada
  } catch (err) {
    notificarError(err, 'No se pudo agregar a la comanda');
  } finally {
    if (btnAgregar) btnAgregar.disabled = false;
  }
}

/**
 * Cobra y libera la mesa.
 */
async function cobrarYliberarMesa() {
  if (!cuentaActivaId) {
    showToast('No hay ninguna cuenta abierta en esta mesa.', 'warning');
    return;
  }

  // Prevenir cobro en cero
  if (totalCuentaActual <= 0) {
    showToast('La cuenta está en ceros, no hay saldo que cobrar.', 'warning');
    return;
  }

  const modal = document.getElementById('modalPedido');

  mostrarConfirmacion({
    titulo: 'Cobrar y Liberar Mesa',
    mensaje: `¿Confirmas el cobro total de $${totalCuentaActual.toFixed(2)} y la liberación inmediata de la mesa?`,
    tipo: 'success',
    btnAceptarTexto: 'Confirmar Cobro',
    onConfirm: async () => {
      try {
        const { error } = await supabase
          .from('cuentas')
          .update({
            estado: 'cerrada',
            total: totalCuentaActual, // <-- Solución al error de guardado en $0.00
            fecha_cierre: new Date().toISOString()
          })
          .eq('id', cuentaActivaId);

        if (error) throw error;

        showToast(`¡Cuenta de $${totalCuentaActual.toFixed(2)} pagada y mesa liberada!`, 'success');
        cuentaActivaId = null;
        totalCuentaActual = 0;
        forceCloseModal(modal);
        await cargarMesas();
      } catch (err) {
        notificarError(err, 'Error al liberar la mesa');
      }
    }
  });
}

function bindTerminalEvents() {
  // Menú "Productos" (solo admin) en el encabezado de Mesas
  const btnMenuProductos = document.getElementById('btnMenuProductos');
  const menuProductos = document.getElementById('menuProductos');
  if (btnMenuProductos && menuProductos && !btnMenuProductos.dataset.bound) {
    btnMenuProductos.dataset.bound = 'true';
    const cerrarMenu = () => {
      menuProductos.hidden = true;
      btnMenuProductos.setAttribute('aria-expanded', 'false');
    };
    btnMenuProductos.addEventListener('click', (e) => {
      e.stopPropagation();
      const abrir = menuProductos.hidden;
      menuProductos.hidden = !abrir;
      btnMenuProductos.setAttribute('aria-expanded', String(abrir));
      if (abrir) initIcons(menuProductos);
    });
    menuProductos.addEventListener('click', (e) => {
      const item = e.target.closest('[data-accion]');
      if (!item) return;
      cerrarMenu();
      if (item.dataset.accion === 'nuevo' && window.abrirModalNuevoProducto) window.abrirModalNuevoProducto();
      if (item.dataset.accion === 'modificar' && window.abrirModalModificarProducto) window.abrirModalModificarProducto();
    });
    document.addEventListener('click', (e) => {
      if (!menuProductos.hidden && !menuProductos.contains(e.target)) cerrarMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menuProductos.hidden) {
        cerrarMenu();
        btnMenuProductos.focus();
      }
    });
  }

  const btnAgregar = document.getElementById('btnAgregarProductoCuenta');
  if (btnAgregar) btnAgregar.onclick = agregarProductoCuenta;

  const btnPagar = document.getElementById('btnPagarTerminal');
  if (btnPagar) btnPagar.onclick = cobrarYliberarMesa;

  // Abrir modal accesible de habilitar mesa
  const btnHabilitarMesa = document.getElementById('btnAgregarMesa');
  const modalHabilitar = document.getElementById('modalHabilitarMesa');
  const formHabilitar = document.getElementById('formHabilitarMesa');
  const inputNombreMesa = document.getElementById('inputNombreMesa');

  if (btnHabilitarMesa && modalHabilitar) {
    btnHabilitarMesa.onclick = () => {
      if (inputNombreMesa) inputNombreMesa.value = '';
      openModal(modalHabilitar);
      initIcons(modalHabilitar);
      setTimeout(() => inputNombreMesa && inputNombreMesa.focus(), 60);
    };
  }

  if (formHabilitar) {
    formHabilitar.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = inputNombreMesa.value.trim();
      if (!nombre) return;

      try {
        const { data: existente, error: errBusqueda } = await supabase
          .from('mesas')
          .select('id, activa')
          .eq('negocio_id', negocioIdActual)
          .ilike('etiqueta', nombre)
          .maybeSingle();

        if (errBusqueda) throw errBusqueda;

        if (existente) {
          if (existente.activa) {
            showToast('Esta mesa ya existe y se encuentra activa.', 'warning');
            forceCloseModal(modalHabilitar);
            return;
          }
          const { error: errReactivar } = await supabase.from('mesas').update({ activa: true }).eq('id', existente.id);
          if (errReactivar) throw errReactivar;
        } else {
          const { error: errInsertar } = await supabase.from('mesas').insert([{
            negocio_id: negocioIdActual,
            etiqueta: nombre,
            activa: true
          }]);
          if (errInsertar) throw errInsertar;
        }

        showToast(`Mesa "${nombre}" habilitada en el piso.`, 'success');
        forceCloseModal(modalHabilitar);
        inputNombreMesa.value = '';
        await cargarMesas();
      } catch (err) {
        notificarError(err, 'Error al habilitar mesa');
      }
    };
  }

  const btnCerrarSinCobrar = document.getElementById('btnCerrarSinCobrar');
  if (btnCerrarSinCobrar) {
    btnCerrarSinCobrar.onclick = () => {
      const modal = document.getElementById('modalPedido');
      if (totalCuentaActual > 0) {
        mostrarConfirmacion({
          titulo: 'Mesa con Saldo Pendiente',
          mensaje: `Esta mesa tiene una cuenta activa de $${totalCuentaActual.toFixed(2)}. ¿Seguro que deseas salir sin cobrar? La mesa se mantendrá como OCUPADA.`,
          tipo: 'warning',
          btnAceptarTexto: 'Salir sin cobrar',
          onConfirm: () => forceCloseModal(modal)
        });
      } else {
        forceCloseModal(modal);
      }
    };
  }
}

// Globales para eventos inline
window.ocultarMesa = async function(mesaId, isOcupada) {
  if (isOcupada) {
    showToast('No puedes ocultar una mesa con cuenta activa. Primero cóbrala.', 'danger');
    return;
  }

  mostrarConfirmacion({
    titulo: 'Ocultar Mesa del Piso',
    mensaje: '¿Deseas quitar esta mesa de la vista? El historial de comandas previas quedará intacto.',
    tipo: 'danger',
    btnAceptarTexto: 'Ocultar Mesa',
    onConfirm: async () => {
      const { error } = await supabase.from('mesas').update({ activa: false }).eq('id', mesaId);
      if (error) {
        notificarError(error, 'Error al ocultar mesa');
        return;
      }
      showToast('Mesa ocultada del piso.', 'info');
      cargarMesas();
    }
  });
};

window.eliminarItemComanda = async function(comandaId) {
  mostrarConfirmacion({
    titulo: 'Cancelar Pedido',
    mensaje: '¿Seguro que deseas retirar este artículo de la comanda de la mesa?',
    tipo: 'danger',
    btnAceptarTexto: 'Quitar Pedido',
    onConfirm: async () => {
      const { error } = await supabase.from('comandas').delete().eq('id', comandaId);
      if (error) {
        notificarError(error, 'No se pudo retirar el artículo');
        return;
      }
      showToast('Artículo retirado de la comanda.', 'info');
      await actualizarListaCuenta();
      await cargarMesas();
    }
  });
};
