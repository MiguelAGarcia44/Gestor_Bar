import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { negocioId, nuevaPassword } = await req.json()

    // Conectamos como Súper Usuario
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Buscamos el ID en la bóveda del administrador que pertenece a este negocio
    const { data: adminUser, error: errorUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('negocio_id', negocioId)
      .eq('rol', 'admin')
      .single()

    if (errorUser || !adminUser) throw new Error('No se encontró el administrador de este negocio.')

    // 2. Obligamos el cambio de contraseña en la bóveda segura (auth.users)
    const { error: errorAuth } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { password: nuevaPassword }
    )

    if (errorAuth) throw errorAuth

    return new Response(
      JSON.stringify({ mensaje: 'Contraseña actualizada correctamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})