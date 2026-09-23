import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Recibir los datos del formulario local
    const { negocioId, nombreCompleto, email, password, rol } = await req.json()

    // 2. Conectar con permisos de Súper Usuario
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Crear el empleado en la bóveda segura (auth.users)
    const { data: authUser, error: errorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    })

    if (errorAuth) throw errorAuth

    // 4. Vincular el perfil del empleado con el bar
    const { error: errorPerfil } = await supabaseAdmin
      .from('usuarios')
      .insert([{
        id: authUser.user.id,
        negocio_id: negocioId,
        nombre_completo: nombreCompleto,
        rol: rol, // Aquí guardará 'mesero' o 'bartender'
        activo: true
      }])

    if (errorPerfil) throw errorPerfil

    // Éxito
    return new Response(
      JSON.stringify({ mensaje: 'Empleado registrado con éxito' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})