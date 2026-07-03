import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { registerStream } from '../api/songs'
import { supabase } from '../lib/supabase'

const PlayerContext = createContext()

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

// ✅ FIX: reshuffle 100% local de la cola actual. Antes, al llegar al
// final de la cola sin repeat, se hacía una consulta a Supabase para
// traer una lista "fresca" de canciones — si esa consulta fallaba por
// cualquier motivo (columna inexistente, RLS, red), el error se ignoraba
// silenciosamente y el player se quedaba sin hacer nada, dando la
// sensación de estar "muerto". Esta función nunca puede fallar por red
// ni por permisos, porque solo reordena lo que ya está en memoria.
// Además garantiza que la canción que acaba de sonar no quede de
// primera otra vez (evita la repetición inmediata que pediste).
function reshuffleQueue(list, justPlayedId) {
  if (list.length <= 1) return [...list]
  let shuffled
  let attempts = 0
  do {
    shuffled = [...list].sort(() => Math.random() - 0.5)
    attempts++
  } while (shuffled[0]?.id === justPlayedId && attempts < 10)
  return shuffled
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

  // ✅ Media Session API — controles del teclado del PC
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

  const restoreForUser = async (userId) => {
    const local = loadPlayerStateLocal(userId)
    if (local?.song) {
      setCurrentSong(local.song)
      setQueue(local.queue ?? [])
      queueRef.current = local.queue ?? []
      setIsVisible(true); setIsPlaying(false)
      const idx = (local.queue ?? []).findIndex(s => s.id === local.song.id)
      if (idx !== -1) { setCurrentIndex(idx); currentIndexRef.current = idx }
    }

    const remote = await loadPlayerStateDB(userId)
    if (remote?.song) {
      setCurrentSong(remote.song)
      setQueue(remote.queue ?? [])
      queueRef.current = remote.queue ?? []
      setIsVisible(true); setIsPlaying(false)
      const idx = (remote.queue ?? []).findIndex(s => s.id === remote.song.id)
      if (idx !== -1) { setCurrentIndex(idx); currentIndexRef.current = idx }
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

  // ✅ Añadir una canción a la cola (actualiza estado Y ref para que surta efecto)
  const addToQueue = (song) => {
    if (!song?.id) return false
    if (queueRef.current.some(s => s.id === song.id)) return false
    const newQueue = [...queueRef.current, song]
    queueRef.current = newQueue
    setQueue(newQueue)
    if (activeUserId) savePlayerState(activeUserId, currentSong, newQueue)
    return true
  }

  const pauseSong = () => { audioRef.current?.pause(); setIsPlaying(false) }

  const playNext = () => {
    const list = queueRef.current
    if (!list.length) return

    // repeat one — reiniciar la misma
    if (repeatModeRef.current === 'one') {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}) }
      setIsPlaying(true); return
    }

    // shuffle activo
    if (shuffleRef.current) {
      let nextIdx
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

    const nextIdx = currentIndexRef.current + 1

    // repeat all — volver al inicio
    if (repeatModeRef.current === 'all') {
      const idx = nextIdx >= list.length ? 0 : nextIdx
      currentIndexRef.current = idx
      setCurrentIndex(idx)
      setCurrentSong(list[idx])
      setIsPlaying(true)
      if (list[idx].id && !list[idx].isSpotify) registerStream(list[idx].id)
      if (activeUserId) savePlayerState(activeUserId, list[idx], list)
      return
    }

    // hay canción siguiente en la cola
    if (nextIdx < list.length) {
      currentIndexRef.current = nextIdx
      setCurrentIndex(nextIdx)
      setCurrentSong(list[nextIdx])
      setIsPlaying(true)
      if (list[nextIdx].id && !list[nextIdx].isSpotify) registerStream(list[nextIdx].id)
      if (activeUserId) savePlayerState(activeUserId, list[nextIdx], list)
      return
    }

    // ✅ FIX: sin repeat, llegamos al final de la cola. En vez de pedirle
    // a Supabase una lista "fresca" (que podía fallar en silencio y dejar
    // el player sin hacer nada — el bug reportado), simplemente volvemos
    // a mezclar las mismas canciones que ya tenemos en memoria. Esto es
    // instantáneo, nunca falla, y garantiza que la canción que acaba de
    // sonar no quede de primera otra vez — así el modo "radio" nunca se
    // detiene, sin importar cuántas canciones haya en la plataforma.
    const justPlayedId = list[currentIndexRef.current]?.id
    const reshuffled = reshuffleQueue(list, justPlayedId)

    queueRef.current = reshuffled
    setQueue(reshuffled)
    currentIndexRef.current = 0
    setCurrentIndex(0)
    setCurrentSong(reshuffled[0])
    setIsPlaying(true)
    if (reshuffled[0]?.id && !reshuffled[0]?.isSpotify) registerStream(reshuffled[0].id)
    if (activeUserId) savePlayerState(activeUserId, reshuffled[0], reshuffled)
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
      setQueue, queue, addToQueue,
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