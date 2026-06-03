import { supabase } from '../lib/supabase'

export async function createAlbum({ title, type, releaseDate, presaveDate, description, coverFile }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  let cover_url = null
  if (coverFile) {
    const ext = coverFile.name.split('.').pop()
    const path = `albums/${session.user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, coverFile, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    cover_url = data.publicUrl
  }

  const status = presaveDate ? 'presave' : 'published'

  const { data, error } = await supabase
    .from('albums')
    .insert([{
      user_id: session.user.id,
      title,
      type,
      release_date: releaseDate ?? null,
      presave_date: presaveDate ?? null,
      description,
      cover_url,
      status
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyAlbums() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  const { data, error } = await supabase
    .from('albums')
    .select('*, songs(count)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAlbum(albumId) {
  const { data, error } = await supabase
    .from('albums')
    .select('*, songs(*)')
    .eq('id', albumId)
    .single()
  if (error) throw error
  return data
}

export async function getArtistAlbums(userId) {
  const { data, error } = await supabase
    .from('albums')
    .select('*, songs(count)')
    .eq('user_id', userId)
    .in('status', ['published', 'presave'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateAlbum(albumId, updates) {
  const { data, error } = await supabase
    .from('albums')
    .update(updates)
    .eq('id', albumId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAlbum(albumId) {
  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)
  if (error) throw error
}

export async function togglePresave(albumId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const { data: existing } = await supabase
    .from('presaves')
    .select('id')
    .eq('album_id', albumId)
    .eq('user_id', session.user.id)
    .single()

  if (existing) {
    await supabase.from('presaves').delete().eq('id', existing.id)
    return false
  } else {
    // Guardar presave + notificar al artista
    await supabase.from('presaves').insert([{ album_id: albumId, user_id: session.user.id }])

    // Notificar al dueño del álbum
    const { data: album } = await supabase
      .from('albums')
      .select('user_id')
      .eq('id', albumId)
      .single()

    if (album && album.user_id !== session.user.id) {
      await supabase.from('notifications').insert([{
        user_id: album.user_id,
        type: 'presave',
        from_user_id: session.user.id,
        reference_id: albumId,
      }])
    }

    return true
  }
}

export async function getPresaveCount(albumId) {
  const { count } = await supabase
    .from('presaves')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', albumId)
  return count ?? 0
}

export async function hasPresaved(albumId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data } = await supabase
    .from('presaves')
    .select('id')
    .eq('album_id', albumId)
    .eq('user_id', session.user.id)
    .single()
  return !!data
}

// Publicar álbumes en presave cuya fecha ya llegó y notificar a todos los presavers
export async function publishDueAlbums() {
  const now = new Date().toISOString()

  const { data: albums, error } = await supabase
    .from('albums')
    .select('*, presaves(user_id)')
    .eq('status', 'presave')
    .lte('presave_date', now)

  if (error || !albums?.length) return

  for (const album of albums) {
    // Publicar el álbum
    await supabase
      .from('albums')
      .update({ status: 'published' })
      .eq('id', album.id)

    // Publicar todas las canciones del álbum
    await supabase
      .from('songs')
      .update({ status: 'published' })
      .eq('album_id', album.id)

    // Notificar a cada presaver
    const presavers = album.presaves ?? []
    for (const p of presavers) {
      await supabase.from('notifications').insert([{
        user_id: p.user_id,
        type: 'system',
        from_user_id: album.user_id,
        reference_id: album.id,
        message: `"${album.title}" ya está disponible. ¡Escúchalo ahora! 🎵`,
      }])
    }
  }
}