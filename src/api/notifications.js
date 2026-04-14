import { supabase } from '../lib/supabase'

export async function getNotifications() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error

  const withProfiles = await Promise.all(data.map(async (notif) => {
    if (!notif.from_user_id) return { ...notif, from_profile: null }
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, name, artist_name, avatar_url')
      .eq('user_id', notif.from_user_id)
      .single()
    return { ...notif, from_profile: profile }
  }))
  return withProfiles
}

export async function getUnreadCount() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 0
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('read', false)
  return count ?? 0
}

export async function markAllAsRead() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', session.user.id)
    .eq('read', false)
}

export async function markAsRead(notificationId) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
}

export async function createNotification({ userId, type, fromUserId, referenceId }) {
  if (userId === fromUserId) return
  await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      type,
      from_user_id: fromUserId,
      reference_id: referenceId
    }])
}

export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}