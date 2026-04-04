import { useState, useEffect } from 'react'
import { getComments, createComment, updateComment, deleteComment } from '../api/community'
import { useAuth } from '../context/AuthContext'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return `Hace ${Math.floor(diff / 86400)} d`
}

export default function CommentsModal({ post, onClose }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await getComments(post.id)
        setComments(data)
      } catch (err) {
        console.error('Error cargando comentarios:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchComments()
  }, [post.id])

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
    } catch (err) {
      console.error('Error enviando comentario:', err)
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
      console.error('Error editando comentario:', err)
    }
  }

  const handleDelete = async (commentId) => {
    if (!confirm('¿Eliminar este comentario?')) return
    try {
      await deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err) {
      console.error('Error eliminando comentario:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 line-clamp-1">{post.title}</h2>
            <p className="text-xs text-gray-400">{comments.length} comentarios</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Lista de comentarios */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-8">Cargando comentarios...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <p>Sé el primero en comentar</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0 overflow-hidden">
                  {comment.avatar_url
                    ? <img src={comment.avatar_url} alt={comment.username} className="w-full h-full object-cover" />
                    : comment.username?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{comment.username ?? 'Usuario'}</span>
                      <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                      {comment.edited && (
                        <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">editado</span>
                      )}
                    </div>
                    {/* Opciones solo para el dueño */}
                    {user?.id === comment.user_id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                          className="text-gray-300 hover:text-purple-500 transition"
                          title="Editar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                          title="Eliminar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleEdit(comment)}
                          className="text-xs bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded-lg transition"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input nuevo comentario */}
        <div className="px-6 py-4 border-t border-gray-100">
          {user ? (
            <div className="flex gap-3 items-end">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Escribe un comentario..."
                rows={2}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !newComment.trim()}
                className="p-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl transition disabled:opacity-50 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400">
              <a href="/login" className="text-purple-600 font-semibold hover:underline">Inicia sesión</a> para comentar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
