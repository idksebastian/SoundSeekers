import { useEffect, useState } from 'react'
import { getSongs } from '../api/songs'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import SkeletonHomeSong from '../components/SkeletonHomeSong'
import { supabase } from '../lib/supabase'

const GENRES = [
  {
    label: 'Todos', value: null,
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
  },
  {
    label: 'Indie', value: 'Indie',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
  },
  {
    label: 'Electrónica', value: 'Electrónica',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
  },
  {
    label: 'Folk', value: 'Folk',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18v-6a9 9 0 0118 0v6"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>
  },
  {
    label: 'Hip-Hop', value: 'Hip-Hop',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
  },
  {
    label: 'Champeta', value: 'Champeta',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>
  },
  {
    label: 'Jazz', value: 'Jazz',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
  },
  {
    label: 'Pop', value: 'Pop',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
  },
]

export default function Home() {
  const { user } = useAuth()
  const { playSong, currentSong, isPlaying } = usePlayer()
  const [recentSongs, setRecentSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [artists, setArtists] = useState([])
  const [stats, setStats] = useState({ songs: 0, users: 0, genres: 0 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSongs()
        setAllSongs(data)
        setRecentSongs(data.slice(0, 6))

        const { count: songCount } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })

        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        const uniqueGenres = [...new Set(data.map(s => s.genre).filter(Boolean))]

        setStats({
          songs: songCount ?? data.length,
          users: userCount ?? 0,
          genres: uniqueGenres.length,
        })

        const artistMap = {}
        data.forEach(song => {
          if (song.artist_name && !artistMap[song.artist_name]) {
            artistMap[song.artist_name] = {
              name: song.artist_name,
              cover: song.cover_url,
              genre: song.genre,
              songs: 1,
            }
          } else if (song.artist_name) {
            artistMap[song.artist_name].songs++
          }
        })
        setArtists(Object.values(artistMap).slice(0, 6))

      } catch (err) {
        console.error('Error cargando home:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredSongs = selectedGenre
    ? allSongs.filter(s => s.genre === selectedGenre).slice(0, 6)
    : recentSongs

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
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
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/dashboard"
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-3 rounded-full transition">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 00-9 9v4.5A2.5 2.5 0 005.5 19H7a1 1 0 001-1v-5a1 1 0 00-1-1H4.07A8 8 0 0120 12h-3a1 1 0 00-1 1v5a1 1 0 001 1h1.5A2.5 2.5 0 0021 16.5V12a9 9 0 00-9-9z"/>
            </svg>
            Explorar música
          </Link>
          {!user && (
            <Link to="/register"
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-black font-semibold px-6 py-3 rounded-full transition shadow-sm">
              Registrarse
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </section>

      {/* Estadísticas */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
            <div className="flex justify-center mb-2">
              <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
              </svg>
            </div>
            <p className="text-3xl font-black text-purple-700">{stats.songs}+</p>
            <p className="text-sm text-gray-400 mt-1">Canciones</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
            <div className="flex justify-center mb-2">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p className="text-3xl font-black text-purple-700">{stats.users}+</p>
            <p className="text-sm text-gray-400 mt-1">Artistas</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
            <div className="flex justify-center mb-2">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
              </svg>
            </div>
            <p className="text-3xl font-black text-purple-700">{stats.genres}</p>
            <p className="text-sm text-gray-400 mt-1">Géneros</p>
          </div>
        </div>
      </section>

      {/* Géneros */}
      <section className="max-w-5xl mx-auto px-6 pb-10">
        <h2 className="text-xl font-bold text-black mb-4">Explorar por género</h2>
        <div className="flex flex-wrap gap-2">
          {GENRES.map(genre => (
            <button
              key={genre.label}
              onClick={() => setSelectedGenre(genre.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition border ${
                selectedGenre === genre.value
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700'
              }`}
            >
              {genre.icon}
              {genre.label}
            </button>
          ))}
        </div>
      </section>

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
          <Link to="/dashboard" className="text-sm text-purple-600 hover:underline">
            Ver todas →
          </Link>
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
              return (
                <div
                  key={song.id}
                  className="group cursor-pointer"
                  onClick={() => playSong(song, filteredSongs)}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2 shadow-sm">
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                        {isCurrentSong && isPlaying ? (
                          <svg className="w-4 h-4 text-purple-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-purple-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 3l14 9-14 9V3z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="absolute bottom-2 left-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {song.genre}
                    </span>
                    {isCurrentSong && isPlaying && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-black text-sm font-medium truncate">{song.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <p className="text-gray-400 text-xs truncate">{song.artist_name ?? 'Artista'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Artistas emergentes */}
      {artists.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">Artistas</p>
              <h2 className="text-xl font-bold text-black">Voces emergentes</h2>
            </div>
            <Link to="/dashboard" className="text-sm text-purple-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {artists.map(artist => (
              <div key={artist.name} className="text-center group cursor-pointer">
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-2 shadow-sm">
                  <img
                    src={artist.cover}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
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
            ))}
          </div>
        </section>
      )}

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-black text-center mb-10">Cómo funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a9 9 0 00-9 9v4.5A2.5 2.5 0 005.5 19H7a1 1 0 001-1v-5a1 1 0 00-1-1H4.07A8 8 0 0120 12h-3a1 1 0 00-1 1v5a1 1 0 001 1h1.5A2.5 2.5 0 0021 16.5V12a9 9 0 00-9-9z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-black text-lg mb-2">Descubre</h3>
            <p className="text-gray-400 text-sm">Explora canciones de artistas emergentes de todo el mundo.</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <h3 className="font-semibold text-black text-lg mb-2">Conecta</h3>
            <p className="text-gray-400 text-sm">Sigue artistas, guarda canciones y crea tu colección.</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="font-semibold text-black text-lg mb-2">Apoya</h3>
            <p className="text-gray-400 text-sm">Ayuda a artistas emergentes escuchando y compartiendo.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="bg-white border-t border-gray-100 py-16 text-center px-6">
          <h2 className="text-2xl font-bold text-black mb-3">¿Listo para empezar?</h2>
          <p className="text-gray-400 mb-6">Únete a SoundSeekers y comparte tu música hoy.</p>
          <Link to="/register"
            className="inline-block bg-purple-700 hover:bg-purple-800 text-white font-semibold px-8 py-3 rounded-full transition">
            Crear cuenta gratis
          </Link>
        </section>
      )}

    </div>
  )
}
