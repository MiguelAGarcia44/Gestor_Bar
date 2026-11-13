// js/core/errors.js
// Gestor Bar - Manejo Centralizado de Errores y Traducciones Amigables

import { showToast } from '../components/toast.js';

/**
 * Diccionario de traducciones de errores comunes de Supabase y Edge Functions.
 */
const TRADUCCIONES_ERRORES = [
  {
    patron: /already been registered|already registered/i,
    mensaje: 'Este correo electrónico ya está registrado por otro usuario.'
  },
  {
    patron: /Password should be at least 6 characters/i,
    mensaje: 'La contraseña debe contener al menos 6 caracteres.'
  },
  {
    patron: /Invalid login credentials/i,
    mensaje: 'Correo electrónico o contraseña incorrectos.'
  },
  {
    patron: /Could not find the '.*' column of 'cuentas'/i,
    mensaje: 'No se pudo abrir la cuenta de la mesa: falta el mesero o usuario asignado. Refresca la página e inténtalo de nuevo.'
  },
  {
    patron: /Could not find the '.*' column of 'comandas'|"precio_unitario"/i,
    mensaje: 'No se pudo registrar el producto en la comanda. Refresca la página e inténtalo de nuevo.'
  },
  {
    patron: /violates foreign key constraint/i,
    mensaje: 'El registro está ligado a datos que ya no existen. Refresca la página e inténtalo de nuevo.'
  },
  {
    patron: /row-level security|permission denied/i,
    mensaje: 'No tienes permisos para realizar esta acción.'
  },
  {
    patron: /JWT expired|invalid JWT|Auth session missing/i,
    mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.'
  },
  {
    patron: /User not allowed|not_admin/i,
    mensaje: 'Tu usuario no tiene permisos para dar de alta cuentas.'
  },
  {
    patron: /invalid format|Unable to validate email|email address .* is invalid|invalid email/i,
    mensaje: 'El correo electrónico no tiene un formato válido.'
  },
  {
    patron: /Failed to send a request to the Edge Function|FunctionsFetchError/i,
    mensaje: 'No se pudo contactar al servidor de funciones. Verifica tu conexión o que las Edge Functions estén activas.'
  },
  {
    patron: /Could not find the '.*' column/i,
    mensaje: 'Incompatibilidad de columnas en la base de datos. Por favor refresca la página.'
  },
  {
    patron: /column .* does not exist/i,
    mensaje: 'La base de datos no coincide con la versión de la app (falta una columna). Avisa al administrador del sistema.'
  },
  {
    patron: /Edge Function returned a non-2xx status code/i,
    mensaje: 'El servidor no pudo procesar la solicitud. Verifica que todos los campos requeridos estén llenos.'
  },
  {
    patron: /Failed to fetch|NetworkError/i,
    mensaje: 'Error de conexión. Verifica que el servidor local de Supabase esté activo.'
  },
  {
    patron: /violates not-null constraint/i,
    mensaje: 'Faltan campos obligatorios por llenar.'
  },
  {
    patron: /duplicate key value violates unique constraint/i,
    mensaje: 'Ya existe un registro con estos datos.'
  }
];

/**
 * Extrae el mensaje de error real, incluso de Edge Functions con non-2xx status.
 * @param {Error|object} error - Error recibido de Supabase o try/catch
 * @returns {Promise<string>} Mensaje traducido y limpio
 */
export async function extraerMensajeError(error) {
  if (!error) return 'Ocurrió un error inesperado.';

  let rawMessage = error.message || String(error);

  // Si proviene de una Edge Function con error.context (Response)
  if (error.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json();
      if (body) {
        if (body.error) rawMessage = body.error;
        else if (body.message) rawMessage = body.message;
        else if (typeof body === 'string') rawMessage = body;
      }
    } catch (_) {
      // Si el context ya fue leído o no es json, intentar leer texto
      try {
        if (typeof error.context.text === 'function') {
          const txt = await error.context.text();
          if (txt) rawMessage = txt;
        }
      } catch (__) {}
    }
  }

  // Buscar coincidencia en diccionario de traducciones
  for (const item of TRADUCCIONES_ERRORES) {
    if (item.patron.test(rawMessage)) {
      return item.mensaje;
    }
  }

  return rawMessage;
}

/**
 * Procesa un error y lanza automáticamente una notificación Toast en la esquina superior derecha.
 * @param {Error|object} error - Error capturado
 * @param {string} prefijo - Prefijo opcional (ej. 'Error al registrar personal')
 */
export async function notificarError(error, prefijo = '') {
  const mensaje = await extraerMensajeError(error);
  const textoCompleto = prefijo ? `${prefijo}: ${mensaje}` : mensaje;
  showToast(textoCompleto, 'danger', 4500);
  console.error('[Gestor Bar Error]', error);
  return textoCompleto;
}
