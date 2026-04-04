import { supabase } from '../lib/supabase'

export async function getPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select(`*, post_likes(count), post_comments(count)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createPost({ user_id, username, avatar_url, title, content, song_id, song_label }) {
  const { data, error } = await supabase
    .from('posts')
    .insert([{ user_id, username, avatar_url, title, content, song_id, song_label }])
    .select()
  if (error) throw error
  return data[0]
}

export async function updatePost(post_id, { title, content, song_label }) {
  const { data, error } = await supabase
    .from('posts')
    .update({ title, content, song_label, edited: true })
    .eq('id', post_id)
    .select()
  if (error) throw error
  return data[0]
}

export async function deletePost(post_id) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', post_id)
  if (error) throw error
}

export async function toggleLike(post_id, user_id) {
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', post_id)
    .eq('user_id', user_id)
    .single()

  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('post_likes').insert([{ post_id, user_id }])
    return true
  }
}

export async function getComments(post_id) {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', post_id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createComment({ post_id, user_id, username, avatar_url, content }) {
  // Traer artist_name del perfil para usar como username real
  const { data: profile } = await supabase
    .from('profiles')
    .select('artist_name')
    .eq('user_id', user_id)
    .single()

  const resolvedUsername = profile?.artist_name || username

  const { data, error } = await supabase
    .from('post_comments')
    .insert([{ post_id, user_id, username: resolvedUsername, avatar_url, content }])
    .select()
  if (error) throw error
  return data[0]
}

export async function updateComment(comment_id, content) {
  const { data, error } = await supabase
    .from('post_comments')
    .update({ content, edited: true })
    .eq('id', comment_id)
    .select()
  if (error) throw error
  return data[0]
}

export async function deleteComment(comment_id) {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', comment_id)
  if (error) throw error
}
