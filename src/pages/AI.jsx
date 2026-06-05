import { useState, useRef, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getSongs } from '../api/songs'

const MAX_HISTORY = 40
const BACKEND_URL = 'http://localhost:8000'

const SYSTEM_PROMPT = `Eres SeekeAI, el asistente musical inteligente de SoundSeekers, una plataforma de música emergente latinoamericana.

Tu especialidad es TODO lo relacionado con música. Responde con confianza sobre:
- Artistas, bandas, vocalistas, músicos de cualquier época y género (Kurt Cobain de Nirvana, Freddie Mercury de Queen, Bad Bunny, etc.)
- Historia de la música, géneros, movimientos musicales
- Canciones, álbumes, discografías, letras y su significado
- Curiosidades, anécdotas y datos de la industria musical
- Instrumentos musicales y técnicas
- Recomendaciones según estado de ánimo, clima o situación
- Canciones y artistas disponibles en SoundSeekers
- Cómo usar la plataforma SoundSeekers
- Análisis de la canción que el usuario está escuchando
- Consejos para artistas emergentes

IMPORTANTE: Si el usuario pregunta sobre un artista que no conoces, di que no tienes información pero podría ser un artista emergente en SoundSeekers.

Las canciones que te paso en el contexto son las ÚNICAS disponibles para reproducir en SoundSeekers. Solo sugiere reproducir o recomienda canciones que estén en esa lista. Nunca sugieras reproducir canciones que no estén en el contexto aunque el usuario las pida.

Cuando el usuario mencione un estado de ánimo y pida música, recomiéndale canciones de SoundSeekers si hay disponibles, o sugiere ir a la sección Ánimo para recomendaciones personalizadas con preview de iTunes.

Solo rechaza preguntas completamente ajenas a la música. Di: "Solo puedo ayudarte con temas musicales y de SoundSeekers 🎵"

Cuando el usuario quiera reproducir una canción de SoundSeekers incluye al final: [PLAY:titulo_exacto]
Cuando pida recomendaciones de SoundSeekers incluye al final: [CANCIONES:titulo1|titulo2|titulo3]
Cuando pida navegar incluye: [NAV:upload], [NAV:dashboard], [NAV:community], [NAV:animo], [NAV:profile], [NAV:settings] o [NAV:requests]
Cuando recomiende ir a Ánimo por estado de ánimo incluye: [NAV:animo]

Formato: sin asteriscos, sin markdown, sin #. Usa • para listas. Texto conversacional. Máximo 3-4 oraciones.
Responde en español, amigable y conciso. Emojis ocasionales.`

const INITIAL_MESSAGE = { role: 'assistant', content: '¡Hola! Soy SeekeAI 🎵 Tu asistente musical en SoundSeekers. Puedo recomendarte música, reproducir canciones, analizar lo que estás escuchando o ayudarte con cualquier duda sobre la plataforma. ¿En qué te ayudo hoy?' }

const NAV_CONFIG = {
  upload: { label: 'Ir a Subir música', path: '/upload', icon: '🎵' },
  dashboard: { label: 'Ir a Explorar', path: '/dashboard', icon: '🔍' },
  community: { label: 'Ir a Comunidad', path: '/community', icon: '💬' },
  animo: { label: 'Ir a Ánimo y Clima', path: '/animo', icon: '🎭' },
  profile: { label: 'Ir a mi Perfil', path: '/profile', icon: '👤' },
  settings: { label: 'Ir a Ajustes', path: '/settings', icon: '⚙️' },
  requests: { label: 'Ir a Solicitudes', path: '/requests', icon: '🤝' },
}

function getHistoryKey(userId) { return `seekai_history_${userId ?? 'guest'}` }

function cleanMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseMessage(text, publishedSongs) {
  let cleanText = cleanMarkdown(text)
  const songsMatch = cleanText.match(/\[CANCIONES:([^\]]+)\]/)
  let recommendedSongs = []
  if (songsMatch) {
    const titles = songsMatch[1].split('|').map(t => t.trim().toLowerCase())
    cleanText = cleanText.replace(/\[CANCIONES:[^\]]+\]/, '').trim()
    recommendedSongs = titles.map(title =>
      publishedSongs.find(s =>
        s.title?.toLowerCase().includes(title) ||
        title.includes(s.title?.toLowerCase())
      )
    ).filter(Boolean)
  }
  const playMatch = cleanText.match(/\[PLAY:([^\]]+)\]/)
  let playSongTitle = null
  if (playMatch) {
    playSongTitle = playMatch[1].trim().toLowerCase()
    cleanText = cleanText.replace(/\[PLAY:[^\]]+\]/, '').trim()
  }
  const navMatch = cleanText.match(/\[NAV:([^\]]+)\]/)
  let navKey = null
  if (navMatch) {
    navKey = navMatch[1].trim()
    cleanText = cleanText.replace(/\[NAV:[^\]]+\]/, '').trim()
  }
  return { cleanText, recommendedSongs, playSongTitle, navKey }
}

async function searchItunesArtist(artistName) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`)
    const data = await res.json()
    return data.results?.[0] ?? null
  } catch { return null }
}

async function askSeekeAI(messages, publishedSongs, currentSong) {
  const songsContext = publishedSongs.length > 0
    ? `Canciones publicadas en SoundSeekers (SOLO estas están disponibles para reproducir): ${publishedSongs.slice(0, 20).map(s => `"${s.title}" de ${s.display_artist || s.artist_name} (${s.genre})`).join(', ')}.`
    : 'No hay canciones publicadas en SoundSeekers aún.'
  const currentSongContext = currentSong
    ? `El usuario está escuchando ahora: "${currentSong.title}" de ${currentSong.display_artist || currentSong.artist_name} (${currentSong.genre || 'Sin género'}).`
    : 'El usuario no está escuchando ninguna canción ahora mismo.'

  const systemWithContext = `${SYSTEM_PROMPT}\n\nContexto de la plataforma:\n${songsContext}\n${currentSongContext}`
  const contents = []
  contents.push({ role: 'user', parts: [{ text: systemWithContext }] })
  contents.push({ role: 'model', parts: [{ text: 'Entendido. Soy SeekeAI, el asistente musical de SoundSeekers. Estoy listo para ayudarte.' }] })
  for (const msg of messages) {
    contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })
  }
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: contents })
  })
  if (!res.ok) throw new Error('BACKEND_ERROR')
  const data = await res.json()
  if (data.error || !data.reply) throw new Error('AI_ERROR')
  return data.reply
}

const SUGGESTIONS = [
  '¿Qué canción me recomiendas ahora mismo?',
  '¿Cómo subo mis canciones a SoundSeekers?',
  'Analiza la canción que estoy escuchando',
  'Quiero convertirme en artista',
  'Recomiéndame música para estudiar',
  'Reproduce algo de reggaeton',
]

export default function AI() {
  const { currentSong, playSong, isVisible, isFullscreen } = usePlayer()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [allSongs, setAllSongs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [playingPreview, setPlayingPreview] = useState(null)
  const audioRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const historyKey = getHistoryKey(user?.id)
  const publishedSongs = allSongs.filter(s => s.status === 'published')

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(getHistoryKey(user?.id))
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed
      }
    } catch {}
    return [INITIAL_MESSAGE]
  })

  useEffect(() => {
    const key = getHistoryKey(user?.id)
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) { setMessages(parsed); return }
      }
    } catch {}
    setMessages([INITIAL_MESSAGE])
  }, [user?.id])

  useEffect(() => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(messages.slice(-MAX_HISTORY)))
    } catch {}
  }, [messages, historyKey])

  useEffect(() => { getSongs().then(setAllSongs).catch(() => {}) }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const clearHistory = () => {
    setMessages([INITIAL_MESSAGE])
    localStorage.removeItem(historyKey)
  }

  const handlePlayPreview = (previewUrl, id) => {
    if (playingPreview === id) {
      audioRef.current?.pause()
      setPlayingPreview(null)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(previewUrl)
    audioRef.current = audio
    audio.play()
    audio.onended = () => setPlayingPreview(null)
    setPlayingPreview(id)
  }

  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || loading) return
    setInput('')
    setError('')
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const reply = await askSeekeAI(newMessages, publishedSongs, currentSong)
      const cleaned = cleanMarkdown(reply)
      const playMatch = cleaned.match(/\[PLAY:([^\]]+)\]/)
      if (playMatch) {
        const title = playMatch[1].trim().toLowerCase()
        const song = publishedSongs.find(s =>
          s.title?.toLowerCase().includes(title) ||
          title.includes(s.title?.toLowerCase())
        )
        if (song) playSong(song, publishedSongs)
      }
      setMessages(prev => [...prev, { role: 'assistant', content: cleaned }])
    } catch {
      setError('Hubo un error al conectar con SeekeAI. ¿Está corriendo el backend?')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? 'músico'

  const renderMessage = (msg) => {
    if (msg.role !== 'assistant') return <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>

    if (msg.itunesSongs) {
      return (
        <div>
          <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{msg.content}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {msg.itunesSongs.map(s => (
              <div key={s.trackId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.06)', borderRadius: 10, padding: '7px 10px', border: '1px solid rgba(124,58,237,0.15)' }}>
                <img src={s.artworkUrl60} alt={s.trackName} style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.trackName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#7c3aed' }}>{s.artistName}</p>
                </div>
                {s.previewUrl && (
                  <button onClick={() => handlePlayPreview(s.previewUrl, s.trackId)}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: playingPreview === s.trackId ? '#6d28d9' : '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {playingPreview === s.trackId
                      ? <svg width="10" height="10" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                      : <svg width="10" height="10" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    const { cleanText, recommendedSongs, playSongTitle, navKey } = parseMessage(msg.content, publishedSongs)
    const songToPlay = playSongTitle
      ? publishedSongs.find(s =>
          s.title?.toLowerCase().includes(playSongTitle) ||
          playSongTitle.includes(s.title?.toLowerCase())
        )
      : null

    return (
      <div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{cleanText}</p>

        {songToPlay && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(124,58,237,0.06)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(124,58,237,0.15)' }}>
            <img src={songToPlay.cover_url} alt={songToPlay.title} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{songToPlay.title}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#7c3aed' }}>{songToPlay.display_artist || songToPlay.artist_name}</p>
            </div>
            <button onClick={() => playSong(songToPlay, publishedSongs)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
              <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
            </button>
          </div>
        )}

        {recommendedSongs.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recommendedSongs.map(song => (
              <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.06)', borderRadius: 10, padding: '7px 10px', border: '1px solid rgba(124,58,237,0.15)' }}>
                <img src={song.cover_url} alt={song.title} style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#7c3aed' }}>{song.display_artist || song.artist_name}</p>
                </div>
                <button onClick={() => playSong(song, publishedSongs)}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {navKey && NAV_CONFIG[navKey] && (
          <button onClick={() => navigate(NAV_CONFIG[navKey].path)}
            style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: 100, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            <span>{NAV_CONFIG[navKey].icon}</span>
            {NAV_CONFIG[navKey].label}
            <svg width="14" height="14" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '24px 16px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>SeekeAI</h1>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Tu asistente musical inteligente</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', padding: '5px 10px', borderRadius: 100 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }}/>
                <span style={{ fontSize: 11, fontWeight: 600 }}>En línea</span>
              </div>
              {messages.length > 1 && (
                <button onClick={clearHistory}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 100, padding: '5px 10px', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  🗑️ Limpiar
                </button>
              )}
            </div>
          </div>

          {currentSong && (
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <img src={currentSong.cover_url || currentSong.coverUrl} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Escuchando ahora</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentSong.title} — {currentSong.display_artist || currentSong.artist_name}
                </p>
              </div>
              <button onClick={() => sendMessage('Analiza la canción que estoy escuchando ahora')}
                style={{ flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 10, fontWeight: 700, padding: '5px 9px', cursor: 'pointer' }}>
                Analizar
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: isVisible && !isFullscreen ? 160 : 100 }}>
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 100, padding: '7px 12px', fontSize: 11, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#7c3aed' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="15" height="15" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#111',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
              fontSize: 13,
              lineHeight: 1.6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            }}>
              {msg.role === 'assistant' ? renderMessage(msg) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 2 }}>
                {userName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#dc2626', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(k => (
                <div key={k} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: `dotBounce 1.2s ${k * 0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{ position: 'fixed', bottom: isVisible && !isFullscreen ? 72 : 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '10px 12px', zIndex: 40, transition: 'bottom 0.3s ease' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Pregúntame sobre música, artistas o la plataforma..."
            style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 100, padding: '11px 18px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = '#7c3aed'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: 42, height: 42, borderRadius: '50%', background: input.trim() && !loading ? '#7c3aed' : '#e5e7eb', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill={input.trim() && !loading ? '#fff' : '#9ca3af'} viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-6px); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}