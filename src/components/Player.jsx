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
    // Oscurecer el color para que sea más como Spotify
    r = Math.floor(Math.floor(r / count) * 0.6)
    g = Math.floor(Math.floor(g / count) * 0.6)
    b = Math.floor(Math.floor(b / count) * 0.6)
    callback(`${r}, ${g}, ${b}`)
  }
  img.onerror = () => callback('30, 10, 60')
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

  const [dominantColor, setDominantColor] = useState('30, 10, 60')
  const [artistInfo, setArtistInfo] = useState(null)
  const [relatedSongs, setRelatedSongs] = useState([])
  const [loadingArtist, setLoadingArtist] = useState(false)

  const coverUrl = currentSong?.cover_url || currentSong?.coverUrl || ''
  const artistName = currentSong?.display_artist || currentSong?.artist_name || currentSong?.artist || 'Artista'
  const isSpotify = currentSong?.isSpotify
  const progressPercent = duration ? (progress / duration) * 100 : 0

  // Bloquear scroll de la página en fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [isFullscreen])

  // Extraer color dominante
  useEffect(() => {
    if (!coverUrl) return
    extractColor(coverUrl, (color) => setDominantColor(color))
  }, [coverUrl])

  // Info del artista
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
      {/* ══════════════════════════════
          PANTALLA COMPLETA TIPO SPOTIFY
          ══════════════════════════════ */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            overflowY: 'auto',
            overflowX: 'hidden',
            // Fondo completamente opaco — no se ve nada de atrás
            backgroundColor: `rgb(${dominantColor})`,
            background: `
              radial-gradient(ellipse at top left, rgba(${dominantColor}, 1) 0%, transparent 60%),
              radial-gradient(ellipse at top right, rgba(${dominantColor}, 0.6) 0%, transparent 50%),
              linear-gradient(180deg, rgb(${dominantColor}) 0%, #0a0a0a 55%)
            `,
            // Esto es CRÍTICO para que no se vea el fondo
            isolation: 'isolate',
          }}
        >
          {/* Capa negra base para garantizar opacidad total */}
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#0a0a0a',
            zIndex: -1,
          }}/>

          {/* ── Header ── */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 24px 16px',
            background: `linear-gradient(to bottom, rgb(${dominantColor}) 0%, transparent 100%)`,
          }}>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
            >
              <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
                {isSpotify ? 'Preview de Spotify' : 'Reproduciendo ahora'}
              </p>
            </div>

            <button
              onClick={() => { setIsVisible(false); setIsFullscreen(false) }}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
            >
              <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ── Portada ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 32px 24px', gap: 24 }}>
            <div style={{
              width: '280px', height: '280px',
              borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              flexShrink: 0,
            }}>
              {coverUrl ? (
                <img src={coverUrl} alt={currentSong.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="60" height="60" fill="rgba(255,255,255,0.3)" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Info canción */}
            <div style={{ width: '100%', maxWidth: '340px', textAlign: 'left' }}>
              <p style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentSong.title}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {artistName}
              </p>
              {currentSong.genre && (
                <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 100 }}>
                  {currentSong.genre}
                </span>
              )}
              {isSpotify && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <svg width="14" height="14" fill="#1DB954" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span style={{ color: '#1DB954', fontSize: 12, fontWeight: 600 }}>Preview · 30 segundos</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Controles ── */}
          <div style={{ padding: '0 32px 32px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
            {/* Barra de progreso */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 6, cursor: 'pointer' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  height: '100%', borderRadius: 2,
                  background: '#fff',
                  width: `${progressPercent}%`,
                  transition: 'width 0.1s linear',
                }}/>
                <input type="range" min={0} max={duration || 0} step={0.1} value={progress}
                  onChange={handleSeek}
                  style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{formatTime(progress)}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Botones principales */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 28 }}>
              <button onClick={playPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.7)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              >
                <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>

              <button
                onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isPlaying ? (
                  <svg width="26" height="26" fill="#000" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg width="26" height="26" fill="#000" viewBox="0 0 24 24" style={{ marginLeft: 3 }}><path d="M5 3l14 9-14 9V3z"/></svg>
                )}
              </button>

              <button onClick={playNext} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.7)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              >
                <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z"/></svg>
              </button>
            </div>

            {/* Volumen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" fill="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
              </svg>
              <div style={{ flex: 1, position: 'relative', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 2, background: '#fff', width: `${volume * 100}%` }}/>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={handleVolume}
                  style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                />
              </div>
              <svg width="16" height="16" fill="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </div>
          </div>

          {/* ── Info artista y relacionadas (al deslizar) ── */}
          {!isSpotify && (
            <>
              {/* Separador con indicador */}
              {(artistInfo || relatedSongs.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 20px', color: 'rgba(255,255,255,0.25)' }}>
                  <span style={{ fontSize: 11, marginBottom: 4 }}>Desliza para ver más</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animation: 'bounce 1.5s infinite' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              )}

              <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(30px)', padding: '28px 24px 60px' }}>

                {/* Info artista */}
                {loadingArtist ? (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Cargando...</p>
                ) : artistInfo ? (
                  <div style={{ marginBottom: 32 }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px' }}>
                      Sobre el artista
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>
                        {artistInfo.avatar_url ? (
                          <img src={artistInfo.avatar_url} alt={artistInfo.artist_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 22, fontWeight: 800 }}>
                            {artistName?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 2px' }}>{artistInfo.artist_name ?? artistName}</p>
                        {artistInfo.artist_genre && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 3px' }}>{artistInfo.artist_genre}</p>}
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>
                          <span style={{ color: '#fff', fontWeight: 700 }}>{artistInfo.followers ?? 0}</span> seguidores
                        </p>
                      </div>
                    </div>
                    {artistInfo.artist_bio && (
                      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.6, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', margin: 0 }}>
                        {artistInfo.artist_bio}
                      </p>
                    )}
                    {artistInfo.artist_mood && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Mood:</span>
                        <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '3px 10px', borderRadius: 100 }}>{artistInfo.artist_mood}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Canciones relacionadas */}
                {relatedSongs.length > 0 && (
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px' }}>
                      Más de {artistName}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {relatedSongs.map(song => (
                        <div
                          key={song.id}
                          onClick={() => playSong(song)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)',
                            cursor: 'pointer', transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                          <img src={song.cover_url} alt={song.title} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>{song.display_artist || song.artist_name}</p>
                          </div>
                          <svg width="14" height="14" fill="rgba(255,255,255,0.3)" viewBox="0 0 24 24">
                            <path d="M5 3l14 9-14 9V3z"/>
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }`}</style>
        </div>
      )}

      {/* ══════════════════════════
          MINI REPRODUCTOR (barra)
          ══════════════════════════ */}
      {!isFullscreen && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          zIndex: 50,
        }}>
          {/* Barra de progreso delgada */}
          <div style={{ position: 'relative', height: 3, background: '#f3f4f6', cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: '#7c3aed', width: `${progressPercent}%`, transition: 'width 0.1s linear' }}/>
            <input type="range" min={0} max={duration || 0} step={0.1} value={progress}
              onChange={handleSeek}
              style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0, height: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>

            {/* Portada + info → abre fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
              onClick={() => setIsFullscreen(true)}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {coverUrl ? (
                  <img src={coverUrl} alt={currentSong.title} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block' }}/>
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" fill="#7c3aed" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                  </div>
                )}
                {isSpotify && (
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#1DB954', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" fill="#fff" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#111', fontWeight: 700, fontSize: 13, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSong.title}</p>
                <p style={{ color: '#9ca3af', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artistName}</p>
              </div>
            </div>

            {/* Controles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={playPrev} style={{ width: 34, height: 34, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>

              <button onClick={() => isPlaying ? pauseSong() : playSong(currentSong)}
                style={{ width: 42, height: 42, borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.35)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}>
                {isPlaying ? (
                  <svg width="16" height="16" fill="#fff" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg width="16" height="16" fill="#fff" viewBox="0 0 24 24" style={{ marginLeft: 2 }}><path d="M5 3l14 9-14 9V3z"/></svg>
                )}
              </button>

              <button onClick={playNext} style={{ width: 34, height: 34, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z"/></svg>
              </button>
            </div>

            {/* Volumen (solo desktop) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }} className="hidden md:flex">
              <svg width="14" height="14" fill="#9ca3af" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <div style={{ position: 'relative', width: 80, height: 4, background: '#e5e7eb', borderRadius: 2 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 2, background: '#7c3aed', width: `${volume * 100}%` }}/>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={handleVolume}
                  style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                />
              </div>
            </div>

            {/* Botón fullscreen */}
            <button onClick={() => setIsFullscreen(true)}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Pantalla completa">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
            </button>

            {/* Cerrar */}
            <button onClick={() => { setIsVisible(false); setIsFullscreen(false) }}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
