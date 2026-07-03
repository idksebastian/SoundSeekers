import { useState, useRef, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getSongs } from '../api/songs'
import { supabase } from '../lib/supabase'

const BACKEND_URL = 'https://soundseekers.onrender.com'

const SYSTEM_PROMPT = `Eres SeekeAI, el asistente musical inteligente de SoundSeekers, una plataforma de música emergente latinoamericana.

Tu especialidad es TODO lo relacionado con música. Responde con confianza sobre:
- Artistas, bandas, vocalistas, músicos de cualquier época y género (Kurt Cobain de Nirvana, Freddie Mercury de Queen, Bad Bunny, etc.)
- Historia de la música, géneros, movimientos musicales
- Canciones, álbumes, discografías, letras y su significado
- Curiosidades y datos de la industria musical
- Recomendaciones según estado de ánimo, clima o situación
- Canciones y artistas disponibles en SoundSeekers
- Cómo usar la plataforma SoundSeekers
- Análisis de la canción que el usuario está escuchando
- Consejos para artistas emergentes

IMPORTANTE: Tienes conocimiento de TODOS los artistas mundialmente famosos. Si el usuario pregunta sobre cualquier artista conocido, responde con confianza. Solo si genuinamente no reconoces el artista, sugiere que podría ser emergente en SoundSeekers.

Responde SIEMPRE preguntas musicales, sin importar si el artista es famoso o emergente. NUNCA digas que no puedes responder preguntas musicales sobre artistas famosos. Solo rechaza preguntas completamente ajenas a la música como matemáticas, cocina, política, etc. En ese caso di: "Solo puedo ayudarte con temas musicales y de SoundSeekers 🎵"

Las canciones que te paso en el contexto son las ÚNICAS disponibles para reproducir. Solo sugiere reproducir canciones que estén en esa lista.

IMPORTANTE sobre reproducir canciones: cuando menciones o recomiendes una canción de la lista de SoundSeekers, SIEMPRE incluye la etiqueta [PLAY:Título exacto de la canción] al final de tu respuesta, incluso si solo la estás sugiriendo (no solo cuando el usuario pida reproducirla explícitamente). Esto permite mostrar un botón para reproducirla. Usa el título EXACTO tal como aparece en la lista de canciones del contexto.

Cuando el usuario pregunte cómo subir canciones o quiera subir música:
- Si es artista verificado: explica brevemente el proceso e incluye [NAV:upload]
- Si NO es artista verificado: dile que primero debe solicitar verificación de artista en su perfil e incluye [NAV:profile]

Cuando pida navegar incluye: [NAV:upload], [NAV:dashboard], [NAV:community], [NAV:animo], [NAV:profile], [NAV:settings], [NAV:requests], [NAV:contacto], [NAV:terminos] o [NAV:privacidad]
Cuando el usuario quiera contactar soporte o necesite ayuda: usa [NAV:contacto]
Cuando pregunte sobre políticas, términos, derechos de autor o licencias: usa [NAV:terminos]
Cuando pregunte sobre privacidad o datos personales: usa [NAV:privacidad]
NUNCA uses [NAV:settings] para dirigir a políticas legales. Solo usa [NAV:settings] cuando el usuario quiera cambiar configuración de su cuenta.
NUNCA uses una etiqueta [NAV:...] cuando el usuario esté pidiendo reproducir una canción — en ese caso usa [PLAY:...].

Formato: sin asteriscos, sin markdown, sin #. Usa • para listas. Máximo 3-4 oraciones. Responde en español, amigable y conciso.`

const NAV_CONFIG = {
  upload: { label: 'Subir música', path: '/upload', icon: '🎵' },
  dashboard: { label: 'Explorar', path: '/dashboard', icon: '🔍' },
  community: { label: 'Comunidad', path: '/community', icon: '💬' },
  animo: { label: 'Ánimo y Clima', path: '/animo', icon: '🎭' },
  profile: { label: 'Mi Perfil', path: '/profile', icon: '👤' },
  settings: { label: 'Ajustes', path: '/settings', icon: '⚙️' },
  requests: { label: 'Solicitudes', path: '/requests', icon: '🤝' },
  contacto: { label: 'Contacto', path: '/contacto', icon: '✉️' },
  terminos: { label: 'Ver Términos de Uso', path: '/terminos', icon: '📄' },
  privacidad: { label: 'Ver Política de Privacidad', path: '/privacidad', icon: '🔒' },
}

const SLOW_MSG = '⏳ Conectando... puede tardar unos segundos.'

function getChatKey(userId) { return `seekai_chat_${userId ?? 'guest'}` }

function cleanMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ✅ FIX: fallback para cuando la IA menciona el título de una canción
// real en texto plano sin usar la etiqueta [PLAY:]. Buscamos coincidencias
// de título más largas primero para evitar falsos positivos.
function findMentionedSong(text, songs) {
  if (!text || !songs?.length) return null
  const lower = text.toLowerCase()
  const sorted = [...songs]
    .filter(s => s.title && s.title.trim().length > 2)
    .sort((a, b) => b.title.length - a.title.length)
  for (const s of sorted) {
    if (lower.includes(s.title.toLowerCase())) return s
  }
  return null
}

function findByTitle(title, songs) {
  const t = title.trim().toLowerCase()
  return songs.find(s => s.title?.toLowerCase() === t)
    ?? songs.find(s => s.title?.toLowerCase().includes(t) || t.includes(s.title?.toLowerCase() ?? ''))
}

function dedupeSongs(songs) {
  const seen = new Set()
  return songs.filter(s => {
    if (!s?.id || seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}

// ✅ FIX: detecta frases cortas tipo "reprodúcela"/"ponla" para
// interceptarlas del lado del cliente en vez de mandarlas a la IA.
function isQuickPlayIntent(text) {
  const t = text.trim().toLowerCase()
  if (!t) return false
  if (t.split(/\s+/).length > 6) return false
  return /(reprodu\w*|p[oó]n\w*|play|suena|dale\s*play)/i.test(t)
}

function parseMessage(text, publishedSongs) {
  let cleanText = cleanMarkdown(text)

  const songsMatch = cleanText.match(/\[CANCIONES:([^\]]+)\]/)
  let fromList = []
  if (songsMatch) {
    const titles = songsMatch[1].split('|').map(t => t.trim())
    cleanText = cleanText.replace(/\[CANCIONES:[^\]]+\]/, '').trim()
    fromList = titles.map(title => findByTitle(title, publishedSongs)).filter(Boolean)
  }

  // ✅ FIX: la IA puede incluir VARIAS etiquetas [PLAY:...] en una misma
  // respuesta (una por cada canción que recomienda). Antes solo se
  // procesaba la primera (sin bandera /g), dejando el resto visible como
  // texto literal en el chat y mostrando la tarjeta equivocada. Ahora
  // extraemos TODAS con matchAll + reemplazo global.
  const playMatches = [...cleanText.matchAll(/\[PLAY:([^\]]+)\]/g)]
  let fromPlay = []
  if (playMatches.length) {
    fromPlay = playMatches.map(m => findByTitle(m[1], publishedSongs)).filter(Boolean)
    cleanText = cleanText.replace(/\[PLAY:[^\]]+\]/g, '').trim()
  }

  const navMatch = cleanText.match(/\[NAV:([^\]]+)\]/)
  let navKey = null
  if (navMatch) {
    navKey = navMatch[1].trim()
    cleanText = cleanText.replace(/\[NAV:[^\]]+\]/, '').trim()
  }

  let songsToShow = dedupeSongs([...fromList, ...fromPlay])

  // Fallback: si no hubo ninguna etiqueta pero el texto menciona un
  // título real, igual lo mostramos como tarjeta.
  if (songsToShow.length === 0) {
    const mentioned = findMentionedSong(cleanText, publishedSongs)
    if (mentioned) songsToShow = [mentioned]
  }

  return { cleanText, songsToShow, navKey }
}

async function askSeekeAI(messages, publishedSongs, currentSong, isArtist = false) {
  const songsContext = publishedSongs.length > 0
    ? `Canciones publicadas en SoundSeekers (SOLO estas están disponibles para reproducir): ${publishedSongs.slice(0, 15).map(s => `"${s.title}" de ${s.display_artist || s.artist_name} (${s.genre})`).join(', ')}.`
    : 'No hay canciones publicadas en SoundSeekers aún.'
  const currentSongContext = currentSong
    ? `El usuario está escuchando: "${currentSong.title}" de ${currentSong.display_artist || currentSong.artist_name}.`
    : ''
  const artistContext = isArtist
    ? 'El usuario ES artista verificado en SoundSeekers, puede subir canciones directamente en /upload.'
    : 'El usuario NO es artista verificado. Si pregunta cómo subir canciones, dile que primero debe solicitar verificación de artista en su perfil.'

  const systemWithContext = `${SYSTEM_PROMPT}\n\nContexto:\n${songsContext}\n${currentSongContext}\n${artistContext}`
  const contents = []
  contents.push({ role: 'user', parts: [{ text: systemWithContext }] })
  contents.push({ role: 'model', parts: [{ text: 'Entendido. Soy SeekeAI, listo para ayudarte con música.' }] })
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

export default function ChatBot() {
  const { currentSong, playSong } = usePlayer()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [isArtist, setIsArtist] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy SeekeAI 🎵 ¿En qué te ayudo hoy?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [allSongs, setAllSongs] = useState([])
  const [unread, setUnread] = useState(0)
  const [playingPreview, setPlayingPreview] = useState(null)
  const audioRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  // ✅ Recuerda la última canción mencionada/reproducida, para interceptar
  // "reprodúcela"/"ponla" sin depender de la IA.
  const lastMentionedSongRef = useRef(null)

  const chatKey = getChatKey(user?.id)
  const publishedSongs = allSongs.filter(s => s.status === 'published')
  const avatarUrl = user?.user_metadata?.avatar_url ?? null

  useEffect(() => {
    if (!user) return
    supabase.from('user_roles').select('role').eq('user_id', user.id).single()
      .then(({ data }) => setIsArtist(data?.role === 'artist'))
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    const key = getChatKey(user?.id)
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) { setMessages(parsed); return }
      }
    } catch {}
    setMessages([{ role: 'assistant', content: '¡Hola! Soy SeekeAI 🎵 ¿En qué te ayudo hoy?' }])
  }, [user?.id])

  useEffect(() => {
    try {
      localStorage.setItem(chatKey, JSON.stringify(messages.filter(m => m.content !== SLOW_MSG).slice(-20)))
    } catch {}
  }, [messages, chatKey])

  useEffect(() => { getSongs().then(setAllSongs).catch(() => {}) }, [])

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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

  // ✅ Actualiza la referencia de "última canción mencionada" a partir de
  // cualquier respuesta del asistente (usa la última si hay varias, por
  // ser la más reciente en la conversación).
  const updateLastMentionedSong = (text) => {
    const { songsToShow } = parseMessage(text, publishedSongs)
    if (songsToShow.length) lastMentionedSongRef.current = songsToShow[songsToShow.length - 1]
  }

  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || loading) return

    // ✅ FIX: intercepta "reprodúcela"/"ponla" del lado del cliente. Si ya
    // sabemos cuál fue la última canción mencionada, la reproducimos
    // directamente sin pasar por la IA — evita que responda con un
    // [NAV:...] y termine mandando al usuario a otra sección.
    if (isQuickPlayIntent(content) && lastMentionedSongRef.current) {
      const song = lastMentionedSongRef.current
      setInput('')
      setMessages(prev => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: `▶️ Reproduciendo "${song.title}" — ${song.display_artist || song.artist_name}\n[PLAY:${song.title}]` }
      ])
      playSong(song, publishedSongs)
      if (!open) setUnread(n => n + 1)
      return
    }

    setInput('')
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    // ✅ Mostrar mensaje si el servidor tarda en despertar
    const slowTimer = setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: SLOW_MSG }])
    }, 8000)

    try {
      const reply = await askSeekeAI(newMessages, publishedSongs, currentSong, isArtist)
      clearTimeout(slowTimer)
      const cleaned = cleanMarkdown(reply)
      updateLastMentionedSong(cleaned)
      // ✅ FIX: ya NO reproducimos automáticamente al recibir la respuesta.
      // Ahora que la IA etiqueta [PLAY:...] en cada recomendación (no solo
      // cuando el usuario pide reproducir explícitamente), autoreproducir
      // aquí generaba caos: sonaba la primera canción mencionada aunque
      // el usuario solo estuviera explorando opciones. Ahora solo se
      // reproduce si el usuario le da clic a la tarjeta, o si escribe
      // "reprodúcela"/"ponla" (interceptado arriba).
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== SLOW_MSG)
        return [...filtered, { role: 'assistant', content: cleaned }]
      })
      if (!open) setUnread(n => n + 1)
    } catch {
      clearTimeout(slowTimer)
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== SLOW_MSG)
        return [...filtered, { role: 'assistant', content: 'Hubo un error al conectar con SeekeAI 🙏 Intenta de nuevo.' }]
      })
    } finally {
      setLoading(false)
    }
  }

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? '?'

  const renderMessage = (msg) => {
    if (msg.role !== 'assistant') return msg.content
    if (msg.content === SLOW_MSG) return (
      <span style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>{msg.content}</span>
    )

    if (msg.itunesSongs) {
      return (
        <div>
          <span style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{msg.content}</span>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {msg.itunesSongs.map(s => (
              <div key={s.trackId} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(124,58,237,0.06)', borderRadius: 9, padding: '6px 8px', border: '1px solid rgba(124,58,237,0.15)' }}>
                <img src={s.artworkUrl60} alt={s.trackName} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.trackName}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#7c3aed' }}>{s.artistName}</p>
                </div>
                {s.previewUrl && (
                  <button onClick={() => handlePlayPreview(s.previewUrl, s.trackId)}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: playingPreview === s.trackId ? '#6d28d9' : '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {playingPreview === s.trackId
                      ? <svg width="8" height="8" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                      : <svg width="8" height="8" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    const { cleanText, songsToShow, navKey } = parseMessage(msg.content, publishedSongs)

    return (
      <div>
        <span style={{ whiteSpace: 'pre-wrap' }}>{cleanText}</span>

        {songsToShow.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {songsToShow.map(song => (
              <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(124,58,237,0.06)', borderRadius: 9, padding: '6px 8px', border: '1px solid rgba(124,58,237,0.15)' }}>
                <img src={song.cover_url} alt={song.title} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#7c3aed' }}>{song.display_artist || song.artist_name}</p>
                </div>
                <button onClick={() => playSong(song, publishedSongs)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="8" height="8" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {navKey && NAV_CONFIG[navKey] && songsToShow.length === 0 && (
          <button onClick={() => { navigate(NAV_CONFIG[navKey].path); setOpen(false) }}
            style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {NAV_CONFIG[navKey].icon} {NAV_CONFIG[navKey].label} →
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 12, zIndex: 200, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {open && (
        <div style={{ position: 'absolute', bottom: 64, right: 0, width: 'min(340px, calc(100vw - 24px))', height: 480, background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e5e7eb', animation: 'chatSlideUp 0.2s ease' }}>

          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 13 }}>SeekeAI</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }}/>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>En línea</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {currentSong && (
            <div style={{ background: '#f5f3ff', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid #e5e7eb' }}>
              <img src={currentSong.cover_url || currentSong.coverUrl} alt="" style={{ width: 26, height: 26, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }}/>
              <p style={{ margin: 0, fontSize: 10, color: '#7c3aed', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                🎵 {currentSong.title}
              </p>
              <button onClick={() => sendMessage('Analiza la canción que estoy escuchando')}
                style={{ flexShrink: 0, background: '#7c3aed', border: 'none', borderRadius: 5, color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 7px', cursor: 'pointer' }}>
                Analizar
              </button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <svg width="12" height="12" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                )}
                <div style={{ maxWidth: '80%', fontSize: 12, lineHeight: 1.5, padding: '8px 11px', borderRadius: msg.role === 'user' ? '13px 13px 3px 13px' : '13px 13px 13px 3px', background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#f3f4f6', color: msg.role === 'user' ? '#fff' : '#111' }}>
                  {msg.role === 'assistant' ? renderMessage(msg) : msg.content}
                </div>
                {msg.role === 'user' && (
                  avatarUrl ? (
                    <img src={avatarUrl} alt={userName} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2 }}/>
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 2 }}>
                      {userName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div style={{ background: '#f3f4f6', borderRadius: '13px 13px 13px 3px', padding: '10px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(k => (
                    <div key={k} style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', animation: `dotBounce 1.2s ${k * 0.2}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={{ padding: '9px 10px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 7 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Escribe tu pregunta..."
              style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 100, padding: '7px 12px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ width: 34, height: 34, borderRadius: '50%', background: input.trim() && !loading ? '#7c3aed' : '#e5e7eb', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" fill={input.trim() && !loading ? '#fff' : '#9ca3af'} viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(o => !o)}
        style={{ width: 50, height: 50, borderRadius: '50%', background: open ? '#6d28d9' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,0.45)', transition: 'transform 0.2s', position: 'relative' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="SeekeAI">
        {open ? (
          <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="20" height="20" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        )}
        {unread > 0 && !open && (
          <div style={{ position: 'absolute', top: -2, right: -2, width: 17, height: 17, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
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