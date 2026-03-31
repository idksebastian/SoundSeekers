import { useEffect, useState } from 'react'
import { getSongs } from '../api/songs'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const [recentSongs, setRecentSongs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSongs().then(data => {
      setRecentSongs(data.slice(0, 6))
      setLoading(false)
    })
  }, [])

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

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="text-xl font-bold text-black">Canciones recientes</h2>
          </div>
          <Link to="/dashboard" className="text-sm text-purple-600 hover:underline">
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <svg className="w-7 h-7 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : recentSongs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>Aún no hay canciones. ¡Sé el primero en subir una!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentSongs.map(song => (
              <div key={song.id} className="group cursor-pointer">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2 shadow-sm">
                  <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                      <svg className="w-4 h-4 text-purple-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 3l14 9-14 9V3z" />
                      </svg>
                    </div>
                  </div>
                  <span className="absolute bottom-2 left-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {song.genre}
                  </span>
                </div>
                <p className="text-black text-sm font-medium truncate">{song.title}</p>
                <p className="text-gray-400 text-xs truncate">🎤 {song.artist_name ?? 'Artista'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

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