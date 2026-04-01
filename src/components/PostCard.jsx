import { useState } from 'react'
import { toggleLike } from '../api/community'
import { useAuth } from '../context/AuthContext'
import CommentsModal from './CommentsModal'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return `Hace ${Math.floor(diff / 86400)} d`
}

export default function PostCard({ post, onLikeToggle }) {
  const { user } = useAuth()
  const [likeCount, setLikeCount] = useState(post.post_likes?.[0]?.count ?? 0)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const commentCount = post.post_comments?.[0]?.count ?? 0

  const handleLike = async () => {
    if (!user || likeLoading) return
    setLikeLoading(true)
    try {
      const didLike = await toggleLike(post.id, user.id)
      setLiked(didLike)
      setLikeCount(prev => didLike ? prev + 1 : prev - 1)
    } catch (err) {
      console.error('Error al dar like:', err)
    } finally {
      setLikeLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">

        {/* Autor */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0 overflow-hidden">
            {post.avatar_url
              ? <img src={post.avatar_url} alt={post.username} className="w-full h-full object-cover" />
              : post.username?.[0]?.toUpperCase() ?? '?'
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{post.username ?? 'Usuario'}</p>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Contenido */}
        <h2 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4">{post.content}</p>

        {/* Canción vinculada */}
        {post.song_label && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 mb-4 text-sm text-gray-600">
            <span>🎵</span>
            <span className="truncate">{post.song_label}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-5 pt-2 border-t border-gray-50">
          <button
            onClick={handleLike}
            disabled={!user || likeLoading}
            className={`flex items-center gap-1.5 text-sm transition ${
              liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
            } disabled:opacity-40`}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-600 transition"
          >
            <span>💬</span>
            <span>{commentCount}</span>
          </button>
        </div>
      </div>

      {/* Modal comentarios */}
      {showComments && (
        <CommentsModal
          post={post}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  )
}
