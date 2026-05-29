import { useState, useRef, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { getSongs } from '../api/songs'

const BACKEND_URL = 'http://localhost:8000'

const SYSTEM_PROMPT = `Eres SeekeAI, el asistente musical inteligente de SoundSeekers, una plataforma de descubrimiento musical para artistas emergentes latinoamericanos.

Puedes ayudar con:
- Recomendar canciones y artistas de la plataforma
- Analizar la canción que el usuario está escuchando ahora mismo
- Responder preguntas sobre la plataforma (cómo subir canciones, cómo seguir artistas, cómo crear playlists, etc.)
- Dar recomendaciones musicales personalizadas según el estado de ánimo
- Hablar sobre géneros musicales latinoamericanos y tendencias

Responde siempre en español, de forma amigable, concisa (máximo 3 párrafos cortos) y con personalidad musical. Usa emojis ocasionalmente. Escribe en texto plano sin asteriscos ni markdown.`

async function askSeekeAI(messages, songs, currentSong) {
  const songsContext = songs.length > 0
    ? `Canciones en SoundSeekers: ${songs.slice(0, 15).map(s => `"${s.title}" de ${s.display_artist || s.artist_name} (${s.genre})`).join(', ')}.`
    : ''

  const currentSongContext = currentSong
    ? `El usuario está escuchando: "${currentSong.title}" de ${currentSong.display_artist || currentSong.artist_name}.`
    : ''

  const systemWithContext = `${SYSTEM_PROMPT}\n\nContexto:\n${songsContext}\n${currentSongContext}`

  const contents = []
  contents.push({ role: 'user', parts: [{ text: systemWithContext }] })
  contents.push({ role: 'model', parts: [{ text: 'Entendido. Soy SeekeAI, listo para ayudarte con música.' }] })

  for (const msg of messages) {
    const role = msg.role === 'user' ? 'user' : 'model'
    contents.push({ role, parts: [{ text: msg.content }] })
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

export default function ChatBot() {
  const { currentSong } = usePlayer()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy SeekeAI 🎵 ¿En qué te ayudo hoy?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [songs, setSongs] = useState([])
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    getSongs().then(setSongs).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

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
      const reply = await askSeekeAI(newMessages, songs, currentSong)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (!open) setUnread(n => n + 1)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al conectar con SeekeAI. ¿Está corriendo el backend? 🙏' }])
    } finally {
      setLoading(false)
    }
  }

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? '?'

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 200, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {open && (
        <div style={{
          position: 'absolute', bottom: 64, right: 0,
          width: 340, height: 480,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '1px solid #e5e7eb',
          animation: 'chatSlideUp 0.2s ease',
        }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>SeekeAI</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }}/>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>En línea</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Canción actual */}
          {currentSong && (
            <div style={{ background: '#f5f3ff', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e5e7eb' }}>
              <img src={currentSong.cover_url || currentSong.coverUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}/>
              <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                🎵 {currentSong.title}
              </p>
              <button onClick={() => sendMessage('Analiza la canción que estoy escuchando')}
                style={{ flexShrink: 0, background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', cursor: 'pointer' }}>
                Analizar
              </button>
            </div>
          )}

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <svg width="13" height="13" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: '78%', fontSize: 13, lineHeight: 1.5, padding: '9px 12px',
                  borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#f3f4f6',
                  color: msg.role === 'user' ? '#fff' : '#111',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 2 }}>
                    {userName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div style={{ background: '#f3f4f6', borderRadius: '14px 14px 14px 3px', padding: '12px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(k => (
                    <div key={k} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: `dotBounce 1.2s ${k * 0.2}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Escribe tu pregunta..."
              style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 100, padding: '8px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ width: 36, height: 36, borderRadius: '50%', background: input.trim() && !loading ? '#7c3aed' : '#e5e7eb', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
              <svg width="14" height="14" fill={input.trim() && !loading ? '#fff' : '#9ca3af'} viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: 54, height: 54, borderRadius: '50%',
          background: open ? '#6d28d9' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(124,58,237,0.45)',
          transition: 'transform 0.2s, background 0.2s',
          position: 'relative',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="SeekeAI - Asistente musical"
      >
        {open ? (
          <svg width="22" height="22" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        )}
        {unread > 0 && !open && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unread}
          </div>
        )}
      </button>

      <style>{`
        @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes chatSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
