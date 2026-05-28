import { useState, useRef, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { getSongs } from '../api/songs'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const HISTORY_KEY = 'seekai_history'
const MAX_HISTORY = 40 // máximo de mensajes a guardar

const SYSTEM_PROMPT = `Eres SeekeAI, el asistente musical inteligente de SoundSeekers, una plataforma de descubrimiento musical para artistas emergentes latinoamericanos.

Puedes ayudar con:
- Recomendar canciones y artistas de la plataforma según el gusto del usuario
- Reproducir canciones de la plataforma cuando el usuario lo pida
- Analizar la canción que el usuario está escuchando en este momento
- Responder preguntas sobre la plataforma (cómo subir canciones, cómo seguir artistas, cómo crear playlists, etc.)
- Dar recomendaciones musicales personalizadas según el estado de ánimo o clima
- Hablar sobre géneros musicales latinoamericanos, artistas emergentes y tendencias
- Ayudar a artistas con consejos sobre cómo crecer en la plataforma

IMPORTANTE - Cuando recomiendes o menciones canciones específicas de la plataforma, SIEMPRE incluye al final de tu mensaje una sección especial con este formato exacto:
[CANCIONES:título1|título2|título3]

Por ejemplo: Si recomiendas "Nicolas" y "PRUEBAA", escribe al final: [CANCIONES:Nicolas|PRUEBAA]
Solo incluye canciones que existen en la plataforma. Si no recomiendas canciones específicas, no incluyas esa sección.

Responde siempre en español, de forma amigable, concisa y con personalidad musical. Usa emojis ocasionalmente. Escribe en texto plano sin asteriscos ni markdown.`

const INITIAL_MESSAGE = { role: 'assistant', content: '¡Hola! Soy SeekeAI 🎵 Tu asistente musical en SoundSeekers. Puedo recomendarte música, reproducir canciones, analizar lo que estás escuchando o ayudarte con cualquier duda sobre la plataforma. ¿En qué te ayudo hoy?' }

// Parsear canciones del mensaje de la IA
function parseSongRecommendations(text, allSongs) {
  const match = text.match(/\[CANCIONES:([^\]]+)\]/)
  if (!match) return { cleanText: text, recommendedSongs: [] }

  const titles = match[1].split('|').map(t => t.trim().toLowerCase())
  const cleanText = text.replace(/\[CANCIONES:[^\]]+\]/, '').trim()

  const recommendedSongs = titles
    .map(title => allSongs.find(s =>
      s.title?.toLowerCase().includes(title) ||
      title.includes(s.title?.toLowerCase())
    ))
    .filter(Boolean)

  return { cleanText, recommendedSongs }
}

async function askGemini(messages, songs, currentSong) {
  const songsContext = songs.length > 0
    ? `Canciones disponibles en SoundSeekers: ${songs.slice(0, 20).map(s => `"${s.title}" de ${s.display_artist || s.artist_name} (${s.genre})`).join(', ')}.`
    : ''

  const currentSongContext = currentSong
    ? `El usuario está escuchando ahora: "${currentSong.title}" de ${currentSong.display_artist || currentSong.artist_name} (${currentSong.genre || 'Sin género'}).`
    : 'El usuario no está escuchando ninguna canción ahora mismo.'

  const systemWithContext = `${SYSTEM_PROMPT}\n\nContexto de la plataforma:\n${songsContext}\n${currentSongContext}`

  const contents = []
  contents.push({ role: 'user', parts: [{ text: systemWithContext }] })
  contents.push({ role: 'model', parts: [{ text: 'Entendido. Soy SeekeAI, el asistente musical de SoundSeekers. Estoy listo para ayudarte.' }] })

  for (const msg of messages) {
    const role = msg.role === 'user' ? 'user' : 'model'
    contents.push({ role, parts: [{ text: msg.content }] })
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('RATE_LIMIT')
    throw new Error(err?.error?.message || 'API_ERROR')
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('EMPTY_RESPONSE')
  return text
}

const SUGGESTIONS = [
  '¿Qué canción me recomiendas ahora mismo?',
  '¿Cómo subo mis canciones a SoundSeekers?',
  'Analiza la canción que estoy escuchando',
  '¿Cuáles son los artistas más populares?',
  'Recomiéndame música para estudiar',
  'Reproduce algo de reggaeton',
]

export default function AI() {
  const { currentSong, playSong } = usePlayer()
  const { user } = useAuth()
  const [songs, setSongs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Cargar historial desde localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed
      }
    } catch {}
    return [INITIAL_MESSAGE]
  })

  // Guardar historial en localStorage cuando cambia
  useEffect(() => {
    try {
      const toSave = messages.slice(-MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave))
    } catch {}
  }, [messages])

  useEffect(() => {
    getSongs().then(setSongs).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const clearHistory = () => {
    setMessages([INITIAL_MESSAGE])
    localStorage.removeItem(HISTORY_KEY)
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
      const reply = await askGemini(newMessages, songs, currentSong)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        setError('Demasiadas preguntas seguidas. Espera unos segundos 🙏')
      } else {
        setError('Hubo un error al conectar con SeekeAI. Intenta de nuevo.')
      }
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handlePlaySong = (song) => {
    playSong(song, songs)
  }

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? 'músico'

  // Renderizar mensaje con botones de reproducción
  const renderMessage = (msg) => {
    if (msg.role !== 'assistant') return msg.content

    const { cleanText, recommendedSongs } = parseSongRecommendations(msg.content, songs)

    return (
      <div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{cleanText}</p>
        {recommendedSongs.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recommendedSongs.map(song => (
              <div key={song.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(124,58,237,0.06)', borderRadius: 10,
                padding: '7px 10px', border: '1px solid rgba(124,58,237,0.15)'
              }}>
                <img src={song.cover_url} alt={song.title}
                  style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {song.title}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#7c3aed' }}>
                    {song.display_artist || song.artist_name}
                  </p>
                </div>
                <button onClick={() => handlePlaySong(song)}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" fill="white" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '32px 24px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="26" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>SeekeAI</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Tu asistente musical inteligente</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 100 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }}/>
                <span style={{ fontSize: 12, fontWeight: 600 }}>En línea</span>
              </div>
              {messages.length > 1 && (
                <button onClick={clearHistory}
                  title="Borrar historial"
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 100, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  🗑️ Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Canción actual */}
          {currentSong && (
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <img src={currentSong.cover_url || currentSong.coverUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Escuchando ahora</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentSong.title} — {currentSong.display_artist || currentSong.artist_name}
                </p>
              </div>
              <button onClick={() => sendMessage('Analiza la canción que estoy escuchando ahora')}
                style={{ flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 10px', cursor: 'pointer' }}>
                Analizar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 120 }}>

        {/* Sugerencias iniciales */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 100, padding: '8px 14px', fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#7c3aed' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Mensajes */}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: '75%',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#111',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '12px 16px',
              fontSize: 14,
              lineHeight: 1.6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            }}>
              {msg.role === 'assistant' ? renderMessage(msg) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 2 }}>
                {userName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        ))}

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(k => (
                <div key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', animation: `dotBounce 1.2s ${k * 0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input fijo */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 16px', zIndex: 40 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Pregúntame sobre música, artistas o la plataforma..."
            style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 100, padding: '12px 20px', fontSize: 14, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = '#7c3aed'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: 46, height: 46, borderRadius: '50%', background: input.trim() && !loading ? '#7c3aed' : '#e5e7eb', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
            <svg width="18" height="18" fill={input.trim() && !loading ? '#fff' : '#9ca3af'} viewBox="0 0 24 24">
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
