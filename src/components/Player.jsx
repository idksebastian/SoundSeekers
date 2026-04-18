import { useState } from 'react'
import { usePlayer } from '../context/PlayerContext'

export default function Player() {
  const {
    currentSong, isPlaying, isVisible, setIsVisible,
    isFullscreen, setIsFullscreen,
    volume, progress, duration,
    playSong, pauseSong, playNext, playPrev,
    handleSeek, handleVolume, formatTime
  } = usePlayer()

  if (!currentSong || !isVisible) return null

  const coverUrl = currentSong.cover_url || currentSong.coverUrl || ''
  const artistName = currentSong.display_artist || currentSong.artist_name || currentSong.artist || 'Artista'
  const isSpotify = currentSong.isSpotify
  const progressPercent = duration ? (progress / duration) * 100 : 0

  return (
    <>
      {/* ── MODO PANTALLA COMPLETA ── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            background: 'linear-gradient(135deg, #1a0533 0%, #2d1057 40%, #1a0533 100%)',
          }}
        >
          {/* Header fullscreen */}
          <div className="flex items-center justify-between px-6 pt-10 pb-4">
            <button
              onClick={() => setIsFullscreen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div className="text-center">
              <p className="text-white/60 text-xs font-medium uppercase tracking-widest">
                {isSpotify ? 'Preview de Spotify' : 'Reproduciendo ahora'}
              </p>
            </div>
            <button
              onClick={() => { setIsVisible(false); setIsFullscreen(false) }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Portada grande */}
          <div className="flex-1 flex flex-col items-center justify-center px-10 gap-8">
            <div className="w-72 h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-2xl">
              {coverUrl ? (
                <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full bg-purple-900 flex items-center justify-center">
                  <svg className="w-20 h-20 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Info canción */}
            <div className="text-center w-full max-w-sm">
              <p className="text-white text-2xl font-bold truncate">{currentSong.title}</p>
              <p className="text-white/60 text-base mt-1 truncate">{artistName}</p>
              {isSpotify && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span className="text-green-400 text-xs font-medium">Preview de Spotify · 30s</span>
                </div>
              )}
            </div>
          </div>

          {/* Controles fullscreen */}
          <div className="px-8 pb-12">
            {/* Barra de progreso */}
            <div className="mb-5">
              <div className="relative h-1 bg-white/20 rounded-full mb-2 cursor-pointer">
                <div
                  className="absolute top-0 left-0 h-full bg-white rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={progress}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 text-xs">{formatTime(progress)}</span>
                <span className="text-white/50 text-xs">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button onClick={playPrev} className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button
                onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition"
              >
                {isPlaying ? (
                  <svg className="w-7 h-7 text-purple-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-purple-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z"/>
                  </svg>
                )}
              </button>
              <button onClick={playNext} className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z"/>
                </svg>
              </button>
            </div>

            {/* Volumen */}
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-white/50 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
              </svg>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolume}
                className="flex-1 h-1 accent-white cursor-pointer"
              />
              <svg className="w-4 h-4 text-white/50 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── MODO MINI (barra fija abajo) ── */}
      {!isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50">

          {/* Barra de progreso delgada arriba */}
          <div className="relative h-1 bg-gray-100 cursor-pointer">
            <div
              className="absolute top-0 left-0 h-full bg-purple-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
          </div>

          <div className="flex items-center gap-4 px-4 py-3">

            {/* Portada + info — click para fullscreen */}
            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => setIsFullscreen(true)}
            >
              <div className="relative shrink-0">
                {coverUrl ? (
                  <img src={coverUrl} alt={currentSong.title} className="w-12 h-12 rounded-xl object-cover shadow-sm"/>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}
                {isSpotify && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-black font-semibold text-sm truncate">{currentSong.title}</p>
                <p className="text-gray-400 text-xs truncate">{artistName}</p>
              </div>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={playPrev} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button
                onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                className="w-10 h-10 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition shadow-md"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z"/>
                  </svg>
                )}
              </button>
              <button onClick={playNext} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z"/>
                </svg>
              </button>
            </div>

            {/* Volumen + botones extra */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolume}
                className="w-20 h-1.5 accent-purple-600 cursor-pointer"
              />
            </div>

            {/* Botón pantalla completa */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition shrink-0"
              title="Pantalla completa"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
            </button>

            {/* Cerrar */}
            <button
              onClick={() => setIsVisible(false)}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition shrink-0"
              title="Cerrar reproductor"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
