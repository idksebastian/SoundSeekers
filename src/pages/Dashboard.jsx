import { useEffect, useState, useMemo } from 'react'
import { getSongs } from '../api/songs'
import { getArtistAlbums } from '../api/albums'
import { usePlayer } from '../context/PlayerContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GENRES = [
  { label: 'Todo', value: null, color: '#7c3aed' },
  { label: 'Reggaeton', value: 'Reggaeton', color: '#ec4899' },
  { label: 'Hip-Hop', value: 'Hip-Hop', color: '#f59e0b' },
  { label: 'Champeta', value: 'Champeta', color: '#10b981' },
  { label: 'Electrónica', value: 'Electrónica', color: '#3b82f6' },
  { label: 'Pop', value: 'Pop', color: '#ef4444' },
  { label: 'Indie', value: 'Indie', color: '#8b5cf6' },
  { label: 'Jazz', value: 'Jazz', color: '#f97316' },
  { label: 'Folk', value: 'Folk', color: '#14b8a6' },
  { label: 'Vallenato', value: 'Vallenato', color: '#6366f1' },
  { label: 'Salsa', value: 'Salsa', color: '#e11d48' },
  { label: 'Rap', value: 'Rap', color: '#0ea5e9' },
]

export default function Dashboard() {
  const { playSong, currentSong, isPlaying } = usePlayer()
  const navigate = useNavigate()
  const [songs, setSongs] = useState([])
  const [albums, setAlbums] = useState([])
  const [artists, setArtists] = useState([])
  const [artistAvatars, setArtistAvatars] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [view, setView] = useState('all') // 'all' | 'songs' | 'albums' | 'artists'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSongs()
        setSongs(data)

        // Agrupar artistas
        const artistMap = {}
        data.forEach(song => {
          if (song.user_id && !artistMap[song.user_id]) {
            artistMap[song.user_id] = {
              name: song.artist_name,
              genre: song.genre,
              cover: song.cover_url,
              user_id: song.user_id,
              streams: 0,
              songs: 0,
            }
          }
          if (artistMap[song.user_id]) {
            artistMap[song.user_id].streams += (song.streams ?? 0)
            artistMap[song.user_id].songs++
          }
        })
        setArtists(Object.values(artistMap))

        // Avatars
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('user_id, avatar_url').in('user_id', userIds)
          if (profiles) {
            const map = {}
            profiles.forEach(p => { map[p.user_id] = p.avatar_url })
            setArtistAvatars(map)
          }
        }

        // Albums publicados
        const albumIds = [...new Set(data.filter(s => s.album_id).map(s => s.album_id))]
        if (albumIds.length > 0) {
          const { data: albumsData } = await supabase
            .from('albums')
            .select('*')
            .in('id', albumIds)
            .in('status', ['published', 'presave'])
          if (albumsData) setAlbums(albumsData)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

const filtered = useMemo(() => {
  const q = search.toLowerCase()
  
  // Si hay género o búsqueda, mostrar TODAS las canciones (singles + álbumes)
  const showAllSongs = !!selectedGenre || !!q
  
  return {
    songs: songs.filter(s =>
      (!selectedGenre || s.genre === selectedGenre) &&
      (!q || s.title?.toLowerCase().includes(q) || s.artist_name?.toLowerCase().includes(q) || s.display_artist?.toLowerCase().includes(q))
    ),
    // Albums solo aparecen cuando NO hay filtro activo
    albums: showAllSongs ? [] : albums.filter(a =>
      !q || a.title?.toLowerCase().includes(q)
    ),
    artists: artists.filter(a =>
      (!selectedGenre || a.genre === selectedGenre) &&
      (!q || a.name?.toLowerCase().includes(q))
    ),
  }
}, [songs, albums, artists, search, selectedGenre])

  const genreCounts = useMemo(() => {
    const map = {}
    songs.forEach(s => { if (s.genre) map[s.genre] = (map[s.genre] ?? 0) + 1 })
    return map
  }, [songs])

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '8rem' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }

        .dash-header { background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 3rem 2rem 5rem; }
        .dash-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 5vw, 3.5rem); color: #fff; margin: 0 0 4px; letter-spacing: 0.02em; }
        .dash-subtitle { font-size: 14px; color: rgba(255,255,255,0.65); margin: 0; }

        .dash-search-wrap { max-width: 1100px; margin: -28px auto 0; padding: 0 2rem; position: relative; z-index: 10; }
        .dash-search-input { width: 100%; background: #fff; border: none; border-radius: 16px; padding: 16px 20px 16px 52px; color: #111; font-size: 15px; font-family: inherit; outline: none; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
        .dash-search-input::placeholder { color: #9ca3af; }

        .dash-content { max-width: 1100px; margin: 0 auto; padding: 2rem; }

        .view-tabs { display: flex; gap: 8px; margin-bottom: 2rem; flex-wrap: wrap; }
        .view-tab { padding: 7px 18px; border-radius: 100px; font-size: 13px; font-weight: 600; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .view-tab.active { background: #111; color: #fff; border-color: #111; }
        .view-tab:hover:not(.active) { border-color: #7c3aed; color: #7c3aed; }

        .genre-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 2.5rem; }
        @media (max-width: 500px) { .genre-grid { grid-template-columns: repeat(2, 1fr); } }
        .genre-card { border-radius: 14px; padding: 1.2rem 1rem; cursor: pointer; position: relative; overflow: hidden; transition: transform 0.15s; min-height: 80px; display: flex; align-items: flex-end; }
        .genre-card:hover { transform: scale(1.03); }
        .genre-card.active { outline: 3px solid #111; }
        .genre-card-label { font-size: 15px; font-weight: 800; color: #fff; position: relative; z-index: 1; }

        .section-title { font-size: 1.1rem; font-weight: 800; color: #111; margin: 0 0 1rem; }

        .songs-list { display: flex; flex-direction: column; gap: 4px; }
        .song-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
        .song-row:hover { background: #fff; }
        .song-row-num { width: 20px; font-size: 13px; color: #9ca3af; text-align: right; flex-shrink: 0; }
        .song-row-cover { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .song-row-info { flex: 1; min-width: 0; }
        .song-row-title { font-size: 14px; font-weight: 600; color: #111; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .song-row-artist { font-size: 12px; color: #9ca3af; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .song-row-genre { font-size: 11px; color: #7c3aed; background: #f5f3ff; padding: 2px 8px; border-radius: 100px; font-weight: 600; flex-shrink: 0; }
        .song-row-streams { font-size: 12px; color: #9ca3af; flex-shrink: 0; display: none; }
        @media (min-width: 600px) { .song-row-streams { display: block; } }
        .song-row-play { width: 32px; height: 32px; border-radius: 50%; background: #7c3aed; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.15s; }
        .song-row-play:hover { transform: scale(1.1); }

        .albums-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
        .album-card { cursor: pointer; }
        .album-card-img { width: 100%; aspect-ratio: 1; border-radius: 12px; object-fit: cover; display: block; transition: transform 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 8px; }
        .album-card:hover .album-card-img { transform: scale(1.04); }
        .album-card-title { font-size: 13px; font-weight: 700; color: #111; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .album-card-meta { font-size: 11px; color: #9ca3af; margin: 0; }
        .album-card-presave { display: inline-block; font-size: 10px; font-weight: 700; color: #7c3aed; background: #f5f3ff; padding: 2px 7px; border-radius: 100px; margin-bottom: 4px; }

        .artists-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 20px; }
        .artist-card { cursor: pointer; text-align: center; }
        .artist-avatar { width: 100%; aspect-ratio: 1; border-radius: 50%; object-fit: cover; display: block; margin-bottom: 8px; border: 3px solid #fff; box-shadow: 0 4px 16px rgba(124,58,237,0.12); transition: box-shadow 0.2s, transform 0.3s; }
        .artist-card:hover .artist-avatar { box-shadow: 0 8px 24px rgba(124,58,237,0.25); transform: scale(1.05); }
        .artist-initial { width: 100%; aspect-ratio: 1; border-radius: 50%; background: #f5f3ff; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; color: #7c3aed; margin-bottom: 8px; border: 3px solid #fff; box-shadow: 0 4px 16px rgba(124,58,237,0.12); }
        .artist-name { font-size: 13px; font-weight: 700; color: #111; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .artist-meta { font-size: 11px; color: #9ca3af; margin: 0; }

        .empty { text-align: center; padding: 3rem; color: #9ca3af; }
        .skeleton { background: #ede9fe; border-radius: 8px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }
        .now-playing { color: #7c3aed !important; }
        .now-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #7c3aed; animation: pulse 1.5s infinite; margin-right: 6px; }
      `}</style>

      {/* Header */}
      <div className="dash-header">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 className="dash-title">Explorar</h1>
          <p className="dash-subtitle">Descubre música, artistas y álbumes de nuestra comunidad</p>
        </div>
      </div>

      {/* Search */}
      <div className="dash-search-wrap">
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input className="dash-search-input" placeholder="Buscar canciones, artistas, álbumes..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="dash-content">

        {/* View tabs */}
        <div className="view-tabs">
          {[
            { key: 'all', label: 'Todo' },
            { key: 'songs', label: 'Canciones' },
            { key: 'albums', label: 'Álbumes' },
            { key: 'artists', label: 'Artistas' },
          ].map(t => (
            <button key={t.key} className={`view-tab ${view === t.key ? 'active' : ''}`} onClick={() => setView(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Genre grid — solo en 'all' o 'songs' sin búsqueda */}
        {(view === 'all' || view === 'songs') && !search && (
          <>
            <p className="section-title">Géneros</p>
            <div className="genre-grid">
              {GENRES.map(g => {
                const count = g.value ? (genreCounts[g.value] ?? 0) : songs.length
                if (g.value && count === 0) return null
                return (
                  <div key={g.label} className={`genre-card ${selectedGenre === g.value ? 'active' : ''}`}
                    style={{ background: g.color }}
                    onClick={() => setSelectedGenre(selectedGenre === g.value ? null : g.value)}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', borderRadius: '14px' }}/>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div className="genre-card-label">{g.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{count} {count === 1 ? 'canción' : 'canciones'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: '1', borderRadius: '12px', marginBottom: '8px' }}/>
                <div className="skeleton" style={{ height: '10px', borderRadius: '5px', marginBottom: '6px' }}/>
                <div className="skeleton" style={{ height: '8px', borderRadius: '4px', width: '65%' }}/>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ALBUMS */}
            {(view === 'all' || view === 'albums') && filtered.albums.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <p className="section-title">Álbumes y EPs</p>
                <div className="albums-grid">
                  {filtered.albums.map(album => (
                    <div key={album.id} className="album-card" onClick={() => navigate(`/album/${album.id}`)}>
                      {album.cover_url ? (
                        <img src={album.cover_url} alt={album.title} className="album-card-img"/>
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                          <svg width="32" height="32" fill="none" stroke="#7c3aed" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                        </div>
                      )}
                      {album.status === 'presave' && <span className="album-card-presave">Próximamente</span>}
                      <p className="album-card-title">{album.title}</p>
                      <p className="album-card-meta">{album.type === 'ep' ? 'EP' : album.type === 'album' ? 'Álbum' : 'Single'} · {album.release_date ? new Date(album.release_date).getFullYear() : '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SONGS */}
            {(view === 'all' || view === 'songs') && filtered.songs.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <p className="section-title">Canciones</p>
                <div className="songs-list">
                  {filtered.songs.map((song, idx) => {
                    const isCurrentSong = currentSong?.id === song.id
                    return (
                      <div key={song.id} className="song-row" onClick={() => playSong(song, filtered.songs)}>
                        <span className="song-row-num">
                          {isCurrentSong && isPlaying ? <span className="now-dot"/> : idx + 1}
                        </span>
                        <img src={song.cover_url} alt={song.title} className="song-row-cover"/>
                        <div className="song-row-info">
                          <p className={`song-row-title ${isCurrentSong && isPlaying ? 'now-playing' : ''}`}>{song.title}</p>
                          <p className="song-row-artist">{song.display_artist || song.artist_name}</p>
                        </div>
                        <span className="song-row-genre">{song.genre}</span>
                        {song.streams > 0 && <span className="song-row-streams">{song.streams.toLocaleString()} rep.</span>}
                        <button className="song-row-play" onClick={e => { e.stopPropagation(); playSong(song, filtered.songs) }}>
                          {isCurrentSong && isPlaying
                            ? <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                            : <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                          }
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ARTISTS */}
            {(view === 'all' || view === 'artists') && filtered.artists.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <p className="section-title">Artistas</p>
                <div className="artists-grid">
                  {filtered.artists.map(artist => {
                    const avatar = artistAvatars[artist.user_id]
                    return (
                      <div key={artist.user_id} className="artist-card" onClick={() => navigate(`/artist/${artist.user_id}`)}>
                        {avatar
                          ? <img src={avatar} alt={artist.name} className="artist-avatar"/>
                          : <div className="artist-initial">{artist.name?.[0]?.toUpperCase() ?? '?'}</div>
                        }
                        <p className="artist-name">{artist.name}</p>
                        <p className="artist-meta">{artist.genre} · {artist.songs} canción{artist.songs !== 1 ? 'es' : ''}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty */}
            {filtered.songs.length === 0 && filtered.albums.length === 0 && filtered.artists.length === 0 && (
              <div className="empty">
                <svg width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <p style={{ margin: 0, fontWeight: '600' }}>Sin resultados para "{search}"</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Intenta con otro término</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}