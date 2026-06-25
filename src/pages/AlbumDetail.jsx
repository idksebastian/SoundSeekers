import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAlbum, togglePresave, getPresaveCount, hasPresaved } from '../api/albums'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(null)
  useEffect(() => {
    if (!targetDate) return
    const dateOnly = targetDate.split('T')[0]
    const target = new Date(dateOnly + 'T00:00:00').getTime()
    if (isNaN(target)) return
    const calc = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true }); return }
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), done: false })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return timeLeft
}

export default function AlbumDetail() {
  const { albumId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, currentSong, isPlaying } = usePlayer()
  const [album, setAlbum] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [presaved, setPresaved] = useState(false)
  const [presaveCount, setPresaveCount] = useState(0)
  const [presaving, setPresaving] = useState(false)

  const releaseDate = (!loading && album) ? ((album.presave_date || album.release_date) ?? null) : null
  const countdown = useCountdown(!loading && album?.status === 'presave' ? releaseDate : null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAlbum(albumId)
        setAlbum(data)
        const sorted = [...(data.songs ?? [])].sort((a, b) => (a.track_number ?? 99) - (b.track_number ?? 99))
        setSongs(sorted)
        if (data.status === 'presave') {
          const [count, saved] = await Promise.all([getPresaveCount(albumId), user ? hasPresaved(albumId) : Promise.resolve(false)])
          setPresaveCount(count)
          setPresaved(saved)
        }
      } catch { navigate(-1) }
      finally { setLoading(false) }
    }
    load()
  }, [albumId])

  const handlePresave = async () => {
    if (!user) return navigate('/login')
    setPresaving(true)
    try {
      const saved = await togglePresave(albumId)
      setPresaved(saved)
      setPresaveCount(prev => saved ? prev + 1 : prev - 1)
      if (saved && album?.user_id) {
        const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', album.user_id)
        if (followers?.length) {
          await supabase.from('notifications').insert(followers.map(f => ({ user_id: f.follower_id, type: 'presave', from_user_id: album.user_id, reference_id: albumId, message: `${album.artist_name || 'Un artista que sigues'} activó un presave: "${album.title}"` })))
        }
      }
    } catch (err) { console.error(err) }
    finally { setPresaving(false) }
  }

  const playAlbum = async (startSong) => {
    try {
      const { data: allSongs } = await supabase.from('songs').select('id, title, cover_url, audio_url, display_artist, artist_name, genre, streams, user_id, album_id, album_title').eq('status', 'published').order('created_at', { ascending: false }).limit(50)
      const albumIds = new Set(songs.map(s => s.id))
      const rest = (allSongs ?? []).filter(s => !albumIds.has(s.id)).sort(() => Math.random() - 0.5)
      playSong(startSong, [...songs, ...rest])
    } catch { playSong(startSong, songs) }
  }

  const formatDuration = (secs) => { if (!secs) return '--:--'; return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}` }
  const totalDuration = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0)
  const isPresave = album?.status === 'presave'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-4 sm:space-y-6">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Volver
        </button>

        {isPresave ? (
          // ── ✅ DISEÑO PRESAVE MODO CLARO ──
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Banner morado suave arriba */}
            <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '20px 24px 16px' }}>
              <div className="flex items-center gap-2 mb-1">
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c4b5fd', animation: 'pulse 1.5s infinite' }}/>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Próximo lanzamiento</span>
              </div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                {album?.type === 'ep' ? 'EP' : album?.type === 'album' ? 'Álbum' : 'Single'}
              </p>
            </div>

            {/* Contenido principal en claro */}
            <div className="flex flex-col sm:flex-row gap-5 p-5 sm:p-6">

              {/* Portada */}
              <div className="relative shrink-0 mx-auto sm:mx-0">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden bg-purple-50 shadow-md">
                  {album?.cover_url
                    ? <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-purple-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                      </div>
                  }
                </div>
                {/* Badge presave sobre portada */}
                <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(124,58,237,0.9)', backdropFilter: 'blur(4px)', borderRadius: '100px', padding: '3px 8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#fff' }}>Próximamente</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1">{album?.title}</h1>
                {album?.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{album.description}</p>}

                {/* Fecha */}
                {releaseDate && !isNaN(new Date(releaseDate.split('T')[0] + 'T00:00:00').getTime()) && (
                  <p className="text-sm text-gray-500 mb-4">
                    📅 {new Date(releaseDate.split('T')[0] + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}

                {/* Countdown en modo claro */}
                {countdown && !countdown.done && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Se lanza en</p>
                    <div className="flex gap-3 justify-center sm:justify-start">
                      {[
                        { val: countdown.days, label: 'días' },
                        { val: countdown.hours, label: 'horas' },
                        { val: countdown.minutes, label: 'min' },
                        { val: countdown.seconds, label: 'seg' },
                      ].map(({ val, label }) => (
                        <div key={label} style={{ textAlign: 'center', minWidth: '44px', background: '#f5f3ff', borderRadius: '12px', padding: '8px 6px', border: '1px solid #ede9fe' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#7c3aed', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                            {String(val).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600', marginTop: '2px' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {countdown?.done && (
                  <div className="mb-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    <span className="text-sm font-semibold text-green-700">¡Ya disponible!</span>
                  </div>
                )}

                {/* Botón preguardar */}
                <button onClick={handlePresave} disabled={presaving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition border mx-auto sm:mx-0 ${
                    presaved
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-purple-700 text-white border-purple-700 hover:bg-purple-800'
                  }`}>
                  {presaving
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <svg className="w-4 h-4" fill={presaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                  }
                  {presaved ? 'Guardado' : 'Preguardar'}
                  {presaveCount > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${presaved ? 'bg-purple-200 text-purple-800' : 'bg-white/20 text-white'}`}>
                      {presaveCount}
                    </span>
                  )}
                </button>
                {presaved && <p className="text-xs text-purple-500 mt-2">Recibirás una notificación cuando se publique 🔔</p>}
              </div>
            </div>

            {/* Vista previa canciones — fondo gris muy suave */}
            {songs.length > 0 && (
              <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '16px 20px 20px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                  Vista previa · {songs.length} canción{songs.length !== 1 ? 'es' : ''}
                </p>
                <div className="space-y-1">
                  {songs.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-3 px-2 py-2 rounded-xl" style={{ opacity: 0.6 }}>
                      <span className="text-xs text-gray-400 w-4 text-center shrink-0">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate flex items-center gap-1.5">
                          {song.title}
                          <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                        </p>
                        <p className="text-xs text-gray-400 truncate">{song.display_artist || song.artist_name}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatDuration(song.duration)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : (
          // ── Diseño normal álbum publicado ──
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-6 p-4 sm:p-6">
                <div className="relative shrink-0">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-gray-100 shadow-md mx-auto sm:mx-0">
                    {album?.cover_url
                      ? <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                          <svg className="w-12 h-12 text-purple-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                        </div>
                    }
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">
                    {album?.type === 'ep' ? 'EP' : album?.type === 'album' ? 'Álbum' : 'Single'}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">{album?.title}</h1>
                  {album?.description && <p className="text-gray-400 text-sm mb-3">{album.description}</p>}
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap text-xs text-gray-400 mb-4">
                    {album?.release_date && <span>{new Date(album.release_date).getFullYear()}</span>}
                    {songs.length > 0 && <><span>·</span><span>{songs.length} canción{songs.length !== 1 ? 'es' : ''}</span></>}
                    {totalDuration > 0 && <><span>·</span><span>{Math.floor(totalDuration / 60)} min {totalDuration % 60} seg</span></>}
                  </div>
                  {songs.length > 0 && (
                    <button onClick={() => playAlbum(songs[0])}
                      className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition mx-auto sm:mx-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                      Reproducir todo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6">
                {songs.length === 0
                  ? <p className="text-gray-400 text-sm text-center py-8">Este proyecto aún no tiene canciones.</p>
                  : (
                    <div className="space-y-1">
                      {songs.map((song, index) => {
                        const isCurrentSong = currentSong?.id === song.id
                        return (
                          <div key={song.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition hover:bg-gray-50 cursor-pointer ${isCurrentSong && isPlaying ? 'bg-purple-50' : ''}`}
                            onClick={() => playAlbum(song)}>
                            <div className="w-6 text-center shrink-0">
                              {isCurrentSong && isPlaying
                                ? <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse inline-block"/>
                                : <span className="text-xs text-gray-400">{index + 1}</span>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isCurrentSong && isPlaying ? 'text-purple-700' : 'text-black'}`}>{song.title}</p>
                              <p className="text-xs text-gray-400 truncate">{song.display_artist || song.artist_name}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {song.streams > 0 && <span className="text-xs text-gray-400 hidden sm:block">{song.streams.toLocaleString()} rep.</span>}
                              <span className="text-xs text-gray-400">{formatDuration(song.duration)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
    </div>
  )
}
