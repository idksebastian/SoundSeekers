import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPosts } from '../api/community'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import PostModal from '../components/PostModal'

export default function Community() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [likedPosts, setLikedPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingLiked, setLoadingLiked] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState('feed')
  const [openPostId, setOpenPostId] = useState(null)

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

  const fetchLikedPosts = async () => {
    if (!user) return
    setLoadingLiked(true)
    try {
      const { data: likes, error: likesError } = await (await import('../lib/supabase')).supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
      if (likesError) throw likesError
      if (!likes || likes.length === 0) { setLikedPosts([]); return }
      const postIds = likes.map(l => l.post_id).filter(Boolean)
      if (postIds.length === 0) { setLikedPosts([]); return }
      const { data: postsData, error: postsError } = await (await import('../lib/supabase')).supabase
        .from('posts')
        .select('*, post_likes(count), post_comments(count)')
        .in('id', postIds)
        .order('created_at', { ascending: false })
      if (postsError) throw postsError
      setLikedPosts(postsData ?? [])
    } catch (err) {
      console.error('Error cargando posts con like:', err?.message ?? err)
      setLikedPosts([])
    } finally {
      setLoadingLiked(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])
useEffect(() => {
  if (openPostId) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => { document.body.style.overflow = '' }
}, [openPostId])

  useEffect(() => {
    if (tab === 'liked') fetchLikedPosts()
  }, [tab])

  // ── Leer ?post=ID de la URL y abrir el modal correspondiente
  useEffect(() => {
    const postId = searchParams.get('post')
    if (!postId) return

    const found = posts.find(p => p.id === postId)
    if (found) {
      setOpenPostId(postId)
      return
    }

    // Si el post no está en la lista todavía, cargarlo directamente
    const fetchPost = async () => {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase
        .from('posts')
        .select('*, post_likes(count), post_comments(count)')
        .eq('id', postId)
        .single()
      if (data) {
        setPosts(prev => {
          const exists = prev.find(p => p.id === data.id)
          return exists ? prev : [data, ...prev]
        })
        setOpenPostId(postId)
      }
    }
    fetchPost()
  }, [searchParams, posts.length])

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev])
    setShowModal(false)
  }

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setLikedPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handlePostUpdated = (updatedPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
    setLikedPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
  }

  const activePosts = tab === 'liked' ? likedPosts : posts
  const isLoading = tab === 'liked' ? loadingLiked : loading

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
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
  )

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

        {user && (
          <div className="max-w-3xl mx-auto mt-6 flex gap-1">
            <button
              onClick={() => setTab('feed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tab === 'feed' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
              Publicaciones
            </button>
            <button
              onClick={() => setTab('liked')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tab === 'liked' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill={tab === 'liked' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              Me gusta
            </button>
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
        ) : activePosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
            </svg>
            <p className="text-lg font-semibold">
              {tab === 'liked' ? 'Aún no has dado like a ninguna publicación' : 'Aún no hay publicaciones'}
            </p>
            <p className="text-sm mt-1">
              {tab === 'liked' ? 'Explora el feed y dale like a las que te gusten' : '¡Sé el primero en compartir algo!'}
            </p>
          </div>
        ) : (
          activePosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onLikeToggle={tab === 'liked' ? fetchLikedPosts : fetchPosts}
              onDeleted={handlePostDeleted}
              onUpdated={handlePostUpdated}
              autoOpenComments={openPostId === post.id}
              onCommentsOpened={() => {
                setOpenPostId(null)
                setSearchParams({})
              }}
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