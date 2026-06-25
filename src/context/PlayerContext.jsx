import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { registerStream } from '../api/songs'
import { supabase } from '../lib/supabase'

const PlayerContext = createContext()

// ✅ Guardar estado en Supabase
async function savePlayerStateDB(userId, song, queue) {
  if (!userId) return
  try {
    await supabase.from('player_state').upsert({
      user_id: userId,
      song,
      queue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  } catch {}
}

// ✅ Cargar estado desde Supabase
async function loadPlayerStateDB(userId) {
  if (!userId) return null
  try {
    const { data } = await supabase
      .from('player_state')
      .select('song, queue')
      .eq('user_id', userId)
      .single()
    return data ?? null
  } catch { return null }
}

// ✅ Mantener localStorage como fallback rápido
function getPlayerKey(userId) { return `ss_player_${userId ?? 'guest'}` }
function savePlayerStateLocal(userId, song, queue) {
  try { localStorage.setItem(getPlayerKey(userId), JSON.stringify({ song, queue })) } catch {}
}
function loadPlayerStateLocal(userId) {
  try { const saved = localStorage.getItem(getPlayerKey(userId)); return saved ? JSON.parse(saved) : null } catch { return null }
}
function clearPlayerState(userId) {
  try { localStorage.removeItem(getPlayerKey(userId)) } catch {}
}

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeUserId, setActiveUserId] = useState(null)
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState('none')
  const audioRef = useRef(null)
  const queueRef = useRef([])
  const currentIndexRef = useRef(0)
  const shuffleRef = useRef(false)
  const repeatModeRef = useRef('none')
  const saveTimeoutRef = useRef(null)

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { shuffleRef.current = shuffle }, [shuffle])
  useEffect(() => { repeatModeRef.current = repeatMode }, [repeatMode])

  // ✅ Guardar en Supabase con debounce para no saturar
  const savePlayerState = (userId, song, queue) => {
    if (!userId) return
    savePlayerStateLocal(userId, song, queue)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      savePlayerStateDB(userId, song, queue)
    }, 2000)
  }

  useEffect(() => {
    if (currentSong && activeUserId) savePlayerState(activeUserId, currentSong, queueRef.current)
  }, [currentSong, activeUserId])

  // ✅ Media Session API
  useEffect(() => {
    if (!currentSong) return
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title ?? '',
      artist: currentSong.display_artist || currentSong.artist_name || 'Artista',
      artwork: currentSong.cover_url
        ? [{ src: currentSong.cover_url, sizes: '512x512', type: 'image/png' }]
        : []
    })

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {})
      setIsPlaying(true)
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause()
      setIsPlaying(false)
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev())

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  }, [currentSong?.id])

  const stopAndClear = () => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.src = ''
    setCurrentSong(null); setIsPlaying(false); setIsVisible(false)
    setQueue([]); setCurrentIndex(0); setProgress(0); setDuration(0)
    queueRef.current = []; currentIndexRef.current = 0
  }

  // ✅ Restaurar desde Supabase primero, localStorage como fallback
  const restoreForUser = async (userId) => {
    // Primero cargar localStorage para respuesta inmediata
    const local = loadPlayerStateLocal(userId)
    if (local?.song) {
      setCurrentSong(local.song)
      setQueue(local.queue ?? [])
      queueRef.current = local.queue ?? []
      setIsVisible(true); setIsPlaying(false)
      const idx = (local.queue ?? []).findIndex(s => s.id === local.song.id)
      if (idx !== -1) { setCurrentIndex(idx); currentIndexRef.current = idx }
    }

    // Luego cargar desde Supabase (más reciente, sincronizado entre dispositivos)
    const remote = await loadPlayerStateDB(userId)
    if (remote?.song) {
      setCurrentSong(remote.song)
      setQueue(remote.queue ?? [])
      queueRef.current = remote.queue ?? []
      setIsVisible(true); setIsPlaying(false)
      const idx = (remote.queue ?? []).findIndex(s => s.id === remote.song.id)
      if (idx !== -1) { setCurrentIndex(idx); currentIndexRef.current = idx }
      // Sincronizar localStorage con el estado remoto
      savePlayerStateLocal(userId, remote.song, remote.queue ?? [])
    }
  }

  const playSong = (song, songList = null) => {
    setIsVisible(true)
    if (songList) { setQueue(songList); queueRef.current = songList }
    const list = songList ?? queueRef.current
    const idx = list.findIndex(s => (s.id ?? s.spotifyId) === (song.id ?? song.spotifyId))
    if (idx !== -1) { setCurrentIndex(idx); currentIndexRef.current = idx }

    if (currentSong?.id === song.id && currentSong?.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
      else { audioRef.current?.play(); setIsPlaying(true) }
    } else {
      setCurrentSong(song); setIsPlaying(true)
      if (song.id && !song.isSpotify) registerStream(song.id)
    }
    if (activeUserId) savePlayerState(activeUserId, song, songList ?? queueRef.current)
  }

  const pauseSong = () => { audioRef.current?.pause(); setIsPlaying(false) }

  const playNext = async () => {
  const list = queueRef.current
  if (!list.length) return

  // repeat one — reiniciar la misma
  if (repeatModeRef.current === 'one') {
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}) }
    setIsPlaying(true); return
  }

  let nextIdx

  if (shuffleRef.current) {
    if (list.length === 1) { nextIdx = 0 }
    else { do { nextIdx = Math.floor(Math.random() * list.length) } while (nextIdx === currentIndexRef.current) }
    currentIndexRef.current = nextIdx
    setCurrentIndex(nextIdx)
    setCurrentSong(list[nextIdx])
    setIsPlaying(true)
    if (list[nextIdx].id && !list[nextIdx].isSpotify) registerStream(list[nextIdx].id)
    if (activeUserId) savePlayerState(activeUserId, list[nextIdx], list)
    return
  }

  nextIdx = currentIndexRef.current + 1

  // repeat all — volver al inicio
  if (repeatModeRef.current === 'all') {
    if (nextIdx >= list.length) nextIdx = 0
    currentIndexRef.current = nextIdx
    setCurrentIndex(nextIdx)
    setCurrentSong(list[nextIdx])
    setIsPlaying(true)
    if (list[nextIdx].id && !list[nextIdx].isSpotify) registerStream(list[nextIdx].id)
    if (activeUserId) savePlayerState(activeUserId, list[nextIdx], list)
    return
  }

  // ── Sin repeat: hay canción siguiente en la cola ──
  if (nextIdx < list.length) {
    currentIndexRef.current = nextIdx
    setCurrentIndex(nextIdx)
    setCurrentSong(list[nextIdx])
    setIsPlaying(true)
    if (list[nextIdx].id && !list[nextIdx].isSpotify) registerStream(list[nextIdx].id)
    if (activeUserId) savePlayerState(activeUserId, list[nextIdx], list)
    return
  }

  // ── Sin repeat: llegamos al final — modo radio inteligente ──
  try {
    const { data: allSongs } = await supabase
      .from('songs')
      .select('id, title, cover_url, audio_url, display_artist, artist_name, genre, streams, user_id, album_id, album_title')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!allSongs?.length) return

    // IDs ya en la cola para evitar repetir las inmediatas
    const recentIds = new Set(list.slice(-Math.min(5, list.length)).map(s => s.id))
    const currentId = list[currentIndexRef.current]?.id

    // Filtrar: excluir las últimas 5 reproducidas si hay suficientes
    let candidates = allSongs.filter(s => !recentIds.has(s.id))

    // Si no hay suficientes candidatos (plataforma pequeña), usar todas
    if (candidates.length < 3) candidates = allSongs.filter(s => s.id !== currentId)

    // Si aún no hay nada, repetir cualquiera
    if (!candidates.length) candidates = allSongs

    // Elegir aleatoriamente entre los candidatos
    const pick = candidates[Math.floor(Math.random() * candidates.length)]

    // Agregar a la cola
    const newQueue = [...list, pick]
    queueRef.current = newQueue
    setQueue(newQueue)

    const newIdx = newQueue.length - 1
    currentIndexRef.current = newIdx
    setCurrentIndex(newIdx)
    setCurrentSong(pick)
    setIsPlaying(true)
    if (pick.id) registerStream(pick.id)
    if (activeUserId) savePlayerState(activeUserId, pick, newQueue)
  } catch (err) {
    console.error('Radio error:', err)
  }
}

  const playPrev = () => {
    const list = queueRef.current
    if (!list.length) return

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      setProgress(0)
      return
    }

    let prevIdx
    if (shuffleRef.current) {
      if (list.length === 1) { prevIdx = 0 }
      else { do { prevIdx = Math.floor(Math.random() * list.length) } while (prevIdx === currentIndexRef.current) }
    } else {
      prevIdx = currentIndexRef.current - 1
      if (prevIdx < 0) prevIdx = repeatModeRef.current === 'all' ? list.length - 1 : 0
    }

    currentIndexRef.current = prevIdx
    setCurrentIndex(prevIdx)
    setCurrentSong(list[prevIdx])
    setIsPlaying(true)
    if (list[prevIdx].id && !list[prevIdx].isSpotify) registerStream(list[prevIdx].id)
    if (activeUserId) savePlayerState(activeUserId, list[prevIdx], list)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setProgress(audioRef.current.currentTime)
    setDuration(audioRef.current.duration || 0)
  }

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = time
    setProgress(time)
  }

  const handleVolume = (e) => {
    const vol = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.volume = vol
    setVolume(vol)
  }

  const cycleRepeat = () => {
    setRepeatMode(p => {
      const next = p === 'none' ? 'all' : p === 'all' ? 'one' : 'none'
      repeatModeRef.current = next
      return next
    })
  }

  useEffect(() => {
    if (!audioRef.current || !currentSong) return
    const src = currentSong.audio_url || currentSong.previewUrl
    if (!src) return
    audioRef.current.src = src
    audioRef.current.volume = volume
    if (isPlaying) audioRef.current.play().catch(() => {})
  }, [currentSong])

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }, [isPlaying])

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, volume, progress, duration,
      isVisible, setIsVisible, isFullscreen, setIsFullscreen,
      playSong, pauseSong, playNext, playPrev,
      handleSeek, handleVolume, formatTime, audioRef,
      setQueue, queue,
      shuffle, setShuffle,
      repeatMode, cycleRepeat,
      stopAndClear, restoreForUser, setActiveUserId,
      savePlayerState, clearPlayerState,
    }}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNext}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)