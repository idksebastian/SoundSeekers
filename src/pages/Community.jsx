import { useState } from 'react'
import { createPost } from '../api/community'
import { useAuth } from '../context/AuthContext'

export default function PostModal({ onClose, onPostCreated }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [songLabel, setSongLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('El título y el contenido son obligatorios.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const newPost = await createPost({
        user_id: user.id,
        username: user.user_metadata?.username ?? user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url ?? null,
        title: title.trim(),
        content: content.trim(),
        song_id: null,
        song_label: songLabel.trim() || null,
      })
      onPostCreated(newPost)
    } catch (err) {
      console.error('Error creando post:', err)
      setError('Ocurrió un error al publicar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Nueva Publicación</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* Título */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="¿De qué quieres hablar?"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Contenido */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Contenido
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Comparte tu descubrimiento musical..."
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
        </div>

        {/* Canción vinculada (opcional) */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            🎵 Canción vinculada <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={songLabel}
            onChange={e => setSongLabel(e.target.value)}
            placeholder="Ej: Midnight Echoes — Luna Veil"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-xs mb-4">{error}</p>
        )}

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
