import { usePlayer } from '../context/PlayerContext'

export default function Player() {
  const {
    currentSong, isPlaying, isVisible, setIsVisible,
    volume, progress, duration,
    playSong, pauseSong, playNext, playPrev,
    handleSeek, handleVolume, formatTime
  } = usePlayer()

  // No renderiza si no hay canción o si el usuario lo cerró
  if (!currentSong || !isVisible) return null

  return (
    // "relative" es necesario para que el botón ✕ con "absolute" se posicione correctamente dentro del reproductor
    <div className="fixed bottom-0 left-0 right-0 relative bg-white border-t border-gray-200 px-6 py-4 shadow-xl z-50">

      {/* Botón cerrar */}
      <button
        onClick={() => {
          setIsVisible(false)
        }}
        className="absolute top-2 right-4 text-gray-400 hover:text-gray-600 transition text-lg leading-none"
        title="Cerrar reproductor"
      >
        ✕
      </button>

      {/* Barra de progreso */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-gray-400 w-8 text-right">{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1.5 accent-purple-600 cursor-pointer"
        />
        <span className="text-xs text-gray-400 w-8">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-4">

        {/* Portada + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={currentSong.cover_url}
            alt={currentSong.title}
            className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-black font-semibold text-sm truncate">{currentSong.title}</p>
            <p className="text-gray-400 text-xs truncate">🎤 {currentSong.artist_name ?? 'Artista'}</p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          {/* Anterior */}
          <button onClick={playPrev}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
            className="w-12 h-12 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition shadow-md"
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
          </button>

          {/* Siguiente */}
          <button onClick={playNext}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z" />
            </svg>
          </button>
        </div>

        {/* Volumen */}
        <div className="flex items-center gap-2 flex-1 justify-end pr-6">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            className="w-24 h-1.5 accent-purple-600 cursor-pointer"
          />
        </div>

      </div>
    </div>
  )
}
