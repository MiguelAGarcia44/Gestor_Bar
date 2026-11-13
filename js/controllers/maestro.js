// js/controllers/maestro.js
import { supabase } from '../core/conexion.js';
import { iconSvg, initIcons } from '../core/icons.js';
import { openModal, forceCloseModal, mostrarConfirmacion } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { notificarError } from '../core/errors.js';

export async function inicializarMaestro() {
  await cargarNegocios();
  bindMaestroEvents();
}

export async function cargarNegocios() {
  const listaNegocios = document.getElementById('listaNegocios');
  if (!listaNegocios) return;

  try {
    const { data: negocios, error } = await supabase
      .from('negocios')
      .select(`
        id, nombre_comercial, estatus_suscripcion, fecha_registro,
        usuarios ( nombre_completo, rol )
      `)
      .neq('nombre_comercial', 'Administración Central SaaS')
      .order('fecha_registro', { ascending: false });

    if (error) throw error;
    listaNegocios.innerHTML = '';

    if (!negocios || negocios.length === 0) {
      listaNegocios.innerHTML = '<li style="color: var(--text-muted); padding: 1rem; text-align: center;">Aún no hay clientes registrados en la plataforma.</li>';
      return;
    }

    negocios.forEach(negocio => {
      const li = document.createElement('li');
      li.style.padding = '0.875rem 1rem';
      li.style.borderBottom = '1px solid var(--border-subtle)';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.gap = '0.75rem';

      const isActivo = negocio.estatus_suscripcion;
      const admin = negocio.usuarios ? negocio.usuarios.find(u => u.rol === 'admin') : null;
      const nombreAdmin = admin ? admin.nombre_completo : 'Sin Admin';

      li.innerHTML = `
        <div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: var(--text-base);">${negocio.nombre_comercial}</div>
          <div style="font-size: var(--text-xs); color: var(--text-muted); display:flex; align-items:center; gap:0.375rem; margin-top:2px;">
            ${iconSvg('user', { size: 12 })} <span>Dueño: ${nombreAdmin}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: var(--text-xs); color: ${isActivo ? 'var(--color-success)' : 'var(--color-danger)'}; background: ${isActivo ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)'}; padding: 0.2rem 0.6rem; border-radius: var(--radius-pill); font-weight: 700;">
            ${isActivo ? 'Activo' : 'Inactivo'}
          </span>
          <button class="btn btn-secondary btn-sm" onclick="window.abrirModalEditarCliente('${negocio.id}', '${negocio.nombre_comercial}', '${nombreAdmin}')">
            ${iconSvg('pencil', { size: 14 })}
            <span>Editar</span>
          </button>
          <button class="btn ${isActivo ? 'btn-danger' : 'btn-success'} btn-sm" onclick="window.cambiarEstatusNegocio('${negocio.id}', ${!isActivo})">
            ${iconSvg(isActivo ? 'shield-alert' : 'shield-check', { size: 14 })}
            <span>${isActivo ? 'Dar de baja' : 'Reactivar'}</span>
          </button>
        </div>
      `;

      listaNegocios.appendChild(li);
    });

    initIcons(listaNegocios);
  } catch (error) {
    listaNegocios.innerHTML = `<li style="color: var(--color-danger); padding: 1rem;">${iconSvg('x-circle', { size: 16 })} Error al cargar cartera de clientes.</li>`;
    notificarError(error, 'Error al cargar la cartera de clientes');
  }
}

function bindMaestroEvents() {
  const form = document.getElementById('formNuevoCliente');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombreComercial = document.getElementById('nombreComercial').value.trim();
      const nombreAdmin = document.getElementById('nombreAdmin').value.trim();
      const emailAdmin = document.getElementById('emailAdmin').value.trim();
      const passwordAdmin = document.getElementById('passwordAdmin').value;
      const btnSubmit = form.querySelector('button[type="submit"]');

      // Validación previa: no invocar la Edge Function con datos incompletos
      if (!nombreComercial || !nombreAdmin || !emailAdmin || !passwordAdmin) {
        showToast('Completa todos los campos del establecimiento antes de continuar.', 'warning');
        return;
      }
      if (passwordAdmin.length < 6) {
        showToast('La contraseña debe contener al menos 6 caracteres.', 'warning');
        return;
      }

      if (btnSubmit) btnSubmit.disabled = true;

      try {
        const { error } = await supabase.functions.invoke('registrar_cliente', {
          body: { nombreComercial, nombreAdmin, emailAdmin, passwordAdmin }
        });

        if (error) throw error;

        showToast(`¡Establecimiento ${nombreComercial} creado con éxito!`, 'success');
        form.reset();
        await cargarNegocios();
      } catch (err) {
        notificarError(err, 'No se pudo dar de alta el establecimiento');
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
      }
    };
  }
}

window.abrirModalEditarCliente = function(id, nombreBar, nombreAdmin) {
  document.getElementById('modalEditId').value = id;
  document.getElementById('editNombreBar').value = nombreBar;
  document.getElementById('editNombreAdmin').value = nombreAdmin;
  document.getElementById('editPassword').value = '';
  const modal = document.getElementById('modalEditarCliente');
  openModal(modal);
  initIcons(modal);
};

window.guardarEdicionCliente = async function() {
  const negocioId = document.getElementById('modalEditId').value;
  const nuevoNombreBar = document.getElementById('editNombreBar').value.trim();
  const nuevoNombreAdmin = document.getElementById('editNombreAdmin').value.trim();
  const nuevaPassword = document.getElementById('editPassword').value.trim();

  if (!nuevoNombreBar || !nuevoNombreAdmin) {
    showToast('El nombre del establecimiento y del dueño son obligatorios.', 'warning');
    return;
  }
  if (nuevaPassword && nuevaPassword.length < 6) {
    showToast('La nueva contraseña debe contener al menos 6 caracteres.', 'warning');
    return;
  }

  try {
    const { error } = await supabase.functions.invoke('editar_cliente', {
      body: { negocioId, nuevoNombreBar, nuevoNombreAdmin, nuevaPassword }
    });
    if (error) throw error;
    showToast('Datos del cliente actualizados.', 'success');
    forceCloseModal(document.getElementById('modalEditarCliente'));
    await cargarNegocios();
  } catch (err) {
    notificarError(err, 'Error al editar cliente');
  }
};

window.cambiarEstatusNegocio = function(id, nuevoEstado) {
  mostrarConfirmacion({
    titulo: nuevoEstado ? 'Reactivar Establecimiento' : 'Desactivar Establecimiento',
    mensaje: `¿Confirmas que deseas ${nuevoEstado ? 'reactivar' : 'dar de baja'} la suscripción de este establecimiento?`,
    tipo: nuevoEstado ? 'success' : 'danger',
    btnAceptarTexto: nuevoEstado ? 'Reactivar' : 'Dar de Baja',
    onConfirm: async () => {
      const { error } = await supabase.from('negocios').update({ estatus_suscripcion: nuevoEstado }).eq('id', id);
      if (error) {
        notificarError(error, 'No se pudo actualizar la suscripción');
        return;
      }
      showToast(`Establecimiento ${nuevoEstado ? 'reactivado' : 'dado de baja'}.`, 'info');
      await cargarNegocios();
    }
  });
};
