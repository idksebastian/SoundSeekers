import { useState, useRef, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getSongs } from '../api/songs'
import { supabase } from '../lib/supabase'

const MAX_HISTORY = 40
const BACKEND_URL = 'https://soundseekers.onrender.com'

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

IMPORTANTE: Tienes conocimiento de TODOS los artistas mundialmente famosos. Si el usuario pregunta sobre cualquier artista conocido, responde con confianza. Solo si genuinamente no reconoces el artista, sugiere que podría ser emergente en SoundSeekers.
Responde SIEMPRE preguntas musicales. Solo rechaza preguntas completamente ajenas a la música. En ese caso di: "Solo puedo ayudarte con temas musicales y de SoundSeekers 🎵"

Las canciones que te paso en el contexto son las ÚNICAS disponibles para reproducir en SoundSeekers.

IMPORTANTE sobre reproducir canciones: cuando menciones o recomiendes una canción de la lista de SoundSeekers, SIEMPRE incluye la etiqueta [PLAY:Título exacto de la canción] al final de tu respuesta, incluso si solo la estás sugiriendo (no solo cuando el usuario pida reproducirla explícitamente). Esto permite mostrar un botón para reproducirla. Usa el título EXACTO tal como aparece en la lista de canciones del contexto.

Cuando pida navegar incluye: [NAV:upload], [NAV:dashboard], [NAV:community], [NAV:animo], [NAV:profile], [NAV:settings], [NAV:requests], [NAV:contacto], [NAV:terminos] o [NAV:privacidad]
Cuando el usuario quiera contactar soporte o necesite ayuda: usa [NAV:contacto]
Cuando pregunte sobre políticas, términos, derechos de autor o licencias: usa [NAV:terminos]
Cuando pregunte sobre privacidad o datos personales: usa [NAV:privacidad]
NUNCA uses [NAV:settings] para dirigir a políticas legales. Solo usa [NAV:settings] cuando el usuario quiera cambiar configuración de su cuenta.
NUNCA uses una etiqueta [NAV:...] cuando el usuario esté pidiendo reproducir una canción — en ese caso usa [PLAY:...].

Formato: sin asteriscos, sin markdown, sin #. Usa • para listas. Texto conversacional. Máximo 3-4 oraciones.
Responde en español, amigable y conciso. Emojis ocasionales.`

const NAV_CONFIG = {
  upload: { label: 'Ir a Subir música', path: '/upload', icon: '🎵' },
  dashboard: { label: 'Ir a Explorar', path: '/dashboard', icon: '🔍' },
  community: { label: 'Ir a Comunidad', path: '/community', icon: '💬' },
  animo: { label: 'Ir a Ánimo y Clima', path: '/animo', icon: '🎭' },
  profile: { label: 'Ir a mi Perfil', path: '/profile', icon: '👤' },
  settings: { label: 'Ir a Ajustes', path: '/settings', icon: '⚙️' },
  requests: { label: 'Ir a Solicitudes', path: '/requests', icon: '🤝' },
  contacto: { label: 'Ir a Contacto', path: '/contacto', icon: '✉️' },
  terminos: { label: 'Ver Términos de Uso', path: '/terminos', icon: '📄' },
  privacidad: { label: 'Ver Política de Privacidad', path: '/privacidad', icon: '🔒' },
}

const SUGGESTIONS = [
  { icon: '🎵', text: '¿Qué canción me recomiendas?' },
  { icon: '🎤', text: '¿Cómo subo mis canciones?' },
  { icon: '🔍', text: 'Analiza lo que estoy escuchando' },
  { icon: '🎸', text: 'Recomiéndame música para estudiar' },
  { icon: '🌟', text: 'Quiero ser artista en SoundSeekers' },
  { icon: '🎹', text: 'Reproduce algo de reggaeton' },
]

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

// ✅ FIX: fallback para cuando la IA menciona el título de una canción
// real en texto plano sin usar la etiqueta [PLAY:] (el modelo no siempre
// la incluye de forma confiable). Buscamos coincidencias de título más
// largas primero para evitar falsos positivos con títulos cortos.
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

// ✅ FIX: detecta frases cortas tipo "reprodúcela", "ponla", "play that"
// para interceptarlas del lado del cliente en vez de mandarlas a la IA
// (que a veces respondía con [NAV:...] en vez de [PLAY:...] y terminaba
// enviando al usuario a otra sección).
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
  // texto literal en el chat y mostrando la tarjeta de la canción
  // equivocada. Ahora extraemos TODAS con matchAll + reemplazo global.
  const playMatches = [...cleanText.matchAll(/\[PLAY:([^\]]+)\]/g)]
  let fromPlay = []
  if (playMatches.length) {
    fromPlay = playMatches.map(m => findByTitle(m[1], publishedSongs)).filter(Boolean)
    cleanText = cleanText.replace(/\[PLAY:[^\]]+\]/g, '').trim()
  }

  const navMatch = cleanText.match(/\[NAV:([^\]]+)\]/)
  let navKey = null
  if (navMatch) { navKey = navMatch[1].trim(); cleanText = cleanText.replace(/\[NAV:[^\]]+\]/, '').trim() }

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
    ? `Canciones publicadas en SoundSeekers: ${publishedSongs.slice(0, 20).map(s => `"${s.title}" de ${s.display_artist || s.artist_name} (${s.genre})`).join(', ')}.`
    : 'No hay canciones publicadas en SoundSeekers aún.'
  const currentSongContext = currentSong
    ? `El usuario está escuchando: "${currentSong.title}" de ${currentSong.display_artist || currentSong.artist_name}.`
    : 'El usuario no está escuchando ninguna canción.'
  const artistContext = isArtist
    ? 'El usuario ES artista verificado en SoundSeekers.'
    : 'El usuario NO es artista verificado.'
  const systemWithContext = `${SYSTEM_PROMPT}\n\nContexto:\n${songsContext}\n${currentSongContext}\n${artistContext}`
  const contents = [
    { role: 'user', parts: [{ text: systemWithContext }] },
    { role: 'model', parts: [{ text: 'Entendido. Soy SeekeAI, listo para ayudarte.' }] },
    ...messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }))
  ]
  const res = await fetch(`${BACKEND_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: contents }) })
  if (!res.ok) throw new Error('BACKEND_ERROR')
  const data = await res.json()
  if (data.error || !data.reply) throw new Error('AI_ERROR')
  return data.reply
}

const SLOW_MSG = '⏳ Conectando con SeekeAI... El servidor puede tardar unos segundos en despertar. Ya casi...'

export default function AI() {
  const { currentSong, playSong, isVisible, isFullscreen } = usePlayer()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [allSongs, setAllSongs] = useState([])
  const [isArtist, setIsArtist] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  // ✅ Recuerda la última canción mencionada/reproducida en la conversación,
  // para poder interceptar "reprodúcela"/"ponla" sin depender de la IA.
  const lastMentionedSongRef = useRef(null)
  const historyKey = getHistoryKey(user?.id)
  const publishedSongs = allSongs.filter(s => s.status === 'published')
  const avatarUrl = user?.user_metadata?.avatar_url ?? null

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(getHistoryKey(user?.id))
      if (saved) { const p = JSON.parse(saved); if (p.length > 0) return p }
    } catch {}
    return []
  })

  const showWelcome = messages.length === 0

  useEffect(() => {
    if (!user) return
    supabase.from('user_roles').select('role').eq('user_id', user.id).single()
      .then(({ data }) => setIsArtist(data?.role === 'artist')).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    const key = getHistoryKey(user?.id)
    try {
      const saved = localStorage.getItem(key)
      if (saved) { const p = JSON.parse(saved); if (p.length > 0) { setMessages(p); return } }
    } catch {}
    setMessages([])
  }, [user?.id])

  useEffect(() => {
    try { localStorage.setItem(historyKey, JSON.stringify(messages.slice(-MAX_HISTORY))) } catch {}
  }, [messages, historyKey])

  useEffect(() => { getSongs().then(setAllSongs).catch(() => {}) }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const clearHistory = () => { setMessages([]); localStorage.removeItem(historyKey); lastMentionedSongRef.current = null }

  // ✅ Actualiza la referencia de "última canción mencionada" a partir de
  // cualquier respuesta del asistente (usa la última mencionada si hay
  // varias, por ser la más reciente en la conversación).
  const updateLastMentionedSong = (text) => {
    const { songsToShow } = parseMessage(text, publishedSongs)
    if (songsToShow.length) lastMentionedSongRef.current = songsToShow[songsToShow.length - 1]
  }

  const sendMessage = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return

    // ✅ FIX: intercepta "reprodúcela"/"ponla" del lado del cliente. Si ya
    // sabemos cuál fue la última canción mencionada, la reproducimos
    // directamente sin pasarle esto a la IA — evita que el modelo
    // responda con un [NAV:...] en vez de reproducir la canción.
    if (isQuickPlayIntent(content) && lastMentionedSongRef.current) {
      const song = lastMentionedSongRef.current
      setInput('')
      setMessages(prev => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: `▶️ Reproduciendo "${song.title}" — ${song.display_artist || song.artist_name}\n[PLAY:${song.title}]` }
      ])
      playSong(song, publishedSongs)
      return
    }

    setInput(''); setError('')
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

      // Remover mensaje de espera si apareció
      // ✅ FIX: ya NO reproducimos automáticamente al recibir la respuesta.
      // Ahora que la IA etiqueta [PLAY:...] en CADA recomendación (no solo
      // cuando el usuario pide reproducir explícitamente), autoreproducir
      // aquí generaba caos: sonaba la primera canción mencionada aunque
      // el usuario solo estuviera explorando opciones. Ahora solo se
      // reproduce si el usuario le da clic a la tarjeta, o si escribe
      // "reprodúcela"/"ponla" (interceptado más arriba en sendMessage).
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== SLOW_MSG)
        return [...filtered, { role: 'assistant', content: cleaned }]
      })
    } catch {
      clearTimeout(slowTimer)
      setMessages(prev => prev.filter(m => m.content !== SLOW_MSG))
      setError('Error al conectar con SeekeAI. Intenta de nuevo.')
      setMessages(prev => prev.slice(0, -1))
    } finally { setLoading(false); inputRef.current?.focus() }
  }

  const userName = user?.user_metadata?.artist_name ?? user?.user_metadata?.name ?? 'músico'
  const playerOffset = isVisible && !isFullscreen ? 72 : 0

  const renderAssistantContent = (msg) => {
    const { cleanText, songsToShow, navKey } = parseMessage(msg.content, publishedSongs)
    const isSlowMsg = msg.content === SLOW_MSG
    if (isSlowMsg) return (
      <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>{msg.content}</p>
    )

    return (
      <div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '14px', color: '#374151' }}>{cleanText}</p>
        {songsToShow.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {songsToShow.map(song => (
              <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f5f3ff', borderRadius: '12px', padding: '10px 12px', border: '1px solid #ede9fe' }}>
                <img src={song.cover_url} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#7c3aed' }}>{song.display_artist || song.artist_name}</p>
                </div>
                <button onClick={() => playSong(song, publishedSongs)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', flexShrink: 0 }}>
                  <svg width="13" height="13" fill="white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {navKey && NAV_CONFIG[navKey] && songsToShow.length === 0 && (
          <button onClick={() => navigate(NAV_CONFIG[navKey].path)}
            style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '100px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            <span>{NAV_CONFIG[navKey].icon}</span>{NAV_CONFIG[navKey].label}
            <svg width="14" height="14" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        )}
      </div>
    )
  }

  const inputBar = (
    <div style={{ position: 'fixed', bottom: playerOffset, left: 0, right: 0, background: 'rgba(248,247,255,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e5e7eb', padding: '12px 16px', zIndex: 150, transition: 'bottom 0.3s ease' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {currentSong && showWelcome && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: '12px', padding: '8px 12px', marginBottom: '8px' }}>
            <img src={currentSong.cover_url || currentSong.coverUrl} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}/>
            <p style={{ margin: 0, fontSize: '12px', color: '#6d28d9', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🎵 Escuchando: {currentSong.title} — {currentSong.display_artist || currentSong.artist_name}
            </p>
            <button onClick={() => sendMessage('Analiza la canción que estoy escuchando ahora')}
              style={{ flexShrink: 0, background: '#7c3aed', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Analizar
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Pregúntame sobre música, artistas o la plataforma..."
            style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: '100px', padding: '12px 20px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', background: '#fff', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = '#7c3aed'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: '44px', height: '44px', borderRadius: '50%', background: input.trim() && !loading ? '#7c3aed' : '#e5e7eb', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
            <svg width="16" height="16" fill={input.trim() && !loading ? '#fff' : '#9ca3af'} viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  )

  if (showWelcome) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } } .sugg-btn:hover { background: #f5f3ff !important; border-color: #7c3aed !important; transform: translateY(-1px); }`}</style>

        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '2rem 1rem 4.5rem' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', margin: '0 0 8px' }}>Asistente Inteligente</p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff', margin: '0 0 6px', letterSpacing: '0.02em' }}>SeekeAI</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>Tu asistente musical para SoundSeekers</p>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', paddingBottom: `${playerOffset + 100}px`, marginTop: '-24px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: '32px 24px', maxWidth: '480px', width: '100%', textAlign: 'center', animation: 'fadeUp 0.4s ease forwards' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
              <svg width="32" height="32" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111', margin: '0 0 8px' }}>
              Hola, {userName} 👋
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: '0 0 24px' }}>
              Soy SeekeAI, tu asistente musical en SoundSeekers. Puedo recomendarte música, reproducir canciones, analizar lo que estás escuchando o resolver cualquier duda musical.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left' }}>
              {SUGGESTIONS.map(s => (
                <button key={s.text} className="sugg-btn" onClick={() => sendMessage(s.text)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{s.icon}</span>
                  <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500', lineHeight: 1.4 }}>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {inputBar}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'); @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} } @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#fff' }}>SeekeAI</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80' }}/>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>En línea</p>
            </div>
          </div>
          {currentSong && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
              onClick={() => sendMessage('Analiza la canción que estoy escuchando ahora')}>
              <img src={currentSong.cover_url || currentSong.coverUrl} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }}/>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '600', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentSong.title}
              </p>
            </div>
          )}
          <button onClick={clearHistory}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '5px 10px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
            🗑️
          </button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '760px', width: '100%', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: `${playerOffset + 90}px` }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.2s ease forwards' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <svg width="15" height="15" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: '78%',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#111',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              padding: '12px 16px',
              boxShadow: msg.role === 'user' ? '0 4px 12px rgba(124,58,237,0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {msg.role === 'assistant' ? renderAssistantContent(msg) : (
                <span style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              )}
            </div>
            {msg.role === 'user' && (
              avatarUrl ? (
                <img src={avatarUrl} alt={userName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: '2px' }}/>
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#7c3aed', flexShrink: 0, marginTop: '2px' }}>
                  {userName?.[0]?.toUpperCase() ?? '?'}
                </div>
              )
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div style={{ background: '#fff', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0, 1, 2].map(k => (
                <div key={k} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7c3aed', animation: `dotBounce 1.2s ${k * 0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>{error}</div>
        )}

        <div ref={bottomRef}/>
      </div>

      {inputBar}
    </div>
  )
}