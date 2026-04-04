import { useState } from 'react'
import { toggleLike, deletePost, updatePost } from '../api/community'
import { useAuth } from '../context/AuthContext'
import CommentsModal from './CommentsModal'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return `Hace ${Math.floor(diff / 86400)} d`
}

export default function PostCard({ post, onLikeToggle, onDeleted, onUpdated }) {
  const { user } = useAuth()
  const [likeCount, setLikeCount] = useState(post.post_likes?.[0]?.count ?? 0)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [editSongLabel, setEditSongLabel] = useState(post.song_label ?? '')
  const [saving, setSaving] = useState(false)
  const commentCount = post.post_comments?.[0]?.count ?? 0
  const isOwner = user?.id === post.user_id

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

  const handleDelete = async () => {
    if (!confirm('¿Seguro que quieres eliminar esta publicación?')) return
    try {
      await deletePost(post.id)
      onDeleted(post.id)
    } catch (err) {
      console.error('Error eliminando post:', err)
    }
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return
    setSaving(true)
    try {
      const updated = await updatePost(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        song_label: editSongLabel.trim() || null,
      })
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      console.error('Error editando post:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">

        {/* Autor + menú */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0 overflow-hidden">
              {post.avatar_url
                ? <img src={post.avatar_url} alt={post.username} className="w-full h-full object-cover" />
                : post.username?.[0]?.toUpperCase() ?? '?'
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{post.username ?? 'Usuario'}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
                {post.edited && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">editado</span>
                )}
              </div>
            </div>
          </div>

          {/* Menú opciones (solo owner) */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(prev => !prev)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-36 overflow-hidden">
                  <button
                    onClick={() => { setEditing(true); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => { handleDelete(); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contenido o formulario de edición */}
        {editing ? (
          <div className="flex flex-col gap-3 mb-4">
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            <input
              type="text"
              value={editSongLabel}
              onChange={e => setEditSongLabel(e.target.value)}
              placeholder="Canción vinculada (opcional)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4">{post.content}</p>
            {post.song_label && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 mb-4 text-sm text-gray-600">
                <svg className="w-4 h-4 text-purple-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                </svg>
                <span className="truncate">{post.song_label}</span>
              </div>
            )}
          </>
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
            <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <span>{commentCount}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <CommentsModal
          post={post}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  )
}
