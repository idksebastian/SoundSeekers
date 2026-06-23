import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { registerStream } from '../api/songs'

const PlayerContext = createContext()

function getPlayerKey(userId) { return `ss_player_${userId ?? 'guest'}` }

function savePlayerState(userId, song, queue) {
  try { localStorage.setItem(getPlayerKey(userId), JSON.stringify({ song, queue })) } catch {}
}

function loadPlayerState(userId) {
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
  const [repeatMode, setRepeatMode] = useState('none') // 'none' | 'all' | 'one'
  const audioRef = useRef(null)
  const queueRef = useRef([])
  const currentIndexRef = useRef(0)
  const shuffleRef = useRef(false)
  const repeatModeRef = useRef('none')

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { shuffleRef.current = shuffle }, [shuffle])
  useEffect(() => { repeatModeRef.current = repeatMode }, [repeatMode])

  useEffect(() => {
    if (currentSong && activeUserId) savePlayerState(activeUserId, currentSong, queueRef.current)
  }, [currentSong, activeUserId])

  const stopAndClear = () => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.src = ''
    setCurrentSong(null); setIsPlaying(false); setIsVisible(false)
    setQueue([]); setCurrentIndex(0); setProgress(0); setDuration(0)
    queueRef.current = []; currentIndexRef.current = 0
  }

  const restoreForUser = (userId) => {
    const saved = loadPlayerState(userId)
    if (saved?.song) {
      setCurrentSong(saved.song)
      setQueue(saved.queue ?? [])
      queueRef.current = saved.queue ?? []
      setIsVisible(true); setIsPlaying(false)
      const idx = (saved.queue ?? []).findIndex(s => s.id === saved.song.id)
      if (idx !== -1) { setCurrentIndex(idx); currentIndexRef.current = idx }
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

  const playNext = () => {
    const list = queueRef.current
    if (!list.length) return

    // repeat one — reiniciar la misma
    if (repeatModeRef.current === 'one') {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}) }
      setIsPlaying(true); return
    }

    let nextIdx
    if (shuffleRef.current) {
      // shuffle — índice aleatorio distinto al actual
      if (list.length === 1) { nextIdx = 0 }
      else { do { nextIdx = Math.floor(Math.random() * list.length) } while (nextIdx === currentIndexRef.current) }
    } else {
      nextIdx = currentIndexRef.current + 1
      // repeat all — volver al inicio
      if (nextIdx >= list.length) {
        if (repeatModeRef.current === 'all') nextIdx = 0
        else return // sin repeat, parar al final
      }
    }

    currentIndexRef.current = nextIdx
    setCurrentIndex(nextIdx)
    setCurrentSong(list[nextIdx])
    setIsPlaying(true)
    if (list[nextIdx].id && !list[nextIdx].isSpotify) registerStream(list[nextIdx].id)
    if (activeUserId) savePlayerState(activeUserId, list[nextIdx], list)
  }

  const playPrev = () => {
    const list = queueRef.current
    if (!list.length) return

    // Si llevamos más de 3 segundos, reiniciar la canción actual
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