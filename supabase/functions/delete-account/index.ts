import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ Nombres confirmados contra el Table Editor real de Supabase
// (public schema): admin_users, albums, contact_messages, follows,
// notifications, player_state, playlist_songs, playlists, post_comments,
// post_likes, posts, presaves, profiles, recently_played, song_features,
// song_likes, song_presaves, songs, streams, user_roles.
// No se incluye "contact_messages" porque probablemente no tiene
// user_id (mensajes de un formulario de contacto anónimo) — bórrala
// manualmente si corresponde a tu esquema.
const TABLES_WITH_USER_ID = [
  'song_likes', 'post_likes', 'post_comments', 'posts',
  'presaves', 'song_presaves', 'player_state', 'recently_played',
  'streams', 'song_features', 'playlists', 'user_roles',
  'profiles', 'admin_users',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ Identificamos al usuario a partir de SU PROPIO token (no del
    // body), para que nadie pueda pedir borrar la cuenta de otra persona
    // simplemente cambiando un user_id en el JSON.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no válido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const userId = user.id

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ✅ Borrado best-effort de datos propios. Cada tabla en su propio
    // try/catch: si una falla (nombre incorrecto, no existe, etc.) no
    // detiene el resto ni el paso final (borrar la cuenta de Auth), que
    // es lo que realmente soluciona el bug reportado.
    for (const table of TABLES_WITH_USER_ID) {
      try {
        await supabaseAdmin.from(table).delete().eq('user_id', userId)
      } catch (e) {
        console.warn(`No se pudo limpiar la tabla "${table}":`, e)
      }
    }

    // follows tiene dos columnas de usuario distintas
    try { await supabaseAdmin.from('follows').delete().eq('follower_id', userId) } catch (e) { console.warn('follows follower_id:', e) }
    try { await supabaseAdmin.from('follows').delete().eq('following_id', userId) } catch (e) { console.warn('follows following_id:', e) }

    // notifications: como destinatario y como origen
    try { await supabaseAdmin.from('notifications').delete().eq('user_id', userId) } catch (e) { console.warn('notifications user_id:', e) }
    try { await supabaseAdmin.from('notifications').delete().eq('from_user_id', userId) } catch (e) { console.warn('notifications from_user_id:', e) }

    // playlist_songs no tiene user_id propio (es tabla de unión) — hay
    // que borrarla a través de los playlist_id que pertenecen al usuario,
    // antes de borrar las playlists mismas.
    try {
      const { data: myPlaylists } = await supabaseAdmin.from('playlists').select('id').eq('user_id', userId)
      const playlistIds = myPlaylists?.map(p => p.id) ?? []
      if (playlistIds.length) {
        await supabaseAdmin.from('playlist_songs').delete().in('playlist_id', playlistIds)
      }
    } catch (e) { console.warn('playlist_songs:', e) }

    // Canciones y álbumes propios (por si no hay cascade configurado)
    try { await supabaseAdmin.from('songs').delete().eq('user_id', userId) } catch (e) { console.warn('songs:', e) }
    try { await supabaseAdmin.from('albums').delete().eq('user_id', userId) } catch (e) { console.warn('albums:', e) }

    // ✅ Esto es lo que realmente resuelve el bug: sin esto, el correo
    // sigue existiendo en Supabase Auth aunque hayas "eliminado" la
    // cuenta desde el frontend — por eso el registro fallaba diciendo
    // que el correo ya existe, mientras que iniciar sesión sí funcionaba.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('Error eliminando usuario de auth:', deleteError)
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('delete-account error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})