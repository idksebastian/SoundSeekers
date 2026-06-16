import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPosts } from '../api/community'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import PostModal from '../components/PostModal'

export default function Community() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [likedPosts, setLikedPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingLiked, setLoadingLiked] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState('feed')

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
      const { supabase } = await import('../lib/supabase')
      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
      if (!likes?.length) { setLikedPosts([]); return }
      const postIds = likes.map(l => l.post_id).filter(Boolean)
      if (!postIds.length) { setLikedPosts([]); return }
      const { data: postsData } = await supabase
        .from('posts').select('*, post_likes(count), post_comments(count)')
        .in('id', postIds).order('created_at', { ascending: false })
      setLikedPosts(postsData ?? [])
    } catch (err) {
      console.error(err)
      setLikedPosts([])
    } finally {
      setLoadingLiked(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])
  useEffect(() => { if (tab === 'liked') fetchLikedPosts() }, [tab])

  const handlePostCreated = (newPost) => { setPosts(prev => [newPost, ...prev]); setShowModal(false) }
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '8rem' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }

        .comm-header { background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 2rem 1rem 4.5rem; }
        @media (min-width: 600px) { .comm-header { padding: 3rem 2rem 5rem; } }
        .comm-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 5vw, 3.5rem); color: #fff; margin: 0 0 4px; letter-spacing: 0.02em; }
        .comm-subtitle { font-size: 13px; color: rgba(255,255,255,0.65); margin: 0; max-width: 420px; }

        .comm-search-wrap { max-width: 680px; margin: -24px auto 0; padding: 0 1rem; position: relative; z-index: 10; }
        @media (min-width: 600px) { .comm-search-wrap { margin: -28px auto 0; padding: 0 2rem; } }
        .comm-write-btn { width: 100%; background: #fff; border: none; border-radius: 14px; padding: 14px 20px; color: #9ca3af; font-size: 14px; font-family: inherit; outline: none; box-shadow: 0 8px 32px rgba(0,0,0,0.12); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 12px; transition: box-shadow 0.2s; }
        .comm-write-btn:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.16); }
        @media (min-width: 600px) { .comm-write-btn { border-radius: 16px; padding: 16px 24px; font-size: 15px; } }

        .comm-content { max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem; }
        @media (min-width: 600px) { .comm-content { padding: 2rem; } }

        .comm-tabs { display: flex; gap: 6px; margin-bottom: 1.5rem; }
        .comm-tab { padding: 7px 18px; border-radius: 100px; font-size: 13px; font-weight: 600; border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280; cursor: pointer; transition: all 0.15s; font-family: inherit; display: flex; align-items: center; gap: 6px; }
        .comm-tab.active { background: #7c3aed; color: #fff; border-color: #7c3aed; box-shadow: 0 4px 12px rgba(124,58,237,0.25); }
        .comm-tab:hover:not(.active) { border-color: #7c3aed; color: #7c3aed; }

        .post-card { background: #fff; border-radius: 20px; border: 1px solid #f0f0f0; box-shadow: 0 2px 12px rgba(0,0,0,0.04); overflow: hidden; cursor: pointer; transition: box-shadow 0.2s, transform 0.15s; margin-bottom: 12px; }
        .post-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.1); transform: translateY(-1px); }

        .skeleton-card { background: #fff; border-radius: 20px; border: 1px solid #f0f0f0; padding: 20px; margin-bottom: 12px; animation: shimmer 1.5s infinite; }
        .skeleton-line { background: #f3f4f6; border-radius: 6px; margin-bottom: 8px; }
        @keyframes shimmer { 0%,100%{opacity:1}50%{opacity:0.5} }
      `}</style>

      {/* Header */}
      <div className="comm-header">
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', margin: '0 0 8px' }}>Comunidad</p>
          <h1 className="comm-title">El Blog</h1>
          <p className="comm-subtitle">Comparte tus descubrimientos, escribe sobre la música que te mueve.</p>
        </div>
      </div>

      {/* Write button como search bar */}
      {user && (
        <div className="comm-search-wrap">
          <button className="comm-write-btn" onClick={() => setShowModal(true)}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#f5f3ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
                : <span style={{ fontSize: '13px', fontWeight: '700', color: '#7c3aed' }}>{(user?.user_metadata?.artist_name || user?.user_metadata?.name || user?.email)?.[0]?.toUpperCase()}</span>
              }
            </div>
            <span>¿Qué quieres compartir hoy?</span>
            <div style={{ marginLeft: 'auto', background: '#7c3aed', color: '#fff', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
              Publicar
            </div>
          </button>
        </div>
      )}

      <div className="comm-content">
        {/* Tabs */}
        {user && (
          <div className="comm-tabs">
            <button className={`comm-tab ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
              Publicaciones
            </button>
            <button className={`comm-tab ${tab === 'liked' ? 'active' : ''}`} onClick={() => setTab('liked')}>
              <svg width="14" height="14" fill={tab === 'liked' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              Me gusta
            </button>
          </div>
        )}

        {/* Feed */}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div className="skeleton-line" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line" style={{ height: '12px', width: '30%' }}/>
                  <div className="skeleton-line" style={{ height: '10px', width: '20%' }}/>
                </div>
              </div>
              <div className="skeleton-line" style={{ height: '16px', width: '60%' }}/>
              <div className="skeleton-line" style={{ height: '10px', width: '90%' }}/>
              <div className="skeleton-line" style={{ height: '10px', width: '70%' }}/>
            </div>
          ))
        ) : activePosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#9ca3af' }}>
            <svg width="48" height="48" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
            </svg>
            <p style={{ fontWeight: '600', fontSize: '15px', margin: '0 0 4px' }}>
              {tab === 'liked' ? 'Aún no has dado like a nada' : 'Sin publicaciones aún'}
            </p>
            <p style={{ fontSize: '13px', margin: 0 }}>
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
            />
          ))
        )}
      </div>

      {showModal && (
        <PostModal onClose={() => setShowModal(false)} onPostCreated={handlePostCreated} />
      )}
    </div>
  )
}