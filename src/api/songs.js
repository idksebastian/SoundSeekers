import { supabase } from '../lib/supabase'

export async function createSong({ title, genre, description, coverFile, audioFile, albumId, duration, tags, collaborators, credits, trackNumber, collaboratorNames }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('artist_name')
    .eq('user_id', session.user.id)
    .single()

  const artistName = roleData?.artist_name ?? session.user.user_metadata?.name

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

  const displayArtist = collaboratorNames?.length
    ? `${artistName}, ${collaboratorNames.join(', ')}`
    : artistName

  const { data, error } = await supabase
    .from('songs')
    .insert([{
      title,
      genre,
      description,
      cover_url: coverData.publicUrl,
      audio_url: audioData.publicUrl,
      user_id: session.user.id,
      artist_name: artistName,
      display_artist: displayArtist,
      album_id: albumId ?? null,
      duration: duration ?? null,
      tags: tags?.length ? tags : null,
      collaborators: collaborators?.length ? collaborators : [],
      credits: credits?.length ? credits : [],
      track_number: trackNumber ?? null,
      streams: 0,
    }])
    .select()
    .single()

  if (error) throw error

  if (collaborators?.length) {
    for (const collab of collaborators) {
      await supabase.from('song_features').insert([{
        song_id: data.id,
        invited_user_id: collab.user_id,
        invited_by: session.user.id,
        status: 'pending'
      }])
      await supabase.from('notifications').insert([{
        user_id: collab.user_id,
        type: 'feat_invite',
        from_user_id: session.user.id,
        reference_id: data.id
      }])
    }
  }

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
    .order('track_number', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAppearsIn(userId) {
  const { data, error } = await supabase
    .from('song_features')
    .select('song:songs(*)')
    .eq('invited_user_id', userId)
    .eq('status', 'accepted')
  if (error) return []
  return data.map(d => d.song).filter(Boolean)
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

export async function getPendingFeats() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('song_features')
    .select('*, song:songs(id, title, cover_url, genre)')
    .eq('invited_user_id', session.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error

  const withInviters = await Promise.all(data.map(async (feat) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, name, artist_name, avatar_url')
      .eq('user_id', feat.invited_by)
      .single()
    return { ...feat, inviter: profile }
  }))

  return withInviters
}

export async function getPendingFeatsCount() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 0
  const { count } = await supabase
    .from('song_features')
    .select('*', { count: 'exact', head: true })
    .eq('invited_user_id', session.user.id)
    .eq('status', 'pending')
  return count ?? 0
}

export async function respondFeat(featId, accept) {
  const { error } = await supabase
    .from('song_features')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('id', featId)
  if (error) throw error
}