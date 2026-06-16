import { supabase } from '../lib/supabase'

/* ── Verificar si el usuario actual es admin ── */
export async function isAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', session.user.id)
    .single()
  return !!data
}

/* ── Enviar solicitud de artista (listener) ── */
export async function submitArtistRequest({ artist_name, genre, bio, instagram, spotify_url, soundcloud_url, message }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  // Verificar si ya tiene una solicitud pendiente o aprobada
  const { data: existing } = await supabase
    .from('artist_requests')
    .select('id, status')
    .eq('user_id', session.user.id)
    .in('status', ['pending', 'approved'])
    .single()

  if (existing) throw new Error(existing.status === 'approved' ? 'Tu solicitud ya fue aprobada.' : 'Ya tienes una solicitud pendiente.')

  const { data, error } = await supabase
    .from('artist_requests')
    .insert([{ user_id: session.user.id, artist_name, genre, bio, instagram, spotify_url, soundcloud_url, message }])
    .select()
    .single()

  if (error) throw error
  return data
}

/* ── Obtener mi solicitud (listener) ── */
export async function getMyArtistRequest() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase
    .from('artist_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

/* ── ADMIN: obtener todas las solicitudes ── */
export async function getAllArtistRequests(status = 'pending') {
  const { data, error } = await supabase
    .from('artist_requests')
    .select(`
      *,
      profiles!artist_requests_user_id_fkey(user_id, name, artist_name, avatar_url),
      user_roles!artist_requests_user_id_fkey(role, created_at)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/* ── ADMIN: aprobar solicitud → cambia role a 'artist' ── */
export async function approveArtistRequest(requestId, userId, artistName, adminNote = '') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión')

  // 1. Actualizar solicitud
  const { error: reqErr } = await supabase
    .from('artist_requests')
    .update({ status: 'approved', admin_note: adminNote, reviewed_by: session.user.id, updated_at: new Date().toISOString() })
    .eq('id', requestId)
  if (reqErr) throw reqErr

  // 2. Cambiar rol en user_roles
  const { error: roleErr } = await supabase
    .from('user_roles')
    .update({ role: 'artist', artist_name: artistName })
    .eq('user_id', userId)
  if (roleErr) throw roleErr

  // 3. Notificar al usuario
  await supabase.from('notifications').insert([{
    user_id: userId,
    type: 'artist_approved',
    from_user_id: session.user.id,
    reference_id: requestId,
  }])

  return true
}

/* ── ADMIN: rechazar solicitud ── */
export async function rejectArtistRequest(requestId, userId, adminNote = '') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión')

  const { error } = await supabase
    .from('artist_requests')
    .update({ status: 'rejected', admin_note: adminNote, reviewed_by: session.user.id, updated_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error

  // Notificar
  await supabase.from('notifications').insert([{
    user_id: userId,
    type: 'artist_rejected',
    from_user_id: session.user.id,
    reference_id: requestId,
  }])

  return true
}

/* ── Perfil público de oyente ── */
export async function getListenerProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

/* ── ADMIN: perfil detallado de oyente ── */
export async function getListenerAdminDetail(userId) {
  const [profileRes, roleRes, followersRes, followingRes, streamsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
    supabase.from('user_roles').select('*').eq('user_id', userId).single(),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('streams').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  return {
    profile: profileRes.data,
    role: roleRes.data,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    totalStreams: streamsRes.count ?? 0,
  }
}