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

export async function createSong({ title, genre, description, coverFile, audioFile, albumId, duration, tags }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('artist_name')
    .eq('user_id', session.user.id)
    .single()

  const coverExt = coverFile.name.split('.').pop()
  const coverPath = `${session.user.id}/${Date.now()}_cover.${coverExt}`
  const { error: coverError } = await supabase.storage.from('covers').upload(coverPath, coverFile, { upsert: true })
  if (coverError) throw coverError
  const { data: coverData } = supabase.storage.from('covers').getPublicUrl(coverPath)

  const audioExt = audioFile.name.split('.').pop()
  const audioPath = `${session.user.id}/${Date.now()}_audio.${audioExt}`
  const { error: audioError } = await supabase.storage.from('audios').upload(audioPath, audioFile, { upsert: true })
  if (audioError) throw audioError
  const { data: audioData } = supabase.storage.from('audios').getPublicUrl(audioPath)

  const { data, error } = await supabase
    .from('songs')
    .insert([{
      title,
      genre,
      description,
      cover_url: coverData.publicUrl,
      audio_url: audioData.publicUrl,
      user_id: session.user.id,
      artist_name: roleData?.artist_name ?? session.user.user_metadata?.name,
      album_id: albumId ?? null,
      duration: duration ?? null,
      tags: tags?.length ? tags : null,
      streams: 0,
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
export async function searchArtists(query) {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('user_id, artist_name, artist_genre, avatar_url')
    .ilike('artist_name', `%${query}%`)
    .limit(5)
  if (error) return []
  return data
}