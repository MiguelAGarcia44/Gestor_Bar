import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { negocioId, nuevoNombreBar, nuevoNombreAdmin, nuevaPassword } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Actualizamos el nombre del Bar
    if (nuevoNombreBar) {
        await supabaseAdmin.from('negocios').update({ nombre_comercial: nuevoNombreBar }).eq('id', negocioId)
    }

    // 2. Buscamos el ID del dueño
    const { data: adminUser } = await supabaseAdmin.from('usuarios')
      .select('id').eq('negocio_id', negocioId).eq('rol', 'admin').single()

    if (adminUser) {
        // 3. Actualizamos su nombre personal
        if (nuevoNombreAdmin) {
            await supabaseAdmin.from('usuarios').update({ nombre_completo: nuevoNombreAdmin }).eq('id', adminUser.id)
        }
        
        // 4. Si escribieron una contraseña, la actualizamos en la bóveda
        if (nuevaPassword && nuevaPassword.length >= 6) {
            await supabaseAdmin.auth.admin.updateUserById(adminUser.id, { password: nuevaPassword })
        }
    }

    return new Response(JSON.stringify({ mensaje: 'Edición completada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})