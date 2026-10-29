// api.js
import { supabase } from './conexion.js';

// ==========================================
// LECTURA (READ)
// ==========================================
export async function obtenerProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    // Opcional: filtrar solo los disponibles
    .eq('disponible', true)
    // Opcional: ordenar alfabéticamente
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener productos:', error.message);
    return [];
  }
  return data;
}

// ==========================================
// ESCRITURA (CREATE)
// ==========================================
export async function crearProducto(nombre, precio, idNegocio) {
  const { data, error } = await supabase
    .from('productos')
    .insert([
      { 
        nombre: nombre, 
        precio_actual: precio, 
        negocio_id: idNegocio // Obligatorio por las reglas RLS
      }
    ])
    .select(); // Exige que devuelva la fila recién insertada

  if (error) {
    console.error('Error al crear producto:', error.message);
    return null;
  }
  return data[0];
}

// ==========================================
// ACTUALIZACIÓN (UPDATE)
// ==========================================
export async function actualizarPrecioProducto(idProducto, nuevoPrecio) {
  const { data, error } = await supabase
    .from('productos')
    .update({ precio_actual: nuevoPrecio })
    .eq('id', idProducto)
    .select();

  if (error) {
    console.error('Error al actualizar:', error.message);
    return null;
  }
  return data[0];
}

// ==========================================
// BORRADO (DELETE)
// ==========================================
// Borrado Lógico (Recomendado para mantener historial de cuentas pasadas)
export async function desactivarProducto(idProducto) {
  const { error } = await supabase
    .from('productos')
    .update({ disponible: false })
    .eq('id', idProducto);

  if (error) {
    console.error('Error al desactivar:', error.message);
    return false;
  }
  return true;
}

// Borrado Físico (Elimina la fila permanentemente)
export async function eliminarProductoDefinitivo(idProducto) {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', idProducto);

  if (error) {
    console.error('Error al eliminar:', error.message);
    return false;
  }
  return true;
}