import { useState, useEffect } from 'react'
import { getPosts } from '../api/community'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import PostModal from '../components/PostModal'

export default function Community() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const data = await getPosts()
      setPosts(data)
    } catch (err) {
      console.error('Error cargando posts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev])
    setShowModal(false)
  }

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handlePostUpdated = (updatedPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-10">
        <div className="max-w-3xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-purple-600 uppercase mb-2">Comunidad</p>
            <h1 className="text-4xl font-black text-gray-900 mb-3">El Blog</h1>
            <p className="text-gray-500 text-sm max-w-md">
              Comparte tus descubrimientos, escribe sobre la música que te mueve y conecta con otros buscadores.
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold px-5 py-3 rounded-xl transition shadow-md shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Escribir una Publicación
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex flex-col gap-2">
                  <div className="w-28 h-3 bg-gray-200 rounded" />
                  <div className="w-16 h-2 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="w-3/4 h-5 bg-gray-200 rounded mb-3" />
              <div className="w-full h-3 bg-gray-100 rounded mb-2" />
              <div className="w-2/3 h-3 bg-gray-100 rounded" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
            </svg>
            <p className="text-lg font-semibold">Aún no hay publicaciones</p>
            <p className="text-sm mt-1">¡Sé el primero en compartir algo!</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onLikeToggle={fetchPosts}
              onDeleted={handlePostDeleted}
              onUpdated={handlePostUpdated}
            />
          ))
        )}
      </div>

      {showModal && (
        <PostModal
          onClose={() => setShowModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  )
}
