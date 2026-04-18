import { supabase } from '../lib/supabase'

export async function getNotifications() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      from_profile:profiles!fk_from_user(user_id, name, artist_name, avatar_url)
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(30)
<<<<<<< Updated upstream
  if (error) {
    const { data: data2, error: error2 } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error2) throw error2
    const withProfiles = await Promise.all(data2.map(async (notif) => {
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
  return data
=======

  if (error) throw error
  if (!data?.length) return []

  const fromUserIds = [...new Set(data.map(n => n.from_user_id).filter(Boolean))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, name, artist_name, avatar_url')
    .in('user_id', fromUserIds)

  const profileMap = {}
  profiles?.forEach(p => { profileMap[p.user_id] = p })

  return data.map(notif => ({
    ...notif,
    from_profile: notif.from_user_id ? profileMap[notif.from_user_id] ?? null : null
  }))
>>>>>>> Stashed changes
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
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}