import { useEffect, useState } from 'react'
import { getSongs } from '../api/songs'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import SkeletonHomeSong from '../components/SkeletonHomeSong'
import { supabase } from '../lib/supabase'

const GENRES = [
  { label: 'Todos', value: null, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg> },
  { label: 'Indie', value: 'Indie', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg> },
  { label: 'Electrónica', value: 'Electrónica', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> },
  { label: 'Folk', value: 'Folk', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18v-6a9 9 0 0118 0v6"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg> },
  { label: 'Hip-Hop', value: 'Hip-Hop', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg> },
  { label: 'Champeta', value: 'Champeta', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg> },
  { label: 'Jazz', value: 'Jazz', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg> },
  { label: 'Pop', value: 'Pop', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg> },
]

export default function Home() {
  const { user } = useAuth()
  const { playSong, currentSong, isPlaying } = usePlayer()
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
        setRecentSongs(data.slice(0, 6))

        // Canción más reproducida
        const sorted = [...data].sort((a, b) => (b.streams ?? 0) - (a.streams ?? 0))
        if (sorted[0]) setTopSong(sorted[0])

        // Géneros con conteo
        const genreMap = {}
        data.forEach(s => {
          if (s.genre) genreMap[s.genre] = (genreMap[s.genre] ?? 0) + 1
        })
        const genreList = Object.entries(genreMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([genre, count]) => ({ genre, count }))
        setGenreCounts(genreList)

        // Artistas únicos
        const artistMap = {}
        data.forEach(song => {
          if (song.artist_name && !artistMap[song.artist_name]) {
            artistMap[song.artist_name] = {
              name: song.artist_name,
              cover: song.cover_url,
              genre: song.genre,
              songs: 1,
              user_id: song.user_id,
            }
          } else if (song.artist_name) {
            artistMap[song.artist_name].songs++
          }
        })
        setArtists(Object.values(artistMap).slice(0, 6))

        // Avatares de perfiles
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, avatar_url')
            .in('user_id', userIds)
          if (profiles) {
            const avatarMap = {}
            profiles.forEach(p => { avatarMap[p.user_id] = p.avatar_url })
            setArtistAvatars(avatarMap)
          }
        }

      } catch (err) {
        console.error('Error cargando home:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Buscador en tiempo real
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const q = search.toLowerCase()
    const results = allSongs.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.artist_name?.toLowerCase().includes(q) ||
      s.genre?.toLowerCase().includes(q)
    ).slice(0, 5)
    setSearchResults(results)
  }, [search, allSongs])

  const filteredSongs = selectedGenre
    ? allSongs.filter(s => s.genre === selectedGenre).slice(0, 6)
    : recentSongs

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Banner bienvenida personalizado si está logueado */}
      {user && (
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg uppercase shrink-0">
                {userName?.[0] ?? '?'}
              </div>
              <div>
                <p className="font-bold text-sm">¡Bienvenido de vuelta, {userName}!</p>
                <p className="text-purple-200 text-xs">Sigue descubriendo música nueva hoy</p>
              </div>
            </div>
            <Link
              to="/upload"
              className="flex items-center gap-1.5 bg-white text-purple-700 font-semibold text-xs px-4 py-2 rounded-full hover:bg-purple-50 transition shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Subir canción
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-500 text-sm px-4 py-1.5 rounded-full mb-8 shadow-sm">
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
          Plataforma de descubrimiento musical
        </div>
        <h1 className="text-5xl font-bold text-black mb-4 leading-tight">
          Bienvenido a <span className="text-purple-600">SoundSeekers</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
          Descubre música de artistas emergentes. Sube tus canciones, conecta con nuevos oyentes y explora sonidos únicos.
        </p>

        {/* Buscador rápido */}
        <div className="relative max-w-xl mx-auto mb-8">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar canciones, artistas o géneros..."
            className="w-full pl-11 pr-4 py-3 rounded-full border border-gray-200 bg-white shadow-sm text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          {/* Resultados del buscador */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
              {searchResults.map(song => (
                <div
                  key={song.id}
                  onClick={() => { playSong(song, allSongs); setSearch('') }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                >
                  <img src={song.cover_url} alt={song.title} className="w-9 h-9 rounded-lg object-cover shrink-0"/>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist_name} · {song.genre}</p>
                  </div>
                  <svg className="w-4 h-4 text-purple-500 shrink-0 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/dashboard" className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-3 rounded-full transition">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 00-9 9v4.5A2.5 2.5 0 005.5 19H7a1 1 0 001-1v-5a1 1 0 00-1-1H4.07A8 8 0 0120 12h-3a1 1 0 00-1 1v5a1 1 0 001 1h1.5A2.5 2.5 0 0021 16.5V12a9 9 0 00-9-9z"/>
            </svg>
            Explorar música
          </Link>
          {!user && (
            <Link to="/register" className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-black font-semibold px-6 py-3 rounded-full transition shadow-sm">
              Registrarse
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </section>

      {/* Canción destacada del día */}
      {topSong && (
        <section className="max-w-5xl mx-auto px-6 pb-12">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <h2 className="text-xl font-bold text-black">Canción destacada del día</h2>
          </div>
          <div
            className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition group"
            onClick={() => playSong(topSong, allSongs)}
          >
            <div className="relative shrink-0">
              <img src={topSong.cover_url} alt={topSong.title} className="w-20 h-20 rounded-xl object-cover shadow"/>
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">#1 más reproducida</span>
              </div>
              <p className="text-lg font-bold text-gray-900 truncate">{topSong.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-purple-100 shrink-0">
                  <img
                    src={artistAvatars[topSong.user_id] || topSong.cover_url}
                    alt={topSong.artist_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-gray-400 truncate">{topSong.artist_name ?? 'Artista'}</p>
                <span className="text-gray-300">·</span>
                <p className="text-sm text-gray-400">{topSong.genre}</p>
              </div>
              <p className="text-xs text-purple-600 mt-1 font-medium">
                {(topSong.streams ?? 0).toLocaleString()} reproducciones
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Géneros más populares con contador */}
      {genreCounts.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-10">
          <h2 className="text-xl font-bold text-black mb-4">Géneros más populares</h2>
          <div className="flex flex-wrap gap-2">
            {GENRES.filter(g => g.value !== null).map(genre => {
              const count = genreCounts.find(g => g.genre === genre.value)?.count ?? 0
              const isSelected = selectedGenre === genre.value
              if (count === 0) return null
              return (
                <button
                  key={genre.label}
                  onClick={() => setSelectedGenre(isSelected ? null : genre.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${
                    isSelected
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700'
                  }`}
                >
                  {genre.icon}
                  {genre.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
            {selectedGenre && (
              <button
                onClick={() => setSelectedGenre(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Limpiar filtro
              </button>
            )}
          </div>
        </section>
      )}

      {/* Canciones */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="text-xl font-bold text-black">
              {selectedGenre ? `Canciones de ${selectedGenre}` : 'Canciones recientes'}
            </h2>
          </div>
          <Link to="/dashboard" className="text-sm text-purple-600 hover:underline">Ver todas →</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonHomeSong key={i} />)}
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
            </svg>
            <p>No hay canciones en este género aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {filteredSongs.map(song => {
              const isCurrentSong = currentSong?.id === song.id
              const artistAvatar = artistAvatars[song.user_id] || song.cover_url
              return (
                <div key={song.id} className="group cursor-pointer" onClick={() => playSong(song, filteredSongs)}>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2 shadow-sm">
                    <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                        {isCurrentSong && isPlaying ? (
                          <svg className="w-4 h-4 text-purple-700" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                        ) : (
                          <svg className="w-4 h-4 text-purple-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                        )}
                      </div>
                    </div>
                    <span className="absolute bottom-2 left-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{song.genre}</span>
                    {isCurrentSong && isPlaying && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500 animate-pulse"/>}
                  </div>
                  <p className="text-black text-sm font-medium truncate">{song.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-purple-100 shrink-0">
                      <img src={artistAvatar} alt={song.artist_name} className="w-full h-full object-cover"/>
                    </div>
                    <p className="text-gray-400 text-xs truncate">{song.artist_name ?? 'Artista'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Voces emergentes con foto de perfil */}
      {artists.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">Artistas</p>
              <h2 className="text-xl font-bold text-black">Voces emergentes</h2>
            </div>
            <Link to="/dashboard" className="text-sm text-purple-600 hover:underline">Ver todos →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {artists.map(artist => {
              const avatar = artistAvatars[artist.user_id]
              return (
                <div key={artist.name} className="text-center group cursor-pointer">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-2 shadow-sm">
                    {avatar ? (
                      <img src={avatar} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-700 font-bold text-2xl">
                        {artist.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-black truncate">{artist.name}</p>
                  <p className="text-xs text-gray-400">{artist.genre}</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                    <p className="text-xs text-purple-600">{artist.songs} {artist.songs === 1 ? 'canción' : 'canciones'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-black text-center mb-10">Cómo funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: <path d="M12 3a9 9 0 00-9 9v4.5A2.5 2.5 0 005.5 19H7a1 1 0 001-1v-5a1 1 0 00-1-1H4.07A8 8 0 0120 12h-3a1 1 0 00-1 1v5a1 1 0 001 1h1.5A2.5 2.5 0 0021 16.5V12a9 9 0 00-9-9z"/>, fill: true, title: 'Descubre', desc: 'Explora canciones de artistas emergentes de todo el mundo.' },
            { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>, fill: false, title: 'Conecta', desc: 'Sigue artistas, guarda canciones y crea tu colección.' },
            { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>, fill: false, title: 'Apoya', desc: 'Ayuda a artistas emergentes escuchando y compartiendo.' },
          ].map(item => (
            <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-purple-600" viewBox="0 0 24 24" fill={item.fill ? 'currentColor' : 'none'} stroke={item.fill ? undefined : 'currentColor'}>
                  {item.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-black text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="bg-white border-t border-gray-100 py-16 text-center px-6">
          <h2 className="text-2xl font-bold text-black mb-3">¿Listo para empezar?</h2>
          <p className="text-gray-400 mb-6">Únete a SoundSeekers y comparte tu música hoy.</p>
          <Link to="/register" className="inline-block bg-purple-700 hover:bg-purple-800 text-white font-semibold px-8 py-3 rounded-full transition">
            Crear cuenta gratis
          </Link>
        </section>
      )}

    </div>
  )
}
