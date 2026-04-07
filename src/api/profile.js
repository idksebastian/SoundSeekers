import { supabase } from '../lib/supabase'

export async function getProfile() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user
}

export async function updateProfile({ name, avatarFile, description, instagram, twitter, tiktok, youtube, website }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  let avatar_url = session.user.user_metadata?.avatar_url

  if (avatarFile) {
    const ext = avatarFile.name.split('.').pop()
    const path = `${session.user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, avatarFile, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    avatar_url = data.publicUrl
  }

  const { error: authError } = await supabase.auth.updateUser({ data: { name, avatar_url } })
  if (authError) throw authError

  const { error: roleError } = await supabase
    .from('user_roles')
    .update({ description, instagram, twitter, tiktok, youtube, website })
    .eq('user_id', session.user.id)
  if (roleError) throw roleError

  await supabase
    .from('profiles')
    .upsert({
      user_id: session.user.id,
      name,
      avatar_url,
      artist_name: session.user.user_metadata?.artist_name ?? null
    })
}

export async function getFollowStats(userId) {
  const { count: followers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)

  const { count: following } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)

  return { followers: followers ?? 0, following: following ?? 0 }
}

export async function getSongStreams(songIds) {
  if (!songIds.length) return 0
  const { count } = await supabase
    .from('streams')
    .select('*', { count: 'exact', head: true })
    .in('song_id', songIds)
  return count ?? 0
}

export async function isFollowing(followingId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', session.user.id)
    .eq('following_id', followingId)
    .single()
  return !!data
}

export async function toggleFollow(followingId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  const following = await isFollowing(followingId)
  if (following) {
    await supabase.from('follows').delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', followingId)
  } else {
    await supabase.from('follows').insert([{
      follower_id: session.user.id,
      following_id: followingId
    }])
  }
  return !following
}

export async function getPublicProfile(userId) {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

export async function getPublicProfileStreams(userId) {
  const { data: songs } = await supabase
    .from('songs')
    .select('id')
    .eq('user_id', userId)

  if (!songs?.length) return 0

  const { count } = await supabase
    .from('streams')
    .select('*', { count: 'exact', head: true })
    .in('song_id', songs.map(s => s.id))

  return count ?? 0
}