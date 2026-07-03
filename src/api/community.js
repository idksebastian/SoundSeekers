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
    const { data: post } = await supabase
      .from('posts').select('user_id').eq('id', post_id).single()
    if (post && post.user_id !== user_id) {
      await supabase.from('notifications').insert([{
        user_id: post.user_id,
        type: 'like',
        from_user_id: user_id,
        reference_id: post_id   // like: reference_id = post_id
      }])
    }
    return true
  }
}

export async function getUserLike(post_id, user_id) {
  const { data } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', post_id)
    .eq('user_id', user_id)
    .single()
  return !!data
}

export async function getLikedPosts(user_id) {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id, posts(*, post_likes(count), post_comments(count))')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(d => d.posts).filter(Boolean)
}

// ✅ NUEVO: perfiles de quienes le dieron like a un post, para la página
// /community/post/:postId/likes. Mismo patrón que getFollowers/getFollowing
// en api/profile.js: primero los ids desde la tabla de relación, luego
// los perfiles completos en una segunda query.
export async function getPostLikers(post_id) {
  const { data: likes, error } = await supabase
    .from('post_likes')
    .select('user_id')
    .eq('post_id', post_id)
  if (error || !likes?.length) return []

  const userIds = likes.map(l => l.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, name, artist_name, avatar_url')
    .in('user_id', userIds)

  return profiles ?? []
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
  const { data: profile } = await supabase
    .from('user_roles')
    .select('artist_name')
    .eq('user_id', user_id)
    .single()

  const resolvedUsername = profile?.artist_name || username

  const { data, error } = await supabase
    .from('post_comments')
    .insert([{ post_id, user_id, username: resolvedUsername, avatar_url, content }])
    .select()
  if (error) throw error

  const comment = data[0]

  const { data: post } = await supabase
    .from('posts').select('user_id').eq('id', post_id).single()

  if (post && post.user_id !== user_id) {
    // reference_id = "postId:commentId" para poder navegar y resaltar
    await supabase.from('notifications').insert([{
      user_id: post.user_id,
      type: 'comment',
      from_user_id: user_id,
      reference_id: `${post_id}:${comment.id}`
    }])
  }

  return comment
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

export async function replyToComment({ post_id, parent_comment_id, user_id, username, avatar_url, content }) {
  const { data: profile } = await supabase
    .from('user_roles')
    .select('artist_name')
    .eq('user_id', user_id)
    .single()

  const resolvedUsername = profile?.artist_name || username

  const { data, error } = await supabase
    .from('post_comments')
    .insert([{ post_id, parent_comment_id, user_id, username: resolvedUsername, avatar_url, content }])
    .select()
  if (error) throw error

  const reply = data[0]

  // Notificar al autor del comentario padre
  if (parent_comment_id) {
    const { data: parentComment } = await supabase
      .from('post_comments')
      .select('user_id')
      .eq('id', parent_comment_id)
      .single()

    if (parentComment && parentComment.user_id !== user_id) {
      // reference_id = "postId:replyId" para navegar y resaltar la respuesta
      await supabase.from('notifications').insert([{
        user_id: parentComment.user_id,
        type: 'comment_reply',
        from_user_id: user_id,
        reference_id: `${post_id}:${reply.id}`
      }])
    }
  }

  // Notificar al autor del post si es diferente
  const { data: post } = await supabase
    .from('posts').select('user_id').eq('id', post_id).single()

  if (post && post.user_id !== user_id) {
    await supabase.from('notifications').insert([{
      user_id: post.user_id,
      type: 'comment',
      from_user_id: user_id,
      reference_id: `${post_id}:${reply.id}`
    }])
  }

  return reply
}