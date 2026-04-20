import { useState, useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { supabase } from '../lib/supabase'

function extractColor(imageUrl, callback) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 50
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, 50, 50)
    const data = ctx.getImageData(0, 0, 50, 50).data
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
    }
    r = Math.floor(r / count)
    g = Math.floor(g / count)
    b = Math.floor(b / count)
    callback(`${r}, ${g}, ${b}`)
  }
  img.onerror = () => callback('45, 5, 80')
  img.src = imageUrl
}

export default function Player() {
  const {
    currentSong, isPlaying, isVisible, setIsVisible,
    isFullscreen, setIsFullscreen,
    volume, progress, duration,
    playSong, pauseSong, playNext, playPrev,
    handleSeek, handleVolume, formatTime
  } = usePlayer()

  const [dominantColor, setDominantColor] = useState('45, 5, 80')
  const [artistInfo, setArtistInfo] = useState(null)
  const [relatedSongs, setRelatedSongs] = useState([])
  const [loadingArtist, setLoadingArtist] = useState(false)

  const coverUrl = currentSong?.cover_url || currentSong?.coverUrl || ''
  const artistName = currentSong?.display_artist || currentSong?.artist_name || currentSong?.artist || 'Artista'
  const isSpotify = currentSong?.isSpotify
  const progressPercent = duration ? (progress / duration) * 100 : 0

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isFullscreen])

  useEffect(() => {
    if (!coverUrl) return
    extractColor(coverUrl, (color) => setDominantColor(color))
  }, [coverUrl])

  useEffect(() => {
    if (!currentSong || isSpotify) {
      setArtistInfo(null)
      setRelatedSongs([])
      return
    }
    const fetchArtistInfo = async () => {
      setLoadingArtist(true)
      try {
        if (currentSong.user_id) {
          const { data: profile } = await supabase
            .from('public_profiles')
            .select('*')
            .eq('user_id', currentSong.user_id)
            .single()
          setArtistInfo(profile)
        }
        const { data: songs } = await supabase
          .from('songs')
          .select('*')
          .eq('user_id', currentSong.user_id)
          .neq('id', currentSong.id)
          .limit(5)
        setRelatedSongs(songs ?? [])
      } catch (err) {
        console.error('Error cargando info artista:', err)
      } finally {
        setLoadingArtist(false)
      }
    }
    fetchArtistInfo()
  }, [currentSong])

  if (!currentSong || !isVisible) return null

  return (
    <>
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: `rgb(${dominantColor})`,
            background: `linear-gradient(160deg, rgb(${dominantColor}) 0%, rgba(${dominantColor}, 0.7) 50%, #080808 100%)`,
            transition: 'background 0.8s ease',
          }}
        >
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 pt-10 pb-4"
            style={{ background: `linear-gradient(to bottom, rgb(${dominantColor}), transparent)` }}
          >
            <button onClick={() => setIsFullscreen(false)}
              className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest">
              {isSpotify ? 'Preview de Spotify' : 'Reproduciendo ahora'}
            </p>
            <button onClick={() => { setIsVisible(false); setIsFullscreen(false) }}
              className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition backdrop-blur-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center px-8 pb-6 gap-5">
            <div className="w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden shadow-2xl">
              {coverUrl ? (
                <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
            </div>

            <div className="text-center w-full max-w-sm">
              <p className="text-white text-2xl font-bold truncate">{currentSong.title}</p>
              <p className="text-white/60 text-base mt-1 truncate">{artistName}</p>
              {currentSong.genre && (
                <span className="inline-block mt-2 text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full">
                  {currentSong.genre}
                </span>
              )}
              {isSpotify && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span className="text-green-400 text-xs font-medium">Preview · 30s</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 pb-6">
            <div className="mb-5">
              <div className="relative h-1 bg-white/20 rounded-full mb-2">
                <div className="absolute top-0 left-0 h-full bg-white rounded-full" style={{ width: `${progressPercent}%` }}/>
                <input type="range" min={0} max={duration || 0} step={0.1} value={progress}
                  onChange={handleSeek} className="absolute inset-0 w-full opacity-0 cursor-pointer"/>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 text-xs">{formatTime(progress)}</span>
                <span className="text-white/50 text-xs">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mb-5">
              <button onClick={playPrev} className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition">
                {isPlaying ? (
                  <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg className="w-7 h-7 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                )}
              </button>
              <button onClick={playNext} className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z"/></svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-white/40 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
              </svg>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={handleVolume} className="flex-1 h-1 accent-white cursor-pointer"/>
              <svg className="w-4 h-4 text-white/40 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </div>
          </div>

          {!isSpotify && (artistInfo || relatedSongs.length > 0) && (
            <div className="flex flex-col items-center pb-4 text-white/30">
              <span className="text-xs mb-1">Desliza para ver más</span>
              <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          )}

          {!isSpotify && (
            <div className="px-8 pb-10" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
              {loadingArtist ? (
                <div className="text-center text-white/40 py-8 text-sm">Cargando info del artista...</div>
              ) : artistInfo ? (
                <div className="mb-8">
                  <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">Sobre el artista</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 shrink-0">
                      {artistInfo.avatar_url ? (
                        <img src={artistInfo.avatar_url} alt={artistInfo.artist_name} className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 font-bold text-2xl">
                          {artistName?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{artistInfo.artist_name ?? artistName}</p>
                      {artistInfo.artist_genre && <p className="text-white/50 text-xs">{artistInfo.artist_genre}</p>}
                      <p className="text-white/50 text-xs mt-1">
                        <span className="text-white font-semibold">{artistInfo.followers ?? 0}</span> seguidores
                      </p>
                    </div>
                  </div>
                  {artistInfo.artist_bio && (
                    <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-2xl p-4">
                      {artistInfo.artist_bio}
                    </p>
                  )}
                  {artistInfo.artist_mood && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-white/40 text-xs">Mood:</span>
                      <span className="text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full">{artistInfo.artist_mood}</span>
                    </div>
                  )}
                </div>
              ) : null}

              {relatedSongs.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-4">
                    Más de {artistName}
                  </p>
                  <div className="flex flex-col gap-2">
                    {relatedSongs.map(song => (
                      <div key={song.id} onClick={() => playSong(song)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition group">
                        <img src={song.cover_url} alt={song.title} className="w-10 h-10 rounded-lg object-cover shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{song.title}</p>
                          <p className="text-white/40 text-xs truncate">{song.display_artist || song.artist_name}</p>
                        </div>
                        <svg className="w-4 h-4 text-white/30 group-hover:text-white/70 transition shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 3l14 9-14 9V3z"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50">
          <div className="relative h-1 bg-gray-100 cursor-pointer">
            <div className="absolute top-0 left-0 h-full bg-purple-600 transition-all" style={{ width: `${progressPercent}%` }}/>
            <input type="range" min={0} max={duration || 0} step={0.1} value={progress}
              onChange={handleSeek} className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"/>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setIsFullscreen(true)}>
              <div className="relative shrink-0">
                {coverUrl ? (
                  <img src={coverUrl} alt={currentSong.title} className="w-12 h-12 rounded-xl object-cover shadow-sm"/>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
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

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={playPrev} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                className="w-10 h-10 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition shadow-md">
                {isPlaying ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                )}
              </button>
              <button onClick={playNext} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z"/></svg>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={handleVolume} className="w-20 h-1.5 accent-purple-600 cursor-pointer"/>
            </div>

            <button onClick={() => setIsFullscreen(true)}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
            </button>

            <button onClick={() => { setIsVisible(false); setIsFullscreen(false) }}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition shrink-0">
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