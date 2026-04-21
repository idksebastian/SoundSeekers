import { useEffect, useState } from 'react'
import { getSongs } from '../api/songs'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { supabase } from '../lib/supabase'

const GENRES = [
  { label: 'Todos', value: null },
  { label: 'Reggaeton', value: 'Reggaeton' },
  { label: 'Hip-Hop', value: 'Hip-Hop' },
  { label: 'Champeta', value: 'Champeta' },
  { label: 'Electrónica', value: 'Electrónica' },
  { label: 'Pop', value: 'Pop' },
  { label: 'Indie', value: 'Indie' },
  { label: 'Jazz', value: 'Jazz' },
  { label: 'Folk', value: 'Folk' },
  { label: 'Vallenato', value: 'Vallenato' },
  { label: 'Salsa', value: 'Salsa' },
  { label: 'Rap', value: 'Rap' },
]

export default function Home() {
  const { user } = useAuth()
  const { playSong, currentSong, isPlaying } = usePlayer()
  const navigate = useNavigate()
  const [recentSongs, setRecentSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [artists, setArtists] = useState([])
  const [artistAvatars, setArtistAvatars] = useState({})
  const [topSong, setTopSong] = useState(null)
  const [genreCounts, setGenreCounts] = useState([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSongs()
        setAllSongs(data)
        setRecentSongs(data.slice(0, 8))
        const sorted = [...data].sort((a, b) => (b.streams ?? 0) - (a.streams ?? 0))
        if (sorted[0]) setTopSong(sorted[0])
        const genreMap = {}
        data.forEach(s => { if (s.genre) genreMap[s.genre] = (genreMap[s.genre] ?? 0) + 1 })
        setGenreCounts(Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([genre, count]) => ({ genre, count })))
        const artistMap = {}
        data.forEach(song => {
          if (song.user_id && !artistMap[song.user_id])
            artistMap[song.user_id] = { name: song.display_artist || song.artist_name, cover: song.cover_url, genre: song.genre, user_id: song.user_id }
        })
        setArtists(Object.values(artistMap).slice(0, 8))
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('user_id, avatar_url').in('user_id', userIds)
          if (profilesData) {
            const avatarMap = {}
            profilesData.forEach(p => { avatarMap[p.user_id] = p.avatar_url })
            setArtistAvatars(avatarMap)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const q = search.toLowerCase()
    setSearchResults(allSongs.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.artist_name?.toLowerCase().includes(q) ||
      s.display_artist?.toLowerCase().includes(q) ||
      s.genre?.toLowerCase().includes(q)
    ).slice(0, 6))
  }, [search, allSongs])

  const filteredSongs = selectedGenre ? allSongs.filter(s => s.genre === selectedGenre).slice(0, 8) : recentSongs
  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }

        .hero-wrap { padding: 4rem 2rem 2rem; max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
        @media (max-width: 700px) { .hero-wrap { grid-template-columns: 1fr; gap: 2rem; } .featured-box { display: none; } }

        .greeting { font-size: 12px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 10px; }
        .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(3rem, 5vw, 4.5rem); color: #000; line-height: 1.05; margin: 0 0 16px; letter-spacing: 0.01em; }
        .hero-title span { background: linear-gradient(135deg, #7c3aed, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-desc { font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 28px; max-width: 380px; }
        .hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 100px; border: none; cursor: pointer; font-family: inherit; transition: opacity 0.15s, transform 0.15s; text-decoration: none; box-shadow: 0 4px 16px rgba(124,58,237,0.3); }
        .btn-primary:hover { opacity: 0.88; transform: scale(1.02); }
        .btn-secondary { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #374151; font-weight: 600; font-size: 13px; padding: 12px 24px; border-radius: 100px; border: 1px solid #e5e7eb; cursor: pointer; font-family: inherit; transition: all 0.15s; text-decoration: none; }
        .btn-secondary:hover { border-color: #7c3aed; color: #7c3aed; }

        .featured-box { position: relative; border-radius: 24px; overflow: hidden; aspect-ratio: 1; cursor: pointer; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .featured-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s; }
        .featured-box:hover .featured-img { transform: scale(1.06); }
        .featured-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 55%); }
        .featured-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; }
        .featured-play { position: absolute; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #6d28d9); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; box-shadow: 0 4px 20px rgba(124,58,237,0.5); }
        .featured-play:hover { transform: scale(1.1); }

        .search-wrap { max-width: 1100px; margin: 0 auto; padding: 0 2rem 1.5rem; position: relative; }
        .search-input { width: 100%; background: #fff; border: 1px solid #e5e7eb; border-radius: 100px; padding: 13px 20px 13px 50px; color: #111; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .search-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .search-input::placeholder { color: #9ca3af; }
        .search-results { position: absolute; top: calc(100% + 6px); left: 2rem; right: 2rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; z-index: 50; box-shadow: 0 20px 50px rgba(0,0,0,0.12); }
        .search-result-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; transition: background 0.15s; }
        .search-result-item:hover { background: #f5f3ff; }

        .genre-bar { display: flex; gap: 8px; overflow-x: auto; padding: 0 2rem 1.5rem; max-width: 1100px; margin: 0 auto; }
        .genre-pill { flex-shrink: 0; padding: 7px 18px; border-radius: 100px; font-size: 12px; font-weight: 600; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .genre-pill.active { background: #7c3aed; color: #fff; border-color: #7c3aed; box-shadow: 0 4px 12px rgba(124,58,237,0.25); }
        .genre-pill:hover:not(.active) { border-color: #7c3aed; color: #7c3aed; }

        .section { max-width: 1100px; margin: 0 auto; padding: 0 2rem 3rem; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
        .section-title { font-size: 1.2rem; font-weight: 800; color: #111; margin: 0; }
        .see-all { font-size: 12px; color: #9ca3af; text-decoration: none; font-weight: 600; transition: color 0.15s; }
        .see-all:hover { color: #7c3aed; }

        .songs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
        .song-card { cursor: pointer; }
        .song-card-img-wrap { position: relative; aspect-ratio: 1; border-radius: 14px; overflow: hidden; margin-bottom: 10px; background: #f3f4f6; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .song-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .song-card:hover .song-card-img { transform: scale(1.07); }
        .song-card-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0); transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
        .song-card:hover .song-card-overlay { background: rgba(0,0,0,0.4); }
        .song-play-btn { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #6d28d9); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateY(10px); transition: all 0.2s; box-shadow: 0 4px 16px rgba(124,58,237,0.5); }
        .song-card:hover .song-play-btn { opacity: 1; transform: translateY(0); }
        .song-title { font-size: 13px; font-weight: 700; color: #111; margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .song-artist { font-size: 12px; color: #9ca3af; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .now-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #7c3aed; animation: pulse 1.5s infinite; }
        .genre-tag { position: absolute; bottom: 8px; left: 8px; font-size: 10px; font-weight: 700; color: #fff; background: rgba(124,58,237,0.8); padding: 2px 7px; border-radius: 100px; backdrop-filter: blur(4px); }

        .artists-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 20px; }
        .artist-card { cursor: pointer; text-align: center; }
        .artist-img-wrap { width: 100%; aspect-ratio: 1; border-radius: 50%; overflow: hidden; margin-bottom: 10px; background: #f3f4f6; border: 3px solid #fff; box-shadow: 0 4px 16px rgba(124,58,237,0.12); transition: box-shadow 0.2s; }
        .artist-card:hover .artist-img-wrap { box-shadow: 0 8px 24px rgba(124,58,237,0.25); }
        .artist-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .artist-card:hover .artist-img { transform: scale(1.08); }
        .artist-initial { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; color: #7c3aed; background: #f5f3ff; }

        .cta-box { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%); border-radius: 24px; padding: 3rem 2rem; text-align: center; box-shadow: 0 20px 60px rgba(124,58,237,0.3); }
        .cta-title { font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800; color: #fff; margin: 0 0 10px; }
        .cta-desc { color: rgba(255,255,255,0.75); font-size: 15px; margin: 0 0 1.5rem; }
        .btn-cta { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #7c3aed; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 100px; text-decoration: none; transition: transform 0.15s; }
        .btn-cta:hover { transform: scale(1.03); }

        .divider { height: 1px; background: #f3f4f6; max-width: 1100px; margin: 0 auto 2rem; }

        .skeleton { background: #f3f4f6; border-radius: 8px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      {/* Hero */}
      <div className="hero-wrap">
        <div>
          {user ? (
            <p className="greeting">👋 Bienvenido de vuelta, {userName}</p>
          ) : (
            <p className="greeting">✦ BIENVENIDO SOUNDSEEKERS</p>
          )}
          <h1 className="hero-title">
            TU MÚSICA<br/>
            TU MOMENTO<br/>
            <span>TU PLATAFORMA</span>
          </h1>
          <p className="hero-desc">
            Artistas emergentes de Latinoamérica. Música sin filtros, directa de quienes la crean.
          </p>
          <div className="hero-btns">
            <Link to="/dashboard" className="btn-primary">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
              Explorar música
            </Link>
            {!user ? (
              <Link to="/register" className="btn-secondary">Crear cuenta gratis</Link>
            ) : (
              <Link to="/upload" className="btn-secondary">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Subir canción
              </Link>
            )}
          </div>
        </div>

        {topSong && (
          <div className="featured-box" onClick={() => playSong(topSong, allSongs)}>
            <img src={topSong.cover_url} alt={topSong.title} className="featured-img"/>
            <div className="featured-overlay"/>
            <div className="featured-info">
              <p style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>#1 más reproducida</p>
              <p style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topSong.title}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{topSong.display_artist || topSong.artist_name}</p>
            </div>
            <button className="featured-play">
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="search-wrap">
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input className="search-input" placeholder="Buscar canciones, artistas, géneros..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(song => (
              <div key={song.id} className="search-result-item" onClick={() => { playSong(song, allSongs); setSearch('') }}>
                <img src={song.cover_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: '#111', margin: 0, fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{song.display_artist || song.artist_name} · {song.genre}</p>
                </div>
                <svg style={{ width: '14px', height: '14px', color: '#7c3aed', flexShrink: 0, marginLeft: 'auto' }} fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="divider"/>

      {/* Genres */}
      {genreCounts.length > 0 && (
        <div className="genre-bar">
          <button className={`genre-pill ${!selectedGenre ? 'active' : ''}`} onClick={() => setSelectedGenre(null)}>Todo</button>
          {GENRES.filter(g => g.value && genreCounts.find(gc => gc.genre === g.value)).map(g => (
            <button key={g.value} className={`genre-pill ${selectedGenre === g.value ? 'active' : ''}`}
              onClick={() => setSelectedGenre(selectedGenre === g.value ? null : g.value)}>
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Songs */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">{selectedGenre || 'Recién subidas'}</h2>
          <Link to="/dashboard" className="see-all">Ver todo →</Link>
        </div>
        {loading ? (
          <div className="songs-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: '1', borderRadius: '14px', marginBottom: '10px' }}/>
                <div className="skeleton" style={{ height: '10px', borderRadius: '5px', marginBottom: '6px' }}/>
                <div className="skeleton" style={{ height: '8px', borderRadius: '4px', width: '65%' }}/>
              </div>
            ))}
          </div>
        ) : filteredSongs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No hay canciones en este género aún.</div>
        ) : (
          <div className="songs-grid">
            {filteredSongs.map(song => {
              const isCurrentSong = currentSong?.id === song.id
              return (
                <div key={song.id} className="song-card" onClick={() => playSong(song, filteredSongs)}>
                  <div className="song-card-img-wrap">
                    <img src={song.cover_url} alt={song.title} className="song-card-img"/>
                    <div className="song-card-overlay">
                      <button className="song-play-btn">
                        {isCurrentSong && isPlaying
                          ? <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                          : <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                        }
                      </button>
                    </div>
                    {isCurrentSong && isPlaying && <div className="now-dot"/>}
                    <span className="genre-tag">{song.genre}</span>
                  </div>
                  <p className="song-title">{song.title}</p>
                  <p className="song-artist">{song.display_artist || song.artist_name}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="divider"/>

      {/* Artists */}
      {artists.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Artistas emergentes</h2>
            <Link to="/dashboard" className="see-all">Ver todos →</Link>
          </div>
          <div className="artists-grid">
            {artists.map(artist => {
              const avatar = artistAvatars[artist.user_id]
              const streams = allSongs.filter(s => s.user_id === artist.user_id).reduce((acc, s) => acc + (s.streams ?? 0), 0)
              return (
                <div key={artist.user_id} className="artist-card" onClick={() => navigate(`/artist/${artist.user_id}`)}>
                  <div className="artist-img-wrap">
                    {avatar
                      ? <img src={avatar} alt={artist.name} className="artist-img"/>
                      : <div className="artist-initial">{artist.name?.[0]?.toUpperCase() ?? '?'}</div>
                    }
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 3px' }}>{artist.genre}</p>
                  <p style={{ fontSize: '11px', color: '#7c3aed', margin: 0, fontWeight: '700' }}>{streams.toLocaleString()} rep.</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      {!user && (
        <div className="section">
          <div className="cta-box">
            <h2 className="cta-title">Comparte tu sonido</h2>
            <p className="cta-desc">Únete a la comunidad musical de SoundSeekers y llega a nuevos oyentes.</p>
            <Link to="/register" className="btn-cta">
              Crear cuenta gratis →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}