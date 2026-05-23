import { useState } from 'react'
import { usePlayer } from '../context/PlayerContext'

const moods = [
  { id: 'happy', label: 'Feliz', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { id: 'sad', label: 'Triste', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { id: 'energetic', label: 'Energético', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> },
  { id: 'calm', label: 'Calmado', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg> },
  { id: 'nostalgic', label: 'Nostálgico', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
  { id: 'focused', label: 'Concentrado', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636-6.364l.707.707M12 21v-1m0-16a7 7 0 017 7c0 2.5-1.5 4.5-3 6H8c-1.5-1.5-3-3.5-3-6a7 7 0 017-7z"/></svg> },
]

const weathers = [
  { id: 'sunny', label: 'Soleado', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
  { id: 'rainy', label: 'Lluvioso', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg> },
  { id: 'cloudy', label: 'Nublado', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg> },
  { id: 'night', label: 'Noche', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg> },
  { id: 'cold', label: 'Frío', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364"/></svg> },
  { id: 'warm', label: 'Cálido', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
]

const MOOD_LABELS = { happy: 'Feliz', sad: 'Triste', energetic: 'Energético', calm: 'Calmado', nostalgic: 'Nostálgico', focused: 'Concentrado' }
const WEATHER_LABELS = { sunny: 'Soleado', rainy: 'Lluvioso', cloudy: 'Nublado', night: 'Noche', cold: 'Frío', warm: 'Cálido' }

function toPlayerSong(song) {
  return {
    id: song.externalUrl || song.previewUrl,
    title: song.title,
    artist_name: song.artist,
    display_artist: song.artist,
    cover_url: song.coverUrl,
    audio_url: null,
    previewUrl: song.previewUrl,
    genre: song.genre || null,
    isSpotify: true, // reutilizamos el flag para que el reproductor maneje el preview
  }
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Animo() {
  const { playSong, currentSong, isPlaying } = usePlayer()
  const [selectedMood, setSelectedMood] = useState(null)
  const [selectedWeather, setSelectedWeather] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleGetRecommendations = async () => {
    if (!selectedMood || !selectedWeather) return
    setLoading(true)
    setError('')
    setSearched(true)
    setSongs([])
    try {
      const res = await fetch(`http://localhost:8000/recommendations?mood=${selectedMood}&weather=${selectedWeather}`)
      if (!res.ok) throw new Error('Error en el servidor')
      const data = await res.json()
      setSongs(data.songs ?? [])
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las recomendaciones. ¿Está corriendo el backend?')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (song) => {
    const queue = songs.map(toPlayerSong)
    playSong(toPlayerSong(song), queue)
  }

  const isCurrentSong = (song) => {
    const id = song.externalUrl || song.previewUrl
    return currentSong?.id === id
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-xs font-semibold tracking-widest text-purple-600 uppercase mb-3">Descubrimiento Personalizado</p>
        <h1 className="text-4xl font-black text-gray-900 mb-4">
          Ánimo y Clima <span className="text-purple-600">Mixtape</span>
        </h1>
        <p className="text-gray-400 text-base max-w-md mx-auto">
          Cuéntanos cómo te sientes y cómo está el cielo. Te crearemos la banda sonora perfecta.
        </p>
      </section>

      {/* Selector de ánimo */}
      <section className="max-w-3xl mx-auto px-6 pb-8">
        <h2 className="text-base font-bold text-gray-900 mb-4 text-center">¿Cómo te sientes?</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {moods.map(mood => (
            <button key={mood.id} onClick={() => setSelectedMood(mood.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                selectedMood === mood.id
                  ? 'bg-purple-50 border-purple-400 text-purple-700'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-600'
              }`}>
              {mood.icon}
              <span className="text-xs font-medium">{mood.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Selector de clima */}
      <section className="max-w-3xl mx-auto px-6 pb-10">
        <h2 className="text-base font-bold text-gray-900 mb-4 text-center">¿Cómo está el clima?</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {weathers.map(w => (
            <button key={w.id} onClick={() => setSelectedWeather(w.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                selectedWeather === w.id
                  ? 'bg-orange-50 border-orange-400 text-orange-600'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500'
              }`}>
              {w.icon}
              <span className="text-xs font-medium">{w.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Botón generar */}
      <div className="max-w-3xl mx-auto px-6 pb-10 flex justify-center">
        <button
          onClick={handleGetRecommendations}
          disabled={!selectedMood || !selectedWeather || loading}
          className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-full transition shadow-md"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Buscando canciones...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
              Crear mi Mixtape
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto px-6 pb-6">
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 text-center">{error}</div>
        </div>
      )}

      {/* Resultados */}
      {searched && !loading && songs.length > 0 && (
        <section className="max-w-3xl mx-auto px-6">
          {/* Banner */}
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                Tu Mixtape — {MOOD_LABELS[selectedMood]} + {WEATHER_LABELS[selectedWeather]}
              </p>
              <p className="text-xs text-gray-400">Previews de 30 segundos vía iTunes · Toca para escuchar</p>
            </div>
            <button
              onClick={() => handlePlay(songs[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition shrink-0"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
              Reproducir todo
            </button>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-4">Canciones Recomendadas</h2>
          <div className="flex flex-col gap-3">
            {songs.map((song, i) => {
              const active = isCurrentSong(song)
              return (
                <div
                  key={i}
                  onClick={() => handlePlay(song)}
                  className={`flex items-center gap-4 p-3 rounded-xl bg-white border shadow-sm hover:shadow-md transition cursor-pointer group ${
                    active ? 'border-purple-300 bg-purple-50' : 'border-gray-100 hover:border-purple-200'
                  }`}
                >
                  {/* Número / animación */}
                  <div className="w-8 text-center shrink-0">
                    {active && isPlaying ? (
                      <div className="flex gap-0.5 items-end justify-center h-4">
                        {[60, 100, 40].map((h, k) => (
                          <span key={k} style={{ height: `${h}%`, animationDelay: `${k * 0.2}s` }}
                            className="w-0.5 bg-purple-600 rounded-full animate-pulse"/>
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400 group-hover:hidden">{i + 1}</span>
                        <svg className="w-4 h-4 text-purple-600 hidden group-hover:block mx-auto" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 3l14 9-14 9V3z"/>
                        </svg>
                      </>
                    )}
                  </div>

                  {/* Portada */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    {song.coverUrl
                      ? <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${active ? 'text-purple-700' : 'text-gray-900'}`}>
                      {song.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                    {song.genre && <p className="text-xs text-gray-300 truncate">{song.genre}</p>}
                  </div>

                  {/* Duración + link iTunes */}
                  <div className="flex items-center gap-3 shrink-0">
                    {song.duration > 0 && (
                      <span className="text-xs text-gray-400">{formatDuration(song.duration)}</span>
                    )}
                    {song.externalUrl && (
                      <a
                        href={song.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-semibold transition"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        iTunes
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Sin resultados */}
      {searched && !loading && songs.length === 0 && !error && (
        <div className="max-w-3xl mx-auto px-6 text-center py-10 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
          </svg>
          <p>No se encontraron canciones para esta combinación. Intenta de nuevo.</p>
        </div>
      )}
    </div>
  )
}
