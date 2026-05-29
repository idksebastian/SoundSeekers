import { useState, useEffect, useRef } from 'react'
import { getComments, createComment, updateComment, deleteComment } from '../api/community'
import { useAuth } from '../context/AuthContext'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <p className="text-center text-gray-800 font-semibold text-base mb-1">¿Estás seguro?</p>
        <p className="text-center text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition font-semibold">Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function CommentsModal({ post, onClose }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showFullPost, setShowFullPost] = useState(false)
  const commentsEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await getComments(post.id)
        setComments(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchComments()
  }, [post.id])

  useEffect(() => {
    if (!loading && comments.length > 0) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [loading])

  const handleSend = async () => {
    if (!newComment.trim() || !user) return
    setSending(true)
    try {
      const comment = await createComment({
        post_id: post.id,
        user_id: user.id,
        username: user.user_metadata?.artist_name ?? user.user_metadata?.name ?? user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url ?? null,
        content: newComment.trim(),
      })
      setComments(prev => [...prev, comment])
      setNewComment('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const handleEdit = async (comment) => {
    if (!editContent.trim()) return
    try {
      const updated = await updateComment(comment.id, editContent.trim())
      setComments(prev => prev.map(c => c.id === comment.id ? updated : c))
      setEditingId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err) {
      console.error(err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <>
      {/* Overlay — click afuera cierra */}
      <div
        className="fixed top-0 left-0 right-0 bottom-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-8"
        onClick={onClose}
      >
        {/* Modal — stopPropagation para no cerrar al hacer click adentro */}
        <div
          className="bg-white w-full h-full sm:h-auto sm:max-h-[80vh] sm:rounded-2xl sm:max-w-2xl flex flex-col shadow-2xl overflow-hidden mx-auto"
          onClick={e => e.stopPropagation()}
        >

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Botón volver */}
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition shrink-0">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <h2 className="text-base font-bold text-gray-900 truncate">Publicación de {post.username ?? 'Usuario'}</h2>
            </div>
            {/* Botón cerrar */}
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition shrink-0 ml-2">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ── CONTENIDO SCROLLEABLE ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Post */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0 overflow-hidden">
                  {post.avatar_url
                    ? <img src={post.avatar_url} alt={post.username} className="w-full h-full object-cover"/>
                    : post.username?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{post.username ?? 'Usuario'}</p>
                  <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
                </div>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{post.title}</h3>
              <p className={`text-sm text-gray-600 leading-relaxed ${!showFullPost ? 'line-clamp-3' : ''}`}>
                {post.content}
              </p>
              {post.content?.length > 150 && (
                <button onClick={() => setShowFullPost(p => !p)}
                  className="text-xs text-purple-600 hover:underline mt-1 font-medium">
                  {showFullPost ? 'Ver menos' : 'Ver más'}
                </button>
              )}
              {post.song_label && (
                <div className="flex items-center gap-2 mt-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                  </svg>
                  <span className="truncate">{post.song_label}</span>
                </div>
              )}

              {/* Stats del post */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {post.post_likes?.[0]?.count ?? 0} me gusta
                </span>
                <span className="text-xs text-gray-400">{comments.length} comentario{comments.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* ── COMENTARIOS ── */}
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <svg className="w-6 h-6 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <p className="text-sm font-medium">Sé el primero en comentar</p>
                  <p className="text-xs mt-1">Comparte lo que piensas</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0 overflow-hidden mt-0.5">
                      {comment.avatar_url
                        ? <img src={comment.avatar_url} alt={comment.username} className="w-full h-full object-cover"/>
                        : comment.username?.[0]?.toUpperCase() ?? '?'
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === comment.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={2}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"/>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                            <button onClick={() => handleEdit(comment)}
                              className="text-xs bg-purple-700 text-white px-3 py-1 rounded-lg hover:bg-purple-800 transition">Guardar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
                            <p className="text-xs font-semibold text-gray-900 mb-0.5">{comment.username ?? 'Usuario'}</p>
                            <p className="text-sm text-gray-700 leading-relaxed break-words">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-1">
                            <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                            {comment.edited && <span className="text-xs text-gray-400">· editado</span>}
                            {user?.id === comment.user_id && (
                              <>
                                <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                                  className="text-xs text-gray-400 hover:text-purple-600 font-medium transition">
                                  Editar
                                </button>
                                <button onClick={() => setConfirmDeleteId(comment.id)}
                                  className="text-xs text-gray-400 hover:text-red-500 font-medium transition">
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef}/>
            </div>
          </div>

          {/* ── INPUT FIJO ABAJO ── */}
          <div className="border-t border-gray-100 px-4 sm:px-6 py-3 shrink-0 bg-white">
            {user ? (
              <div className="flex items-end gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0 overflow-hidden">
                  {user.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover"/>
                    : (user.user_metadata?.name ?? user.email)?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
                <div className="flex-1 flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2">
                  <textarea
                    ref={inputRef}
                    value={newComment}
                    onChange={e => {
                      setNewComment(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                    }}
                    placeholder="Escribe un comentario..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-800 focus:outline-none resize-none leading-5 py-0.5"
                    style={{ minHeight: '22px', maxHeight: '120px' }}
                  />
                  <button onClick={handleSend} disabled={sending || !newComment.trim()}
                    className="shrink-0 text-purple-600 hover:text-purple-800 disabled:opacity-30 transition pb-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-1">
                <a href="/login" className="text-purple-600 font-semibold hover:underline">Inicia sesión</a> para comentar
              </p>
            )}
          </div>
        </div>
      </div>

      {confirmDeleteId && (
        <ConfirmModal
          message="Este comentario se eliminará permanentemente."
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </>
  )
}