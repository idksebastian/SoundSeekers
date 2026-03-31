import { supabase } from '../lib/supabase'

async function uploadFile(bucket, file) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const ext = file.name.split('.').pop()
  const path = `${session.user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function createSong({ title, genre, description, coverFile, audioFile }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const cover_url = await uploadFile('covers', coverFile)
  const audio_url = await uploadFile('audios', audioFile)

  const artist_name = session.user.user_metadata?.name ?? session.user.email

  const { data, error } = await supabase
    .from('songs')
    .insert([{
      title,
      genre,
      description,
      cover_url,
      audio_url,
      user_id: session.user.id,
      artist_name
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSongs() {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMySongs(userId) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateSong(id, fields) {
  const { data, error } = await supabase
    .from('songs')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSong(id) {
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) throw error
}

export async function registerStream(songId) {
  const { data: { session } } = await supabase.auth.getSession()
  await supabase.from('streams').insert([{
    song_id: songId,
    user_id: session?.user?.id ?? null
  }])
}