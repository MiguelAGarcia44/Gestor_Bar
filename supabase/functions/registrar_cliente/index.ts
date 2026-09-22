import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuramos los encabezados CORS para que tu frontend (GitHub Pages/Local) pueda comunicarse con esta función sin ser bloqueado
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de la pre-solicitud (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Recibir los datos del formulario (panel maestro)
    const { nombreComercial, emailAdmin, passwordAdmin } = await req.json()

    // 2. Conectar a Supabase como "Súper Usuario" (Service Role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } } // Evita que modifique la sesión actual
    )

    // 3. Crear el nuevo negocio
    const { data: negocio, error: errorNegocio } = await supabaseAdmin
      .from('negocios')
      .insert([{ nombre_comercial: nombreComercial, estatus_suscripcion: true }])
      .select()
      .single()

    if (errorNegocio) throw errorNegocio

    // 4. Crear el usuario en la bóveda segura (auth.users)
    const { data: authUser, error: errorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: emailAdmin,
      password: passwordAdmin,
      email_confirm: true // Confirmamos su correo automáticamente
    })

    if (errorAuth) throw errorAuth

    // 5. Vincular el perfil público del nuevo dueño con su negocio
    const { error: errorPerfil } = await supabaseAdmin
      .from('usuarios')
      .insert([{
        id: authUser.user.id,
        negocio_id: negocio.id,
        nombre_completo: 'Administrador Local',
        rol: 'admin',
        activo: true
      }])

    if (errorPerfil) throw errorPerfil

    // Éxito: Todo se creó correctamente
    return new Response(
      JSON.stringify({ mensaje: 'Restaurante y administrador creados con éxito', negocio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    // Si algo falla, devolvemos el error al frontend
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})