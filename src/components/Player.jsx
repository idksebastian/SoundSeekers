import { useEffect, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext'

export default function Player() {
  const { currentSong, isPlaying, playSong, pauseSong, audioRef } = usePlayer()

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, currentSong])

  if (!currentSong) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center gap-4 shadow-lg z-50">

      {/* Portada */}
      <img
        src={currentSong.cover_url}
        alt={currentSong.title}
        className="w-12 h-12 rounded-lg object-cover shrink-0"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-black font-semibold text-sm truncate">{currentSong.title}</p>
        <p className="text-gray-400 text-xs truncate">🎤 {currentSong.artist_name ?? 'Artista'}</p>
      </div>

      {/* Botón play/pause */}
      <button
        onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
        className="w-10 h-10 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition shrink-0"
      >
        {isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        )}
      </button>

      {/* Audio element oculto */}
      <audio
        ref={audioRef}
        src={currentSong.audio_url}
        onEnded={() => pauseSong()}
      />
    </div>
  )
}