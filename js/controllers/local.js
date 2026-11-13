// js/controllers/local.js
import { supabase } from '../core/conexion.js';
import { iconSvg, initIcons } from '../core/icons.js';
import { openModal, forceCloseModal, mostrarConfirmacion } from '../components/modal.js';
import { CustomSelect } from '../components/dropdown.js';
import { showToast } from '../components/toast.js';
import { notificarError } from '../core/errors.js';

let negocioIdActual = null;
let listaProductosGlobal = [];
let dropdownRolEmpleado = null;
let dropdownModificarProd = null;

export async function inicializarPanel() {
  const usuario = window.usuarioActual;
  if (!usuario) return;

  negocioIdActual = usuario.negocio_id;

  bindLocalEvents();
  // Se cargan primero catálogo y empleados
  await Promise.all([cargarEmpleados(), obtenerCatalogoProductos()]);

  // INICIO DEL DASHBOARD
  configurarFechasPorDefecto();
  await window.generarReporteVentas();
}

async function obtenerCatalogoProductos() {
  // El negocio puede no estar inicializado si se abre el modal desde /terminal
  if (!negocioIdActual && window.usuarioActual) negocioIdActual = window.usuarioActual.negocio_id;

  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('negocio_id', negocioIdActual)
    .order('nombre');

  if (error) {
    notificarError(error, 'Error al cargar el catálogo');
    return;
  }
  listaProductosGlobal = data || [];
}

export async function cargarEmpleados() {
  const listaEmpleados = document.getElementById('listaEmpleados');
  if (!listaEmpleados) return;

  try {
    const { data: empleados, error } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, rol, activo')
      .eq('negocio_id', negocioIdActual)
      .in('rol', ['mesero', 'bartender'])
      .order('nombre_completo');

    if (error) throw error;
    listaEmpleados.innerHTML = '';

    if (!empleados || empleados.length === 0) {
      listaEmpleados.innerHTML = '<li style="color: var(--text-muted); padding: 1rem; text-align: center;">Aún no tienes personal registrado.</li>';
      return;
    }

    empleados.forEach(empleado => {
      const li = document.createElement('li');
      li.style.padding = '0.875rem 1rem';
      li.style.borderBottom = '1px solid var(--border-subtle)';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.gap = '0.75rem';

      const isActivo = empleado.activo;
      const rolColor = empleado.rol === 'mesero' ? 'var(--accent-gold)' : 'var(--accent-primary)';

      li.innerHTML = `
        <div>
          <div style="font-weight: 700; color: var(--text-primary);">${empleado.nombre_completo}</div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
            <span style="font-size: var(--text-2xs); background: ${rolColor}; color: #fff; padding: 0.15rem 0.5rem; border-radius: var(--radius-pill); font-weight: 700; text-transform: uppercase;">
              ${empleado.rol}
            </span>
            <span style="font-size: var(--text-xs); color: ${isActivo ? 'var(--color-success)' : 'var(--color-danger)'}; display:flex; align-items:center; gap:0.25rem;">
              ${iconSvg(isActivo ? 'check-circle-2' : 'x-circle', { size: 13 })}
              <span>${isActivo ? 'Activo' : 'Inactivo'}</span>
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="window.abrirModalEditarEmpleado('${empleado.id}', '${empleado.nombre_completo}')">
            ${iconSvg('pencil', { size: 14 })}
            <span>Editar</span>
          </button>
          <button class="btn ${isActivo ? 'btn-danger' : 'btn-success'} btn-sm" onclick="window.confirmarCambioEstatusEmpleado('${empleado.id}', '${empleado.nombre_completo}', ${!isActivo})">
            ${iconSvg(isActivo ? 'user-x' : 'user-check', { size: 14 })}
            <span>${isActivo ? 'Dar de baja' : 'Reactivar'}</span>
          </button>
        </div>
      `;

      listaEmpleados.appendChild(li);
    });

    initIcons(listaEmpleados);
  } catch (error) {
    listaEmpleados.innerHTML = `<li style="color: var(--color-danger); padding: 1rem;">${iconSvg('x-circle', { size: 16 })} Error al cargar personal.</li>`;
    notificarError(error, 'Error al cargar personal');
  }
}

function bindLocalEvents() {
  // Inicializar CustomSelect para Rol de Empleado
  const rolContainer = document.getElementById('contenedorRolEmpleado');
  if (rolContainer && !dropdownRolEmpleado) {
    dropdownRolEmpleado = new CustomSelect(rolContainer, {
      placeholder: 'Selecciona el puesto...',
      searchPlaceholder: 'Filtrar puesto...',
      options: [
        { value: 'mesero', label: 'Mesero (Terminal POS)', subtitle: 'Piso de mesas y comensales' },
        { value: 'bartender', label: 'Bartender (KDS Barra)', subtitle: 'Monitor de bebidas y preparación' }
      ],
      initialValue: 'mesero',
      icon: 'user',
      onSelect: (opt) => {
        const inputRol = document.getElementById('rolEmpleado');
        if (inputRol) inputRol.value = opt.value;
      }
    });
  }

  const form = document.getElementById('formNuevoEmpleado');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombreEmpleado = document.getElementById('nombreEmpleado').value.trim();
      const emailEmpleado = document.getElementById('emailEmpleado').value.trim();
      const passwordEmpleado = document.getElementById('passwordEmpleado').value;
      const rolEmpleado = (dropdownRolEmpleado ? dropdownRolEmpleado.getValue() : null) || document.getElementById('rolEmpleado').value;
      const btnSubmit = form.querySelector('button[type="submit"]');

      // Validación previa: no invocar la Edge Function con datos incompletos
      if (!nombreEmpleado || !emailEmpleado || !passwordEmpleado || !rolEmpleado) {
        showToast('Completa nombre, correo, contraseña y puesto antes de registrar.', 'warning');
        return;
      }
      if (passwordEmpleado.length < 6) {
        showToast('La contraseña debe contener al menos 6 caracteres.', 'warning');
        return;
      }
      if (!negocioIdActual) {
        showToast('No se identificó tu sucursal. Refresca la página e inténtalo de nuevo.', 'warning');
        return;
      }

      if (btnSubmit) btnSubmit.disabled = true;

      try {
        const { error } = await supabase.functions.invoke('registrar_empleado', {
          body: {
            negocioId: negocioIdActual,
            nombreCompleto: nombreEmpleado,
            email: emailEmpleado,
            password: passwordEmpleado,
            rol: rolEmpleado
          }
        });

        if (error) throw error;
        showToast(`¡Empleado ${nombreEmpleado} registrado exitosamente!`, 'success');
        form.reset();
        if (dropdownRolEmpleado) dropdownRolEmpleado.setValue('mesero');
        await cargarEmpleados();
      } catch (err) {
        notificarError(err, 'No se pudo registrar al empleado');
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
      }
    };
  }
}

// Modales de Menú y Empleados
window.abrirModalNuevoProducto = function() {
  if (!negocioIdActual && window.usuarioActual) negocioIdActual = window.usuarioActual.negocio_id;
  const modal = document.getElementById('modalNuevoProducto');
  openModal(modal);
  initIcons(modal);
};

window.guardarNuevoProducto = async function() {
  const nombre = document.getElementById('nuevoNombreProd').value.trim();
  const costo = parseFloat(document.getElementById('nuevoPrecioProd').value);

  if (!nombre || isNaN(costo) || costo <= 0) {
    showToast('Ingresa un nombre y precio válidos.', 'warning');
    return;
  }

  const { error } = await supabase.from('productos').insert([{
    negocio_id: negocioIdActual,
    nombre,
    precio_actual: costo,
    disponible: true
  }]);

  if (error) {
    notificarError(error, 'Error al guardar producto');
  } else {
    showToast('¡Producto guardado en inventario!', 'success');
    document.getElementById('nuevoNombreProd').value = '';
    document.getElementById('nuevoPrecioProd').value = '';
    forceCloseModal(document.getElementById('modalNuevoProducto'));
    await obtenerCatalogoProductos();
  }
};

window.abrirModalModificarProducto = async function() {
  const modal = document.getElementById('modalModificarProducto');
  if (listaProductosGlobal.length === 0) await obtenerCatalogoProductos();
  const contenedorSelect = document.getElementById('contenedorSelectModificarProd');

  const opciones = listaProductosGlobal.map(p => ({
    value: p.id,
    label: p.nombre,
    price: parseFloat(p.precio_actual).toFixed(2),
    subtitle: `$${p.precio_actual}`
  }));

  if (contenedorSelect) {
    if (!dropdownModificarProd) {
      dropdownModificarProd = new CustomSelect(contenedorSelect, {
        placeholder: '-- Elige un producto a modificar --',
        searchPlaceholder: 'Escribe para filtrar productos...',
        options: opciones,
        icon: 'utensils',
        onSelect: (opt) => cargarDatosModificarProd(opt.value)
      });
    } else {
      dropdownModificarProd.setOptions(opciones);
    }
  }

  // Limpiar campos previos
  document.getElementById('modificarNombreProd').value = '';
  document.getElementById('modificarPrecioProd').value = '';

  openModal(modal);
  initIcons(modal);
};

function cargarDatosModificarProd(prodId) {
  if (!prodId) return;
  const producto = listaProductosGlobal.find(p => p.id === prodId);
  if (producto) {
    document.getElementById('modificarNombreProd').value = producto.nombre;
    document.getElementById('modificarPrecioProd').value = producto.precio_actual;
    document.getElementById('selectModificarProd').value = prodId;
  }
}

window.guardarModificacionProd = async function() {
  const idOriginal = (dropdownModificarProd ? dropdownModificarProd.getValue() : null) || document.getElementById('selectModificarProd').value;
  const nuevoNombre = document.getElementById('modificarNombreProd').value.trim();
  const nuevoCosto = parseFloat(document.getElementById('modificarPrecioProd').value);

  if (!idOriginal || !nuevoNombre || isNaN(nuevoCosto)) {
    showToast('Selecciona un producto e ingresa datos válidos.', 'warning');
    return;
  }

  const { error } = await supabase
    .from('productos')
    .update({ nombre: nuevoNombre, precio_actual: nuevoCosto })
    .eq('id', idOriginal);

  if (error) {
    notificarError(error, 'Error al modificar producto');
  } else {
    showToast('¡Producto actualizado con éxito!', 'success');
    forceCloseModal(document.getElementById('modalModificarProducto'));
    await obtenerCatalogoProductos();
  }
};

window.abrirModalEditarEmpleado = function(id, nombre) {
  document.getElementById('modalEditEmpleadoId').value = id;
  document.getElementById('editNombreEmpleado').value = nombre;
  document.getElementById('editPasswordEmpleado').value = '';
  const modal = document.getElementById('modalEditarEmpleado');
  openModal(modal);
  initIcons(modal);
};

window.guardarEdicionEmpleado = async function() {
  const empleadoId = document.getElementById('modalEditEmpleadoId').value;
  const nuevoNombre = document.getElementById('editNombreEmpleado').value.trim();
  const nuevaPassword = document.getElementById('editPasswordEmpleado').value.trim();

  if (!nuevoNombre) {
    showToast('El nombre del empleado no puede quedar vacío.', 'warning');
    return;
  }
  if (nuevaPassword && nuevaPassword.length < 6) {
    showToast('La nueva contraseña debe contener al menos 6 caracteres.', 'warning');
    return;
  }

  try {
    const { error } = await supabase.functions.invoke('editar_empleado', {
      body: { empleadoId, nuevoNombre, nuevaPassword }
    });
    if (error) throw error;
    showToast('Empleado actualizado exitosamente.', 'success');
    forceCloseModal(document.getElementById('modalEditarEmpleado'));
    await cargarEmpleados();
  } catch (err) {
    notificarError(err, 'Error al editar empleado');
  }
};

window.confirmarCambioEstatusEmpleado = function(id, nombre, nuevoEstado) {
  mostrarConfirmacion({
    titulo: nuevoEstado ? 'Reactivar Personal' : 'Dar de Baja Personal',
    mensaje: `¿Confirmas que deseas ${nuevoEstado ? 'reactivar' : 'dar de baja'} la cuenta de ${nombre}?`,
    tipo: nuevoEstado ? 'success' : 'danger',
    btnAceptarTexto: nuevoEstado ? 'Reactivar' : 'Dar de Baja',
    onConfirm: async () => {
      const { error } = await supabase.from('usuarios').update({ activo: nuevoEstado }).eq('id', id);
      if (error) {
        notificarError(error, 'No se pudo actualizar el estatus');
        return;
      }
      showToast(`Personal ${nuevoEstado ? 'reactivado' : 'dado de baja'}.`, 'info');
      await cargarEmpleados();
    }
  });
};

// ==========================================
// MÓDULO DE REPORTES Y VENTAS (DASHBOARD)
// ==========================================

function configurarFechasPorDefecto() {
    const hoy = new Date();
    const opciones = { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' };
    // Forzamos el formato YYYY-MM-DD
    const hoyPartes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(hoy);
    const hoyString = `${hoyPartes.find(p => p.type === 'year').value}-${hoyPartes.find(p => p.type === 'month').value}-${hoyPartes.find(p => p.type === 'day').value}`;
    
    document.getElementById('filtroDesde').value = hoyString;
    document.getElementById('filtroHasta').value = hoyString;
}

function obtenerRangoOperativoISO(fechaDesde, fechaHasta) {
    const [yearD, monthD, dayD] = fechaDesde.split('-').map(Number);
    const [yearH, monthH, dayH] = fechaHasta.split('-').map(Number);

    // Inicio: 06:00 AM del día 'Desde'
    const inicio = new Date(yearD, monthD - 1, dayD, 6, 0, 0);
    // Fin: 05:59:59 AM del día siguiente al 'Hasta'
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
        showToast("Por favor selecciona un rango de fechas válido.", "warning"); 
        return;
    }

    const { inicioISO, finISO } = obtenerRangoOperativoISO(fechaDesde, fechaHasta);

    try {
        // 1. Obtener Cuentas Cerradas en el rango (usando la variable global negocioIdActual)
        const { data: cuentas, error: errCuentas } = await supabase.from('cuentas')
            .select('id, total')
            .eq('negocio_id', negocioIdActual)
            .eq('estado', 'cerrada')
            .gte('fecha_cierre', inicioISO)
            .lte('fecha_cierre', finISO);

        if (errCuentas) throw errCuentas;

        let totalVendido = 0;
        let idsCuentas = [];
        
        if (cuentas && cuentas.length > 0) {
            totalVendido = cuentas.reduce((sum, c) => sum + Number(c.total), 0);
            idsCuentas = cuentas.map(c => c.id);
        }

        document.getElementById('resumenTotal').textContent = `$${totalVendido.toFixed(2)}`;
        document.getElementById('resumenCuentas').textContent = `${cuentas ? cuentas.length : 0} cuentas cerradas`;

        if (idsCuentas.length === 0) {
            document.getElementById('resumenFavorito').textContent = 'Sin ventas';
            document.getElementById('resumenFavoritoCant').textContent = '-';
            document.getElementById('resumenEstancado').textContent = 'Revisar inventario';
            document.getElementById('resumenEstancadoCant').textContent = '-';
            document.getElementById('listaTopProductos').innerHTML = '<li style="color: var(--text-muted); font-size: var(--text-sm); font-style: italic;">No hay datos en este periodo.</li>';
            return;
        }

        // 2. Obtener Comandas despachadas
        const { data: comandas, error: errComandas } = await supabase.from('comandas')
            .select('producto_id, cantidad')
            .in('cuenta_id', idsCuentas);

        if (errComandas) throw errComandas;

        // 3. Agrupar conteo de productos
        const cantidadesPorProducto = {};
        if (comandas) {
            comandas.forEach(c => {
                if (!cantidadesPorProducto[c.producto_id]) cantidadesPorProducto[c.producto_id] = 0;
                cantidadesPorProducto[c.producto_id] += c.cantidad;
            });
        }

        // 4. Cruzar con Catálogo Global (listaProductosGlobal ya fue poblada por obtenerCatalogoProductos)
        let ranking = [];
        listaProductosGlobal.forEach(prod => {
            ranking.push({
                nombre: prod.nombre,
                vendidos: cantidadesPorProducto[prod.id] || 0
            });
        });

        ranking.sort((a, b) => b.vendidos - a.vendidos);

        // 5. Poblar tarjetas Extremas
        const favorito = ranking[0];
        document.getElementById('resumenFavorito').textContent = favorito.nombre;
        document.getElementById('resumenFavoritoCant').textContent = `${favorito.vendidos} uds`;

        const estancado = ranking[ranking.length - 1];
        document.getElementById('resumenEstancado').textContent = estancado.nombre;
        document.getElementById('resumenEstancadoCant').textContent = estancado.vendidos === 0 ? '¡0 uds vendidas!' : `${estancado.vendidos} uds`;

        // 6. Poblar Tabla Top 5
        const listaTop = document.getElementById('listaTopProductos');
        listaTop.innerHTML = '';
        
        const top5 = ranking.slice(0, 5);
        top5.forEach((item, index) => {
            const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
            listaTop.innerHTML += `
                <li style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 10px 15px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                    <span style="color: var(--text-primary); font-size: var(--text-sm);">
                        <span style="margin-right: 8px;">${medalla}</span> 
                        <strong>${item.nombre}</strong>
                    </span>
                    <span style="font-weight: 700; color: var(--color-success); font-size: var(--text-sm);">${item.vendidos} uds</span>
                </li>
            `;
        });
        
        // Inicializar iconos en el top (en caso de usar lucide en lugar de emojis a futuro)
        initIcons(listaTop);

    } catch (error) {
        notificarError(error, "Hubo un error al procesar el reporte de ventas.");
    }
};