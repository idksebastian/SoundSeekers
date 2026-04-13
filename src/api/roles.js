import { supabase } from '../lib/supabase'

export async function getUserRole(userId) {
  const { data } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

export async function createListenerRole(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .insert([{ user_id: userId, role: 'listener' }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upgradeToArtist({ userId, artistName, artistBio, artistGenre, artistMood }) {
  await supabase.auth.updateUser({ data: { artist_name: artistName } })
  const existing = await getUserRole(userId)
  if (existing) {
    const { data, error } = await supabase
      .from('user_roles')
      .update({ role: 'artist', artist_name: artistName, artist_bio: artistBio, artist_genre: artistGenre, artist_mood: artistMood, accepted_terms_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role: 'artist', artist_name: artistName, artist_bio: artistBio, artist_genre: artistGenre, artist_mood: artistMood, accepted_terms_at: new Date().toISOString() }])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function requestArtistVerification({ userId, artistName, artistBio, artistGenre, artistMood }) {
  await supabase.auth.updateUser({ data: { artist_name: artistName } })
  const existing = await getUserRole(userId)
  if (existing) {
    const { error } = await supabase
      .from('user_roles')
      .update({ status: 'pending', artist_name: artistName, artist_bio: artistBio, artist_genre: artistGenre, artist_mood: artistMood, accepted_terms_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role: 'listener', status: 'pending', artist_name: artistName, artist_bio: artistBio, artist_genre: artistGenre, artist_mood: artistMood, accepted_terms_at: new Date().toISOString() }])
    if (error) throw error
  }
}

export async function getPendingRequests() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('status', 'pending')
    .order('accepted_terms_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getPendingCount() {
  const { count } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  return count ?? 0
}

export async function approveArtist(userId, artistName) {
  const { error } = await supabase
    .from('user_roles')
    .update({ role: 'artist', status: 'artist' })
    .eq('user_id', userId)
  if (error) throw error

  await supabase
    .from('profiles')
    .upsert({ user_id: userId, artist_name: artistName })

  await supabase.functions.invoke('send-artist-email', {
    body: { user_id: userId, artist_name: artistName, approved: true }
  })
}

export async function rejectArtist(userId, artistName) {
  const { error } = await supabase
    .from('user_roles')
    .update({ status: 'listener', artist_name: null, artist_bio: null, artist_genre: null })
    .eq('user_id', userId)
  if (error) throw error

  await supabase.functions.invoke('send-artist-email', {
    body: { user_id: userId, artist_name: artistName, approved: false }
  })
}

export async function isAdmin(userId) {
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function updateArtistMood(userId, mood) {
  const { error } = await supabase
    .from('user_roles')
    .update({ artist_mood: mood })
    .eq('user_id', userId)
  if (error) throw error
}

export function getArtistLevel(streams, followers) {
  if (streams >= 500 || followers >= 10) return { level: 'Consolidado', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  if (streams >= 50 || followers >= 5) return { level: 'En ascenso', color: 'text-blue-600 bg-blue-50 border-blue-200' }
  if (streams >= 1) return { level: 'Independiente', color: 'text-green-600 bg-green-50 border-green-200' }
  return { level: 'Emergente', color: 'text-purple-600 bg-purple-50 border-purple-200' }
}

export function getListenerLevel(streams) {
  if (streams >= 50) return { level: 'Descubridor', icon: '🔭' }
  if (streams >= 20) return { level: 'Melómano', icon: '🎧' }
  if (streams >= 10) return { level: 'Explorador', icon: '🗺️' }
  return { level: 'Curioso', icon: '👀' }
}