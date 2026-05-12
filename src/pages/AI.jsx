import { useState, useRef, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { getSongs } from '../api/songs'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

const SYSTEM_PROMPT = `Eres SoundAI, el asistente musical inteligente de SoundSeekers, una plataforma de descubrimiento musical para artistas emergentes latinoamericanos.

Puedes ayudar con:
- Recomendar canciones y artistas de la plataforma
- Analizar la canción que el usuario está escuchando en este momento
- Responder preguntas sobre la plataforma (cómo subir canciones, cómo seguir artistas, etc.)
- Dar recomendaciones musicales personalizadas según el estado de ánimo
- Hablar sobre géneros musicales, artistas emergentes y tendencias

Responde siempre en español, de forma amigable, concisa y con personalidad musical. Usa emojis ocasionalmente para dar vida a las respuestas. No uses markdown con asteriscos, escribe en texto plano.`

async function askGemini(messages, songs, currentSong) {
  const songsContext = songs.length > 0
    ? `Canciones disponibles en SoundSeekers: ${songs.slice(0, 20).map(s => `"${s.title}" de ${s.display_artist || s.artist_name} (${s.genre})`).join(', ')}.`
    : ''

  const currentSongContext = currentSong
    ? `El usuario está escuchando ahora: "${currentSong.title}" de ${currentSong.display_artist || currentSong.artist_name} (${currentSong.genre || 'Sin género'}).`
    : 'El usuario no está escuchando ninguna canción ahora mismo.'

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${songsContext}\n${currentSongContext}\n\nConversación:\n${messages.map(m => `${m.role === 'user' ? 'Usuario' : 'SoundAI'}: ${m.content}`).join('\n')}\nSoundAI:`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    }
  )
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Lo siento, no pude generar una respuesta.'
}

const SUGGESTIONS = [
  '¿Qué canción me recomiendas según mi estado de ánimo?',
  '¿Cómo puedo subir mis canciones a SoundSeekers?',
  'Analiza la canción que estoy escuchando',
  '¿Cuáles son los artistas más populares de la plataforma?',
  'Recomiéndame música para estudiar',
]

export default function AI() {
  const { currentSong } = usePlayer()
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy SoundAI 🎵 Tu asistente musical en SoundSeekers. Puedo recomendarte música, analizar lo que estás escuchando o ayudarte con cualquier duda sobre la plataforma. ¿En qué te ayudo hoy?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [songs, setSongs] = useState([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    getSongs().then(setSongs).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || loading) return
    setInput('')
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const reply = await askGemini(newMessages, songs, currentSong)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al conectar con el asistente. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? 'músico'

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '32px 24px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              🎵
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>SoundAI</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Tu asistente musical inteligente</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 100 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }}/>
              <span style={{ fontSize: 12, fontWeight: 600 }}>En línea</span>
            </div>
          </div>

          {/* Canción actual */}
          {currentSong && (
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <img src={currentSong.cover_url || currentSong.coverUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}/>
              <div style={{ minWidth: 0 }}>
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
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 100, padding: '8px 14px', fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
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
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, marginTop: 2 }}>
                🎵
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
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 2 }}>
                {userName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🎵</div>
            <div style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(k => (
                <div key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', animation: `dotBounce 1.2s ${k * 0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input fijo abajo */}
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
