import { useEffect, useState, useRef, useMemo } from 'react'
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

const HISTORY_KEY = 'ss_recently_played'

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function addToHistory(item) {
  try {
    const prev = getHistory().filter(h => h.id !== item.id)
    const next = [item, ...prev].slice(0, 12)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {}
}

export default function Home() {
  const { user } = useAuth()
  const { playSong, currentSong, isPlaying } = usePlayer()
  const navigate = useNavigate()
  const [allSongs, setAllSongs] = useState([])
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [artists, setArtists] = useState([])
  const [artistAvatars, setArtistAvatars] = useState({})
  const [topSong, setTopSong] = useState(null)
  const [topArtist, setTopArtist] = useState(null)
  const [genreCounts, setGenreCounts] = useState([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [slide, setSlide] = useState(0)
  const [recentlyPlayed, setRecentlyPlayed] = useState([])
  const slideInterval = useRef(null)

  useEffect(() => {
    setRecentlyPlayed(getHistory())
  }, [])

  // Actualizar historial cuando cambia la canción
  useEffect(() => {
    if (!currentSong) return
    const item = currentSong.album_id
      ? { type: 'album', id: currentSong.album_id, title: currentSong.album_title || currentSong.title, cover: currentSong.cover_url, artist: currentSong.artist_name }
      : { type: 'song', id: currentSong.id, title: currentSong.title, cover: currentSong.cover_url, artist: currentSong.display_artist || currentSong.artist_name, songObj: currentSong }
    addToHistory(item)
    setRecentlyPlayed(getHistory())
  }, [currentSong?.id])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSongs()
        setAllSongs(data)
        const sorted = [...data].sort((a, b) => (b.streams ?? 0) - (a.streams ?? 0))
        if (sorted[0]) setTopSong(sorted[0])
        const genreMap = {}
        data.forEach(s => { if (s.genre) genreMap[s.genre] = (genreMap[s.genre] ?? 0) + 1 })
        setGenreCounts(Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([genre, count]) => ({ genre, count })))
        const artistMap = {}
        data.forEach(song => {
          if (song.user_id && !artistMap[song.user_id])
            artistMap[song.user_id] = { name: song.artist_name, cover: song.cover_url, genre: song.genre, user_id: song.user_id, streams: 0 }
          if (artistMap[song.user_id]) artistMap[song.user_id].streams += (song.streams ?? 0)
        })
        const artistList = Object.values(artistMap)
        setArtists(artistList.slice(0, 8))
        const top = [...artistList].sort((a, b) => b.streams - a.streams)[0]
        setTopArtist(top)
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('user_id, avatar_url').in('user_id', userIds)
          if (profilesData) {
            const avatarMap = {}
            profilesData.forEach(p => { avatarMap[p.user_id] = p.avatar_url })
            setArtistAvatars(avatarMap)
          }
        }
        // Cargar álbumes publicados
        const albumIds = [...new Set(data.filter(s => s.album_id).map(s => s.album_id))]
        if (albumIds.length > 0) {
          const { data: albumsData } = await supabase.from('albums').select('*').in('id', albumIds).in('status', ['published', 'presave'])
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

  useEffect(() => {
    slideInterval.current = setInterval(() => setSlide(s => (s + 1) % 3), 5000)
    return () => clearInterval(slideInterval.current)
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

  // Grid principal: singles + album cards, filtrado por género
  const gridItems = useMemo(() => {
    if (selectedGenre) {
      // Con género: todas las canciones de ese género (singles + álbum songs)
      return allSongs
        .filter(s => s.genre === selectedGenre)
        .slice(0, 8)
        .map(s => ({ type: 'song', data: s }))
    }
    // Sin género: singles + una card por álbum (sin duplicar canciones)
    const albumMap = {}
    albums.forEach(a => { albumMap[a.id] = a })
    const items = []
    const seenAlbums = new Set()
    allSongs.slice(0, 16).forEach(song => {
      if (song.album_id && albumMap[song.album_id] && !seenAlbums.has(song.album_id)) {
        seenAlbums.add(song.album_id)
        items.push({ type: 'album', data: albumMap[song.album_id] })
      } else if (!song.album_id) {
        items.push({ type: 'song', data: song })
      }
    })
    return items.slice(0, 8)
  }, [allSongs, albums, selectedGenre])

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0]

  const slides = [
    {
      type: 'artist',
      tag: 'Artista de la semana',
      title: topArtist?.name ?? 'Artista destacado',
      subtitle: topArtist?.genre ?? '',
      desc: `${(topArtist?.streams ?? 0).toLocaleString()} reproducciones esta semana`,
      img: topArtist ? (artistAvatars[topArtist.user_id] || topArtist.cover) : null,
      action: () => topArtist && navigate(`/artist/${topArtist.user_id}`),
      btnLabel: 'Ver perfil',
    },
    {
      type: 'song',
      tag: 'Canción de la semana',
      title: topSong?.title ?? 'Canción destacada',
      subtitle: topSong?.display_artist || topSong?.artist_name || '',
      desc: `${(topSong?.streams ?? 0).toLocaleString()} reproducciones · ${topSong?.genre ?? ''}`,
      img: topSong?.cover_url ?? null,
      action: () => topSong && playSong(topSong, allSongs),
      btnLabel: 'Reproducir',
    },
    {
      type: 'cta',
      tag: 'Únete a nosotros',
      title: 'Tu música merece ser escuchada',
      subtitle: 'Plataforma para artistas emergentes',
      desc: 'Sube tu música, conecta con oyentes y haz crecer tu carrera desde cero.',
      img: null,
      action: () => navigate(user ? '/upload' : '/register'),
      btnLabel: user ? 'Subir canción' : 'Crear cuenta gratis',
    },
  ]

  const handlePlayItem = (item) => {
    if (item.type === 'song') {
      playSong(item.data, allSongs)
    } else {
      navigate(`/album/${item.data.id}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }

        .hero-slider { position: relative; margin: 0 1.5rem 2rem; border-radius: 24px; overflow: hidden; height: 460px; cursor: pointer; }
        @media (max-width: 600px) { .hero-slider { height: 320px; margin: 0 0 2rem; border-radius: 0; } }
        .slide-bg { position: absolute; inset: 0; background-size: cover; background-position: center; transition: opacity 0.6s ease; }
        .slide-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.82) 45%, rgba(0,0,0,0.2) 100%); }
        .slide-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; padding: 2.5rem 3rem; max-width: 600px; }
        .slide-tag { display: inline-block; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 100px; font-size: 11px; color: #e5e7eb; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; width: fit-content; }
        .slide-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.5rem, 5vw, 4rem); color: #fff; line-height: 1.05; margin: 0 0 8px; letter-spacing: 0.02em; }
        .slide-subtitle { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 6px; font-weight: 500; }
        .slide-desc { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0 0 20px; }
        .slide-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #111; font-weight: 700; font-size: 13px; padding: 11px 22px; border-radius: 100px; border: none; cursor: pointer; font-family: inherit; transition: transform 0.15s; width: fit-content; text-decoration: none; }
        .slide-btn:hover { transform: scale(1.03); }
        .slide-dots { position: absolute; bottom: 20px; right: 24px; display: flex; gap: 6px; z-index: 3; }
        .slide-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.35); border: none; cursor: pointer; transition: all 0.2s; padding: 0; }
        .slide-dot.active { background: #fff; width: 24px; border-radius: 4px; }

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

        /* Recently played — grid horizontal estilo Spotify */
        .recent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
        @media (max-width: 600px) { .recent-grid { grid-template-columns: 1fr 1fr; gap: 8px; } }
        .recent-item { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 8px; overflow: hidden; cursor: pointer; transition: background 0.15s; height: 56px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .recent-item:hover { background: #ede9fe; }
        .recent-item-cover { width: 56px; height: 56px; object-fit: cover; flex-shrink: 0; }
        .recent-item-cover-placeholder { width: 56px; height: 56px; background: #f5f3ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .recent-item-info { flex: 1; min-width: 0; padding-right: 12px; }
        .recent-item-title { font-size: 13px; font-weight: 700; color: #111; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .recent-item-sub { font-size: 11px; color: #9ca3af; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .recent-play-btn { width: 36px; height: 36px; border-radius: 50%; background: #7c3aed; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 8px; opacity: 0; transition: opacity 0.15s; }
        .recent-item:hover .recent-play-btn { opacity: 1; }

        /* Main grid */
        .main-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
        .grid-card { cursor: pointer; }
        .grid-card-img-wrap { position: relative; aspect-ratio: 1; border-radius: 14px; overflow: hidden; margin-bottom: 10px; background: #f3f4f6; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .grid-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .grid-card:hover .grid-card-img { transform: scale(1.07); }
        .grid-card-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0); transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
        .grid-card:hover .grid-card-overlay { background: rgba(0,0,0,0.4); }
        .grid-play-btn { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #6d28d9); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateY(10px); transition: all 0.2s; box-shadow: 0 4px 16px rgba(124,58,237,0.5); }
        .grid-card:hover .grid-play-btn { opacity: 1; transform: translateY(0); }
        .grid-card-title { font-size: 13px; font-weight: 700; color: #111; margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .grid-card-sub { font-size: 12px; color: #9ca3af; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .now-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #7c3aed; animation: pulse 1.5s infinite; }
        .card-tag { position: absolute; bottom: 8px; left: 8px; font-size: 10px; font-weight: 700; color: #fff; background: rgba(124,58,237,0.8); padding: 2px 7px; border-radius: 100px; }
        .album-badge { position: absolute; top: 8px; left: 8px; font-size: 10px; font-weight: 700; color: #fff; background: rgba(0,0,0,0.5); padding: 2px 7px; border-radius: 100px; backdrop-filter: blur(4px); }

        .artists-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 20px; }
        .artist-card { cursor: pointer; text-align: center; }
        .artist-img-wrap { width: 100%; aspect-ratio: 1; border-radius: 50%; overflow: hidden; margin-bottom: 10px; background: #f3f4f6; border: 3px solid #fff; box-shadow: 0 4px 16px rgba(124,58,237,0.12); transition: box-shadow 0.2s; }
        .artist-card:hover .artist-img-wrap { box-shadow: 0 8px 24px rgba(124,58,237,0.25); }
        .artist-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .artist-card:hover .artist-img { transform: scale(1.08); }
        .artist-initial { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; color: #7c3aed; background: #f5f3ff; }

        .stats-banner { background: linear-gradient(135deg, #7c3aed, #6d28d9); border-radius: 20px; padding: 2.5rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; max-width: 1064px; margin: 0 auto 3rem; }
        @media (max-width: 600px) { .stats-banner { grid-template-columns: 1fr; margin: 0 1rem 3rem; } }
        .stat-number { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; color: #fff; line-height: 1; margin-bottom: 4px; text-align: center; }
        .stat-label { font-size: 12px; color: rgba(255,255,255,0.65); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; }

        .how-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .how-card { background: #fff; border-radius: 20px; padding: 2rem 1.5rem; border: 1px solid #f3f4f6; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
        .how-icon { width: 48px; height: 48px; border-radius: 14px; background: #f5f3ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .how-title { font-size: 15px; font-weight: 800; color: #111; margin: 0 0 6px; }
        .how-desc { font-size: 13px; color: #9ca3af; margin: 0; line-height: 1.6; }

        .footer { background: #111; color: #fff; padding: 4rem 2rem 2rem; margin-top: 4rem; }
        .footer-inner { max-width: 1100px; margin: 0 auto; }
        .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        @media (max-width: 700px) { .footer-top { grid-template-columns: 1fr 1fr; gap: 2rem; } }
        .footer-brand-name { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: #fff; letter-spacing: 0.04em; margin: 0 0 8px; }
        .footer-brand-desc { font-size: 13px; color: #6b7280; line-height: 1.6; max-width: 260px; margin: 0 0 20px; }
        .footer-socials { display: flex; gap: 10px; }
        .footer-social-btn { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; text-decoration: none; }
        .footer-social-btn:hover { background: #7c3aed; border-color: #7c3aed; }
        .footer-col-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
        .footer-link { display: block; font-size: 13px; color: #9ca3af; text-decoration: none; margin-bottom: 10px; transition: color 0.15s; }
        .footer-link:hover { color: #fff; }
        .footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .footer-copy { font-size: 12px; color: #4b5563; }
        .footer-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.25); border-radius: 100px; padding: 4px 12px; font-size: 11px; color: #a78bfa; font-weight: 600; }

        .divider { height: 1px; background: #f3f4f6; max-width: 1100px; margin: 0 auto 2rem; }
        .skeleton { background: #f3f4f6; border-radius: 8px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%,100%{opacity:1}50%{opacity:0.5} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }
      `}</style>

      {/* HERO SLIDER */}
      {!loading && (
        <div style={{ paddingTop: '1.5rem' }}>
          <div className="hero-slider" onClick={slides[slide].action}>
            {slides.map((s, i) => (
              <div key={i} className="slide-bg" style={{
                backgroundImage: s.img ? `url(${s.img})` : 'linear-gradient(135deg, #7c3aed, #ec4899)',
                opacity: slide === i ? 1 : 0,
                zIndex: slide === i ? 1 : 0,
              }}/>
            ))}
            <div className="slide-overlay" style={{ zIndex: 2 }}/>
            <div className="slide-content" style={{ zIndex: 3 }}>
              <span className="slide-tag">{slides[slide].tag}</span>
              <h1 className="slide-title">{slides[slide].title}</h1>
              {slides[slide].subtitle && <p className="slide-subtitle">{slides[slide].subtitle}</p>}
              <p className="slide-desc">{slides[slide].desc}</p>
              <button className="slide-btn" onClick={e => { e.stopPropagation(); slides[slide].action() }}>
                {slides[slide].type === 'song' && (
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                )}
                {slides[slide].btnLabel}
              </button>
            </div>
            <div className="slide-dots" style={{ zIndex: 4 }}>
              {slides.map((_, i) => (
                <button key={i} className={`slide-dot ${slide === i ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); setSlide(i); clearInterval(slideInterval.current) }}/>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECENTLY PLAYED */}
      {recentlyPlayed.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">
              {user ? `Bienvenido de vuelta, ${userName} ` : 'Recién escuchado'}
            </h2>
          </div>
          <div className="recent-grid">
            {recentlyPlayed.slice(0, 6).map(item => (
              <div key={item.id} className="recent-item"
                onClick={() => {
                  if (item.type === 'album') navigate(`/album/${item.id}`)
                  else if (item.songObj) playSong(item.songObj, allSongs)
                }}>
                {item.cover ? (
                  <img src={item.cover} alt={item.title} className="recent-item-cover"/>
                ) : (
                  <div className="recent-item-cover-placeholder">
                    <svg width="20" height="20" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}
                <div className="recent-item-info">
                  <p className="recent-item-title">{item.title}</p>
                  <p className="recent-item-sub">{item.type === 'album' ? 'Álbum' : item.artist}</p>
                </div>
                <button className="recent-play-btn">
                  <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH */}
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

      {/* GENRES */}
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

      {/* MAIN GRID */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">{selectedGenre || 'Recién subidas'}</h2>
          <Link to="/dashboard" className="see-all">Ver todo →</Link>
        </div>
        {loading ? (
          <div className="main-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: '1', borderRadius: '14px', marginBottom: '10px' }}/>
                <div className="skeleton" style={{ height: '10px', borderRadius: '5px', marginBottom: '6px' }}/>
                <div className="skeleton" style={{ height: '8px', borderRadius: '4px', width: '65%' }}/>
              </div>
            ))}
          </div>
        ) : gridItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No hay canciones en este género aún.</div>
        ) : (
          <div className="main-grid">
            {gridItems.map((item, idx) => {
              const isAlbum = item.type === 'album'
              const d = item.data
              const isCurrentSong = !isAlbum && currentSong?.id === d.id
              return (
                <div key={`${item.type}-${d.id}`} className="grid-card" onClick={() => handlePlayItem(item)}>
                  <div className="grid-card-img-wrap">
                    {d.cover_url ? (
                      <img src={d.cover_url} alt={d.title} className="grid-card-img"/>
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" fill="none" stroke="#7c3aed" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                      </div>
                    )}
                    <div className="grid-card-overlay">
                      <button className="grid-play-btn">
                        {isCurrentSong && isPlaying
                          ? <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                          : <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                        }
                      </button>
                    </div>
                    {isCurrentSong && isPlaying && <div className="now-dot"/>}
                    {isAlbum && (
                      <span className="album-badge">{d.type === 'ep' ? 'EP' : 'Álbum'}</span>
                    )}
                    {!isAlbum && d.genre && (
                      <span className="card-tag">{d.genre}</span>
                    )}
                  </div>
                  <p className="grid-card-title">{d.title}</p>
                  <p className="grid-card-sub">
                    {isAlbum
                      ? `${d.release_date ? new Date(d.release_date).getFullYear() : '—'}`
                      : (d.display_artist || d.artist_name)
                    }
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="divider"/>

      {/* ARTISTS */}
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

      {/* STATS */}
      {!loading && allSongs.length > 0 && (
        <div style={{ padding: '0 2rem 3rem' }}>
          <div className="stats-banner">
            <div><div className="stat-number">{allSongs.length}+</div><div className="stat-label">Canciones publicadas</div></div>
            <div><div className="stat-number">{artists.length}+</div><div className="stat-label">Artistas activos</div></div>
            <div><div className="stat-number">{allSongs.reduce((a, s) => a + (s.streams ?? 0), 0).toLocaleString()}</div><div className="stat-label">Reproducciones totales</div></div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">¿Cómo funciona?</h2>
        </div>
        <div className="how-grid">
          {[
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>, title: 'Descubre música', desc: 'Explora canciones de artistas emergentes de Latinoamérica antes que nadie.' },
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>, title: 'Sube tu música', desc: 'Regístrate como artista, sube tus canciones y llega a nuevos oyentes cada día.' },
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, title: 'Colabora', desc: 'Conecta con otros artistas, acepta feats y construye tu red musical.' },
            { icon: <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>, title: 'Crece', desc: 'Rastrea tus reproducciones, seguidores y el impacto de tu música en tiempo real.' },
          ].map(item => (
            <div key={item.title} className="how-card">
              <div className="how-icon">{item.icon}</div>
              <h3 className="how-title">{item.title}</h3>
              <p className="how-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {!user && (
        <div className="section">
          <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)', borderRadius: '24px', padding: '3.5rem 2rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(124,58,237,0.3)' }}>
            <p style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Únete gratis</p>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#fff', margin: '0 0 10px', letterSpacing: '0.02em' }}>Tu sonido merece ser escuchado</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', margin: '0 0 1.8rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
              Crea tu cuenta, sube tu música y conecta con miles de oyentes que buscan nuevos talentos.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', color: '#7c3aed', fontWeight: '700', fontSize: '14px', padding: '13px 28px', borderRadius: '100px', textDecoration: 'none' }}>
                Crear cuenta gratis →
              </Link>
              <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: '600', fontSize: '14px', padding: '13px 28px', borderRadius: '100px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                Explorar música
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <p className="footer-brand-name">SoundSeekers</p>
              <p className="footer-brand-desc">Plataforma de música emergente latinoamericana. Descubre, conecta y comparte tu sonido con el mundo.</p>
              <div className="footer-socials">
                <a href="#" className="footer-social-btn"><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
                <a href="#" className="footer-social-btn"><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.79a4.85 4.85 0 01-1.02-.1z"/></svg></a>
                <a href="#" className="footer-social-btn"><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
              </div>
            </div>
            <div>
              <p className="footer-col-title">Plataforma</p>
              <Link to="/home" className="footer-link">Inicio</Link>
              <Link to="/dashboard" className="footer-link">Explorar</Link>
              <Link to="/community" className="footer-link">Comunidad</Link>
              <Link to="/animo" className="footer-link">Ánimo</Link>
            </div>
            <div>
              <p className="footer-col-title">Artistas</p>
              <Link to="/upload" className="footer-link">Subir música</Link>
              <Link to="/register" className="footer-link">Crear cuenta</Link>
              <Link to="/login" className="footer-link">Iniciar sesión</Link>
            </div>
            <div>
              <p className="footer-col-title">Legal</p>
              <a href="#" className="footer-link">Términos de uso</a>
              <a href="#" className="footer-link">Privacidad</a>
              <a href="#" className="footer-link">Cookies</a>
              <a href="#" className="footer-link">Contacto</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">© 2026 SoundSeekers. Todos los derechos reservados.</p>
            <div className="footer-badge">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
              Hecho con música en Colombia
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}