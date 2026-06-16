import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toggleLike, getUserLike, getComments, createComment, replyToComment, deleteComment } from '../api/community'
import { supabase } from '../lib/supabase'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return `Hace ${Math.floor(diff / 86400)} d`
}

function Avatar({ src, name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #f3f4f6' }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        : <span style={{ fontSize: size * 0.38, fontWeight: '700', color: '#7c3aed' }}>{name?.[0]?.toUpperCase() ?? '?'}</span>
      }
    </div>
  )
}

function CommentBubble({ comment, user, onReply, onDelete, deletingId, depth = 0 }) {
  const isOwn = user?.id === comment.user_id
  const isReply = depth > 0

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
      <Avatar src={comment.avatar_url} name={comment.username} size={isReply ? 30 : 36}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: '#f9fafb', borderRadius: '0 16px 16px 16px', padding: '8px 12px', display: 'inline-block', maxWidth: '100%' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: '0 0 2px' }}>{comment.username ?? 'Usuario'}</p>
          <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{comment.content}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', paddingLeft: '4px' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{timeAgo(comment.created_at)}</span>
          {user && depth === 0 && (
            <button onClick={() => onReply(comment)}
              style={{ fontSize: '12px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', padding: 0 }}>
              Responder
            </button>
          )}
          {isOwn && (
            <button onClick={() => onDelete(comment.id)} disabled={deletingId === comment.id}
              style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', padding: 0, opacity: deletingId === comment.id ? 0.5 : 1 }}>
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostPage() {
  const { postId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const commentInputRef = useRef(null)

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)

  // Comentarios organizados: toplevel + replies
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingComment, setDeletingComment] = useState(null)

  // Responder
  const [replyingTo, setReplyingTo] = useState(null) // { id, username }
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const replyInputRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*, post_likes(count), post_comments(count)')
          .eq('id', postId)
          .single()
        if (error) throw error
        setPost(data)
        setLikeCount(data.post_likes?.[0]?.count ?? 0)
      } catch {
        navigate('/community', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [postId])

  useEffect(() => {
    if (!user || !postId) return
    getUserLike(postId, user.id).then(setLiked)
  }, [postId, user])

  useEffect(() => {
    if (!postId) return
    const fetch = async () => {
      setLoadingComments(true)
      try {
        const data = await getComments(postId)
        setComments(data ?? [])
      } catch {} finally { setLoadingComments(false) }
    }
    fetch()
  }, [postId])

  // Agrupar comentarios: top-level y replies
  const topLevel = comments.filter(c => !c.parent_comment_id)
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = []
      acc[c.parent_comment_id].push(c)
    }
    return acc
  }, {})

  const handleLike = async () => {
    if (!user || likeLoading) return
    setLikeLoading(true)
    try {
      const didLike = await toggleLike(postId, user.id)
      setLiked(didLike)
      setLikeCount(p => didLike ? p + 1 : Math.max(0, p - 1))
    } catch {} finally { setLikeLoading(false) }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || submitting) return
    setSubmitting(true)
    try {
      const comment = await createComment({
        post_id: postId,
        user_id: user.id,
        username: user.user_metadata?.artist_name ?? user.user_metadata?.name ?? user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url ?? null,
        content: newComment.trim(),
      })
      setComments(p => [...p, comment])
      setNewComment('')
    } catch {} finally { setSubmitting(false) }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !user || submittingReply || !replyingTo) return
    setSubmittingReply(true)
    try {
      const reply = await replyToComment({
        post_id: postId,
        parent_comment_id: replyingTo.id,
        user_id: user.id,
        username: user.user_metadata?.artist_name ?? user.user_metadata?.name ?? user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url ?? null,
        content: replyText.trim(),
      })
      setComments(p => [...p, reply])
      setReplyText('')
      setReplyingTo(null)
    } catch {} finally { setSubmittingReply(false) }
  }

  const handleStartReply = (comment) => {
    setReplyingTo({ id: comment.id, username: comment.username })
    setReplyText('')
    setTimeout(() => replyInputRef.current?.focus(), 100)
  }

  const handleDeleteComment = async (commentId) => {
    setDeletingComment(commentId)
    try {
      await deleteComment(commentId)
      setComments(p => p.filter(c => c.id !== commentId && c.parent_comment_id !== commentId))
    } catch {} finally { setDeletingComment(null) }
  }

  const totalComments = comments.length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: '32px', height: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  if (!post) return null

  const inputBase = {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    fontSize: '14px', color: '#111', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '6rem' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .c-row { animation: fadeIn 0.18s ease forwards; }
        .action-btn { display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1; padding: 8px; border-radius: 10px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #6b7280; font-family: inherit; transition: background 0.15s; }
        .action-btn:hover { background: #f9fafb; }
        .action-btn.liked { color: #ef4444; }
      `}</style>

      {/* Navbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(248,247,255,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f0f0f0', padding: '0 16px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', height: '52px', gap: '8px' }}>
          <button onClick={() => navigate('/community')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: '14px', fontWeight: '600', padding: '6px 0', fontFamily: 'inherit' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Comunidad
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 16px' }}>

        {/* Post */}
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Avatar src={post.avatar_url} name={post.username} size={44}/>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: 0 }}>{post.username ?? 'Usuario'}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{timeAgo(post.created_at)}</p>
              </div>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111', margin: '0 0 12px', lineHeight: 1.3 }}>{post.title}</h1>
            <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7, margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>{post.content}</p>
            {post.song_label && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: '14px', padding: '10px 16px', marginBottom: '16px' }}>
                <svg width="16" height="16" fill="#7c3aed" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                <span style={{ fontSize: '14px', color: '#6d28d9', fontWeight: '600' }}>{post.song_label}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          {(likeCount > 0 || totalComments > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px', fontSize: '13px', color: '#9ca3af', borderTop: '1px solid #f9fafb' }}>
              {likeCount > 0 && <span>❤️ {likeCount}</span>}
              {totalComments > 0 && <span style={{ marginLeft: 'auto' }}>{totalComments} comentario{totalComments !== 1 ? 's' : ''}</span>}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '4px', padding: '4px 12px 12px', borderTop: '1px solid #f9fafb' }}>
            <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={handleLike} disabled={!user || likeLoading}>
              <svg width="18" height="18" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              Me gusta
            </button>
            <button className="action-btn" onClick={() => commentInputRef.current?.focus()}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Comentar
            </button>
          </div>
        </div>

        {/* Comentarios */}
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

          {/* Input nuevo comentario */}
          {user && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f9fafb' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <Avatar src={user.user_metadata?.avatar_url} name={user.user_metadata?.artist_name || user.user_metadata?.name || user.email} size={36}/>
                <div style={{ flex: 1, background: '#f9fafb', borderRadius: '16px', padding: '10px 14px', display: 'flex', alignItems: 'flex-end', gap: '8px', border: '1.5px solid transparent', transition: 'border-color 0.2s' }}
                  onFocusCapture={e => e.currentTarget.style.borderColor = '#7c3aed'}
                  onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <textarea ref={commentInputRef} value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                    placeholder="Escribe un comentario..." rows={1} style={inputBase}/>
                  <button onClick={handleAddComment} disabled={!newComment.trim() || submitting}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', background: newComment.trim() ? '#7c3aed' : '#e5e7eb', border: 'none', cursor: newComment.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                    <svg width="13" height="13" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista */}
          {loadingComments ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <svg style={{ width: '24px', height: '24px', color: '#7c3aed', animation: 'spin 1s linear infinite', margin: '0 auto', display: 'block' }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : topLevel.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <svg width="40" height="40" fill="none" stroke="#e5e7eb" strokeWidth={1.5} viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Sé el primero en comentar</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0 4px' }}>
              {topLevel.map((comment, i) => (
                <div key={comment.id} className="c-row" style={{ padding: '8px 16px', animationDelay: `${i * 0.04}s` }}>
                  {/* Comentario principal */}
                  <CommentBubble
                    comment={comment} user={user}
                    onReply={handleStartReply}
                    onDelete={handleDeleteComment}
                    deletingId={deletingComment}
                    depth={0}
                  />

                  {/* Respuestas */}
                  {repliesMap[comment.id]?.length > 0 && (
                    <div style={{ marginLeft: '44px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {repliesMap[comment.id].map(reply => (
                        <CommentBubble key={reply.id} comment={reply} user={user}
                          onReply={() => {}} onDelete={handleDeleteComment}
                          deletingId={deletingComment} depth={1}/>
                      ))}
                    </div>
                  )}

                  {/* Input inline de respuesta */}
                  {replyingTo?.id === comment.id && user && (
                    <div style={{ marginLeft: '44px', marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <Avatar src={user.user_metadata?.avatar_url} name={user.user_metadata?.artist_name || user.email} size={30}/>
                      <div style={{ flex: 1, background: '#f9fafb', borderRadius: '14px', padding: '8px 12px', display: 'flex', alignItems: 'flex-end', gap: '8px', border: '1.5px solid #7c3aed' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', margin: '0 0 4px' }}>Respondiendo a @{replyingTo.username}</p>
                          <textarea ref={replyInputRef} value={replyText} onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                            placeholder="Escribe tu respuesta..." rows={1}
                            style={{ ...inputBase, fontSize: '13px' }}/>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => setReplyingTo(null)}
                            style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e5e7eb', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="11" height="11" fill="none" stroke="#6b7280" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                          <button onClick={handleReply} disabled={!replyText.trim() || submittingReply}
                            style={{ width: '28px', height: '28px', borderRadius: '50%', background: replyText.trim() ? '#7c3aed' : '#e5e7eb', border: 'none', cursor: replyText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                            <svg width="12" height="12" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}