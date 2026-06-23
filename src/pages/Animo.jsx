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
  return { id: song.externalUrl || song.previewUrl, title: song.title, artist_name: song.artist, display_artist: song.artist, cover_url: song.coverUrl, audio_url: null, previewUrl: song.previewUrl, genre: song.genre || null, isSpotify: true }
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
    setLoading(true); setError(''); setSearched(true); setSongs([])
    try {
      const res = await fetch(`https://soundseekers.onrender.com/recommendations?mood=${selectedMood}&weather=${selectedWeather}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSongs(data.songs ?? [])
    } catch { setError('No se pudieron cargar las recomendaciones. ¿Está corriendo el backend?') }
    finally { setLoading(false) }
  }

  const handlePlay = (song) => playSong(toPlayerSong(song), songs.map(toPlayerSong))
  const isCurrentSong = (song) => currentSong?.id === (song.externalUrl || song.previewUrl)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '8rem' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .mood-btn:hover { transform: translateY(-2px); }
      `}</style>

      {/* Header — igual que Explorar y Comunidad */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '2rem 1rem 4.5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', margin: '0 0 8px' }}>Descubrimiento Personalizado</p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff', margin: '0 0 6px', letterSpacing: '0.02em' }}>Mixtape</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0, maxWidth: '400px' }}>
            Cuéntanos cómo te sientes y cómo está el cielo. Te crearemos tu mixtape perfecto.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '-28px auto 0', padding: '0 1rem' }}>

        {/* Card selectores */}
        <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '20px', marginBottom: '16px' }}>

          <p style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>¿Cómo te sientes?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {moods.map(mood => (
              <button key={mood.id} className="mood-btn" onClick={() => setSelectedMood(mood.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '14px', border: `1.5px solid ${selectedMood === mood.id ? '#7c3aed' : '#e5e7eb'}`, background: selectedMood === mood.id ? '#f5f3ff' : '#fff', color: selectedMood === mood.id ? '#7c3aed' : '#9ca3af', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {mood.icon}
                <span style={{ fontSize: '11px', fontWeight: '600' }}>{mood.label}</span>
              </button>
            ))}
          </div>

          <p style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>¿Cómo está el clima?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {weathers.map(w => (
              <button key={w.id} className="mood-btn" onClick={() => setSelectedWeather(w.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '14px', border: `1.5px solid ${selectedWeather === w.id ? '#f59e0b' : '#e5e7eb'}`, background: selectedWeather === w.id ? '#fffbeb' : '#fff', color: selectedWeather === w.id ? '#d97706' : '#9ca3af', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {w.icon}
                <span style={{ fontSize: '11px', fontWeight: '600' }}>{w.label}</span>
              </button>
            ))}
          </div>

          <button onClick={handleGetRecommendations} disabled={!selectedMood || !selectedWeather || loading}
            style={{ width: '100%', padding: '14px', borderRadius: '14px', background: selectedMood && selectedWeather && !loading ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#e5e7eb', color: selectedMood && selectedWeather && !loading ? '#fff' : '#9ca3af', border: 'none', cursor: selectedMood && selectedWeather && !loading ? 'pointer' : 'default', fontSize: '15px', fontWeight: '700', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? (
              <><svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Buscando canciones...</>
            ) : (
              <><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>Crear mi Mixtape</>
            )}
          </button>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px', borderRadius: '14px', padding: '12px 16px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

        {searched && !loading && songs.length > 0 && (
          <div>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#111', margin: '0 0 2px' }}>Tu Mixtape — {MOOD_LABELS[selectedMood]} + {WEATHER_LABELS[selectedWeather]}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Previews de 30s vía iTunes · Toca para escuchar</p>
              </div>
              <button onClick={() => handlePlay(songs[0])}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                <svg width="10" height="10" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>Play todo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {songs.map((song, i) => {
                const active = isCurrentSong(song)
                return (
                  <div key={i} onClick={() => handlePlay(song)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s', background: active ? '#f5f3ff' : '#fff', border: `1px solid ${active ? '#c4b5fd' : '#f0f0f0'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <span style={{ width: '20px', fontSize: '12px', color: active ? '#7c3aed' : '#9ca3af', textAlign: 'center', flexShrink: 0, fontWeight: '700' }}>
                      {active && isPlaying ? <svg width="12" height="12" fill="#7c3aed" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> : i + 1}
                    </span>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6' }}>
                      {song.coverUrl ? <img src={song.coverUrl} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" fill="#9ca3af" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: active ? '#7c3aed' : '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {song.duration > 0 && <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDuration(song.duration)}</span>}
                      {song.externalUrl && (
                        <a href={song.externalUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>iTunes</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {searched && !loading && songs.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
            <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
            <p style={{ margin: 0 }}>No se encontraron canciones para esta combinación.</p>
          </div>
        )}
      </div>
    </div>
  )
}