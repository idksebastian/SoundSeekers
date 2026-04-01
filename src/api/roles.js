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
  // Verificar si ya tiene rol
  const existing = await getUserRole(userId)

  if (existing) {
    const { data, error } = await supabase
      .from('user_roles')
      .update({
        role: 'artist',
        artist_name: artistName,
        artist_bio: artistBio,
        artist_genre: artistGenre,
        artist_mood: artistMood,
        accepted_terms_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        role: 'artist',
        artist_name: artistName,
        artist_bio: artistBio,
        artist_genre: artistGenre,
        artist_mood: artistMood,
        accepted_terms_at: new Date().toISOString()
      }])
      .select()
      .single()
    if (error) throw error
    return data
  }
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