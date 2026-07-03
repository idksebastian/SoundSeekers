import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPostLikers } from '../api/community'
import { isFollowing, toggleFollow } from '../api/profile'
import { useAuth } from '../context/AuthContext'

export default function PostLikes() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [likers, setLikers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingFollow, setLoadingFollow] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!postId) return
    const fetch = async () => {
      setLoading(true)
      try {
        const raw = await getPostLikers(postId)
        const enriched = user
          ? await Promise.all(raw.map(async u => {
              if (u.user_id === user.id) return { ...u, is_following: false }
              try { return { ...u, is_following: await isFollowing(u.user_id) } }
              catch { return { ...u, is_following: false } }
            }))
          : raw.map(u => ({ ...u, is_following: false }))
        setLikers(enriched)
      } catch {} finally { setLoading(false) }
    }
    fetch()
  }, [postId, user])

  const handleToggleFollow = async (targetUserId) => {
    if (!user) return navigate('/login')
    setLoadingFollow(p => ({ ...p, [targetUserId]: true }))
    try {
      const newStatus = await toggleFollow(targetUserId)
      setLikers(prev => prev.map(u => u.user_id === targetUserId ? { ...u, is_following: newStatus } : u))
    } catch {} finally {
      setLoadingFollow(p => ({ ...p, [targetUserId]: false }))
    }
  }

  const handleBack = () => navigate(`/community/post/${postId}`)

  const filtered = search.trim()
    ? likers.filter(u => (u.artist_name || u.name || '').toLowerCase().includes(search.toLowerCase()))
    : likers

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: '600px', margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .user-row { animation: fadeIn 0.2s ease forwards; }
        .follow-btn:active { transform: scale(0.96); }
      `}</style>

      {/* ── Navbar estilo Instagram ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '52px', padding: '0 8px' }}>
          <button onClick={handleBack}
            style={{ width: '40px', height: '40px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0 }}>
            <svg width="22" height="22" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#111', margin: 0, lineHeight: 1.2 }}>
              {likers.length > 0 ? <><span style={{ fontWeight: '800' }}>{likers.length.toLocaleString()}</span> Me gusta</> : 'Me gusta'}
            </p>
          </div>
          <div style={{ width: '40px' }}/>
        </div>
      </div>

      {/* ── Buscador ── */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: '#f2f2f7', border: 'none', borderRadius: '10px', padding: '9px 12px 9px 36px', fontSize: '14px', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#c7c7cc', border: 'none', cursor: 'pointer', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Lista ── */}
      <div style={{ padding: '8px 0 100px' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f0f0f0', flexShrink: 0, animation: 'pulse 1.5s infinite' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ height: '13px', background: '#f0f0f0', borderRadius: '6px', width: '40%', marginBottom: '6px', animation: 'pulse 1.5s infinite' }}/>
                <div style={{ height: '11px', background: '#f0f0f0', borderRadius: '6px', width: '25%', animation: 'pulse 1.5s infinite' }}/>
              </div>
              <div style={{ width: '80px', height: '32px', borderRadius: '8px', background: '#f0f0f0', animation: 'pulse 1.5s infinite' }}/>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <svg width="48" height="48" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: '0 0 4px' }}>
              {search ? 'Sin resultados' : 'Nadie le ha dado like aún'}
            </p>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
              {search ? `No hay usuarios con "${search}"` : 'Cuando alguien le dé like aparecerá aquí'}
            </p>
          </div>
        ) : (
          filtered.map((u, i) => {
            const isMe = u.user_id === user?.id
            const isFollowingUser = u.is_following
            const isLoadingBtn = loadingFollow[u.user_id]
            const name = u.artist_name || u.name || 'Usuario'
            const subname = u.artist_name && u.name ? u.name : null

            return (
              <div key={u.user_id} className="user-row"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', animationDelay: `${i * 0.03}s` }}>

                <div onClick={() => navigate(`/artist/${u.user_id}`)}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, cursor: 'pointer', border: '1.5px solid #f0f0f0' }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                        {name[0].toUpperCase()}
                      </div>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/artist/${u.user_id}`)}>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  {subname && <p style={{ fontSize: '12px', color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subname}</p>}
                </div>

                {!isMe && user && (
                  <button className="follow-btn"
                    onClick={() => handleToggleFollow(u.user_id)}
                    disabled={isLoadingBtn}
                    style={{
                      flexShrink: 0,
                      padding: '7px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: isFollowingUser ? '1.5px solid #e5e7eb' : 'none',
                      background: isFollowingUser ? '#fff' : '#7c3aed',
                      color: isFollowingUser ? '#111' : '#fff',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      minWidth: '90px',
                      textAlign: 'center',
                      transition: 'transform 0.1s, background 0.15s',
                      opacity: isLoadingBtn ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!isFollowingUser && !isLoadingBtn) e.currentTarget.style.background = '#6d28d9' }}
                    onMouseLeave={e => { if (!isFollowingUser) e.currentTarget.style.background = '#7c3aed' }}>
                    {isLoadingBtn ? '...' : isFollowingUser ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}