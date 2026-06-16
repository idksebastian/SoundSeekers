import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createPost } from '../api/community'
import { getSongs } from '../api/songs'

export default function CreatePost() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Canción vinculada
  const [songQuery, setSongQuery] = useState('')
  const [songResults, setSongResults] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [allSongs, setAllSongs] = useState([])
  const [loadingSongs, setLoadingSongs] = useState(false)
  const [songPickerOpen, setSongPickerOpen] = useState(false)
  const songPickerRef = useRef(null)

  // Cargar canciones publicadas una vez
  useEffect(() => {
    setLoadingSongs(true)
    getSongs().then(data => {
      setAllSongs(data.filter(s => s.status === 'published'))
    }).catch(() => {}).finally(() => setLoadingSongs(false))
  }, [])

  // Filtrar en tiempo real
  useEffect(() => {
    if (!songQuery.trim()) { setSongResults([]); return }
    const q = songQuery.toLowerCase()
    setSongResults(
      allSongs.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.artist_name?.toLowerCase().includes(q) ||
        s.display_artist?.toLowerCase().includes(q)
      ).slice(0, 8)
    )
  }, [songQuery, allSongs])

  // Cerrar picker al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (songPickerRef.current && !songPickerRef.current.contains(e.target)) {
        setSongPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelectSong = (song) => {
    setSelectedSong(song)
    setSongQuery('')
    setSongResults([])
    setSongPickerOpen(false)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return setError('El título es obligatorio.')
    if (!content.trim()) return setError('El contenido es obligatorio.')
    setLoading(true)
    setError('')
    try {
      const newPost = await createPost({
        user_id: user.id,
        username: user.user_metadata?.artist_name ?? user.user_metadata?.name ?? user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url ?? null,
        title: title.trim(),
        content: content.trim(),
        song_id: selectedSong?.id ?? null,
        song_label: selectedSong ? `${selectedSong.title} — ${selectedSong.display_artist || selectedSong.artist_name}` : null,
      })
      navigate(`/community/post/${newPost.id}`, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al publicar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = title.trim() && content.trim() && !loading

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '6rem' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        .song-result { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.15s; animation: fadeIn 0.15s ease forwards; }
        .song-result:hover { background: #f5f3ff; }
        textarea { field-sizing: content; }
      `}</style>

      {/* Navbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(248,247,255,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f0f0f0', padding: '0 16px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
          <button onClick={() => navigate('/community')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', fontWeight: '600', padding: '6px 0', fontFamily: 'inherit' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Cancelar
          </button>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#111', margin: 0 }}>Nueva publicación</p>
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ background: canSubmit ? '#7c3aed' : '#e5e7eb', color: canSubmit ? '#fff' : '#9ca3af', border: 'none', borderRadius: '20px', padding: '7px 18px', fontSize: '14px', fontWeight: '700', cursor: canSubmit ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Autor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #f3f4f6' }}>
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
              : <span style={{ fontSize: '16px', fontWeight: '700', color: '#7c3aed' }}>
                  {(user?.user_metadata?.artist_name || user?.user_metadata?.name || user?.email)?.[0]?.toUpperCase()}
                </span>
            }
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: 0 }}>
              {user?.user_metadata?.artist_name || user?.user_metadata?.name || user?.email?.split('@')[0]}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>Publicación pública</p>
          </div>
        </div>

        {/* Card formulario */}
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

          {/* Título */}
          <div style={{ padding: '16px 20px 0' }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título de tu publicación..."
              maxLength={120}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '20px', fontWeight: '800', color: '#111', fontFamily: 'inherit', background: 'transparent', lineHeight: 1.3 }}
            />
          </div>

          <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 20px' }}/>

          {/* Contenido */}
          <div style={{ padding: '0 20px' }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="¿Qué quieres compartir con la comunidad? Cuéntanos sobre esa canción que no puedes dejar de escuchar, un artista que descubriste, o lo que la música te hace sentir..."
              rows={6}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '15px', color: '#374151', fontFamily: 'inherit', background: 'transparent', resize: 'none', lineHeight: 1.7, minHeight: '140px' }}
            />
          </div>

          {/* Canción seleccionada */}
          {selectedSong && (
            <div style={{ margin: '0 20px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: '14px', padding: '10px 14px' }}>
              <img src={selectedSong.cover_url} alt={selectedSong.title}
                style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#6d28d9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSong.title}</p>
                <p style={{ fontSize: '12px', color: '#a78bfa', margin: '1px 0 0' }}>{selectedSong.display_artist || selectedSong.artist_name}</p>
              </div>
              <button onClick={() => setSelectedSong(null)}
                style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ede9fe', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" fill="none" stroke="#7c3aed" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {/* Barra inferior de acciones */}
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Vincular canción:</span>
            <div style={{ position: 'relative', flex: 1 }} ref={songPickerRef}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', borderRadius: '20px', padding: '6px 12px', border: '1.5px solid transparent', transition: 'border-color 0.2s', cursor: 'text' }}
                onClick={() => { setSongPickerOpen(true); }}>
                <svg width="14" height="14" fill="#9ca3af" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                </svg>
                <input
                  value={songQuery}
                  onChange={e => { setSongQuery(e.target.value); setSongPickerOpen(true) }}
                  onFocus={() => setSongPickerOpen(true)}
                  placeholder={selectedSong ? 'Cambiar canción...' : 'Buscar canción o artista...'}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '13px', color: '#111', fontFamily: 'inherit', minWidth: 0 }}
                />
                {loadingSongs && (
                  <svg style={{ width: '14px', height: '14px', color: '#9ca3af', animation: 'spin 1s linear infinite', flexShrink: 0 }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
              </div>

              {/* Resultados */}
              {songPickerOpen && (songResults.length > 0 || songQuery.trim()) && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 -8px 32px rgba(0,0,0,0.1)', zIndex: 30, overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                  {songResults.length === 0 && songQuery.trim() ? (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
                      No se encontraron canciones para "{songQuery}"
                    </div>
                  ) : (
                    songResults.map((song, i) => (
                      <div key={song.id} className="song-result"
                        style={{ animationDelay: `${i * 0.03}s` }}
                        onClick={() => handleSelectSong(song)}>
                        <img src={song.cover_url} alt={song.title}
                          style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '1px 0 0' }}>{song.display_artist || song.artist_name} · {song.genre}</p>
                        </div>
                        <svg width="14" height="14" fill="none" stroke="#d1d5db" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px', borderRadius: '12px', padding: '10px 14px' }}>
            {error}
          </div>
        )}

        {/* Contador de caracteres */}
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
          <span style={{ fontSize: '11px', color: '#d1d5db' }}>{title.length}/120</span>
          <span style={{ fontSize: '11px', color: '#d1d5db' }}>{content.length} caracteres</span>
        </div>

      </div>
    </div>
  )
}