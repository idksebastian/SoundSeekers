import { supabase } from '../lib/supabase'

export async function getMyPlaylists(user_id) {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, playlist_songs(count)')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createPlaylist({ user_id, name, description }) {
  const { data, error } = await supabase
    .from('playlists')
    .insert([{ user_id, name, description }])
    .select()
  if (error) throw error
  return data[0]
}

export async function deletePlaylist(playlist_id) {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlist_id)
  if (error) throw error
}

export async function updatePlaylist(playlist_id, { name, description }) {
  const { data, error } = await supabase
    .from('playlists')
    .update({ name, description })
    .eq('id', playlist_id)
    .select()
  if (error) throw error
  return data[0]
}

export async function addSongToPlaylist(playlist_id, song_id) {
  const { error } = await supabase
    .from('playlist_songs')
    .insert([{ playlist_id, song_id }])
  if (error) throw error
}

export async function removeSongFromPlaylist(playlist_id, song_id) {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlist_id)
    .eq('song_id', song_id)
  if (error) throw error
}

export async function getPlaylistSongs(playlist_id) {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('*, songs(*)')
    .eq('playlist_id', playlist_id)
    .order('added_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(ps => ps.songs).filter(Boolean)
}

export async function isSongInPlaylist(playlist_id, song_id) {
  const { data } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('playlist_id', playlist_id)
    .eq('song_id', song_id)
    .single()
  return !!data
}
