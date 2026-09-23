import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { empleadoId, nuevoNombre, nuevaPassword } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Actualizamos el nombre en la tabla pública usuarios
    if (nuevoNombre) {
        await supabaseAdmin.from('usuarios').update({ nombre_completo: nuevoNombre }).eq('id', empleadoId)
    }
    
    // 2. Si escribieron una contraseña, la actualizamos en la bóveda de Auth
    if (nuevaPassword && nuevaPassword.length >= 6) {
        await supabaseAdmin.auth.admin.updateUserById(empleadoId, { password: nuevaPassword })
    }

    return new Response(JSON.stringify({ mensaje: 'Edición completada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})