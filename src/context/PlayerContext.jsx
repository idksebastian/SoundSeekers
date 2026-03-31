import { createContext, useContext, useState, useRef } from 'react'

const PlayerContext = createContext()

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const playSong = (song) => {
    if (currentSong?.id === song.id) {
      // misma canción — toggle play/pause
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
      } else {
        audioRef.current?.play()
        setIsPlaying(true)
      }
    } else {
      // canción nueva
      setCurrentSong(song)
      setIsPlaying(true)
    }
  }

  const pauseSong = () => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }

  return (
    <PlayerContext.Provider value={{ currentSong, isPlaying, playSong, pauseSong, audioRef }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)