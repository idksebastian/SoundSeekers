import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { registerStream } from '../api/songs'

const PlayerContext = createContext()

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
  const audioRef = useRef(null)

  const queueRef = useRef([])
  const currentIndexRef = useRef(0)

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  const getShuffleIndex = (currentIdx, total) => {
    if (total <= 1) return 0
    let idx
    do { idx = Math.floor(Math.random() * total) } while (idx === currentIdx)
    return idx
  }

  const playSong = (song, songList = null) => {
    setIsVisible(true)
    if (songList) {
      setQueue(songList)
      queueRef.current = songList
    }
    const list = songList ?? queueRef.current
    const idx = list.findIndex(s => (s.id ?? s.spotifyId) === (song.id ?? song.spotifyId))
    if (idx !== -1) {
      setCurrentIndex(idx)
      currentIndexRef.current = idx
    }

    if (currentSong?.id === song.id && currentSong?.id) {
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
      } else {
        audioRef.current?.play()
        setIsPlaying(true)
      }
    } else {
      setCurrentSong(song)
      setIsPlaying(true)
      // Solo registrar stream para canciones propias (tienen id de Supabase)
      if (song.id && !song.isSpotify) registerStream(song.id)
    }
  }

  const pauseSong = () => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }

  const playNext = () => {
    const list = queueRef.current
    if (!list.length) return
    const nextIdx = getShuffleIndex(currentIndexRef.current, list.length)
    currentIndexRef.current = nextIdx
    setCurrentIndex(nextIdx)
    setCurrentSong(list[nextIdx])
    setIsPlaying(true)
    if (list[nextIdx].id && !list[nextIdx].isSpotify) registerStream(list[nextIdx].id)
  }

  const playPrev = () => {
    const list = queueRef.current
    if (!list.length) return
    const prevIdx = getShuffleIndex(currentIndexRef.current, list.length)
    currentIndexRef.current = prevIdx
    setCurrentIndex(prevIdx)
    setCurrentSong(list[prevIdx])
    setIsPlaying(true)
    if (list[prevIdx].id && !list[prevIdx].isSpotify) registerStream(list[prevIdx].id)
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

  useEffect(() => {
    if (!audioRef.current || !currentSong) return
    // Soporte para canciones propias (audio_url) y Spotify (previewUrl)
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
      isVisible, setIsVisible,
      isFullscreen, setIsFullscreen,
      playSong, pauseSong, playNext, playPrev,
      handleSeek, handleVolume, formatTime, audioRef,
      setQueue, queue
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
