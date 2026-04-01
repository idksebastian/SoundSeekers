import { useState, useEffect } from 'react'
import { getComments, createComment } from '../api/community'
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
        username: user.user_metadata?.username ?? user.email?.split('@')[0],
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 line-clamp-1">{post.title}</h2>
            <p className="text-xs text-gray-400">{comments.length} comentarios</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* Lista de comentarios */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-8">Cargando comentarios...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              <p className="text-3xl mb-2">💬</p>
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800">{comment.username ?? 'Usuario'}</span>
                    <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
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
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 shrink-0"
              >
                {sending ? '...' : 'Enviar'}
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
