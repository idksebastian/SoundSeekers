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
      release_date: releaseDate,
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
    .eq('status', 'published')
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
    await supabase.from('presaves').insert([{ album_id: albumId, user_id: session.user.id }])
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