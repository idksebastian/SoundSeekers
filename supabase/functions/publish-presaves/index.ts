import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const now = new Date().toISOString()
  try {
    const { data: albums } = await supabase
      .from('albums')
      .select('id, title, user_id')
      .eq('status', 'presave')
      .lte('presave_date', now)

    for (const album of albums ?? []) {
      await supabase.from('albums').update({ status: 'published' }).eq('id', album.id)
      await supabase.from('songs').update({ status: 'published' }).eq('album_id', album.id)
      const { data: presavers } = await supabase.from('presaves').select('user_id').eq('album_id', album.id)
      for (const p of presavers ?? []) {
        await supabase.from('notifications').insert({
          user_id: p.user_id,
          type: 'system',
          from_user_id: album.user_id,
          reference_id: album.id,
          message: `¡"${album.title}" ya está disponible! 🎵 Escúchalo ahora.`,
        })
      }
    }

    const { data: singles } = await supabase
      .from('songs')
      .select('id, title, user_id')
      .eq('status', 'presave')
      .is('album_id', null)
      .lte('presave_date', now)

    for (const song of singles ?? []) {
      await supabase.from('songs').update({ status: 'published' }).eq('id', song.id)
      const { data: songPresavers } = await supabase.from('song_presaves').select('user_id').eq('song_id', song.id)
      for (const p of songPresavers ?? []) {
        await supabase.from('notifications').insert({
          user_id: p.user_id,
          type: 'system',
          from_user_id: song.user_id,
          reference_id: song.id,
          message: `¡"${song.title}" ya está disponible! 🎵 Escúchalo ahora.`,
        })
      }
    }

    return new Response(
      JSON.stringify({ ok: true, albums: albums?.length ?? 0, singles: singles?.length ?? 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})