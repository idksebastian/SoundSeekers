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
    const target = new Date(targetDate + 'T00:00:00').getTime()
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

  const releaseDate = (album?.presave_date || album?.release_date) ?? null
  const countdown = useCountdown(!loading && album?.status === 'presave' && releaseDate ? releaseDate : null)

  if (loading) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg></div>)

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-4 sm:space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Volver
        </button>

        {isPresave ? (
          <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(160deg, #1a0533 0%, #2d1b69 60%, #0f0a1e 100%)' }}>
            <div className="relative">
              {album?.cover_url ? (
                <>
                  <img src={album.cover_url} alt={album.title} className="w-full object-cover" style={{ maxHeight: '300px', objectPosition: 'center 20%', filter: 'brightness(0.45)' }}/>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 20%, #1a0533 100%)' }}/>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <svg className="w-14 h-14 text-purple-500 opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
                </div>
              )}
              {countdown && !countdown.done && (
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"/>
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Se lanza en</span>
                  </div>
                  <div className="flex gap-4">
                    {[{ val: countdown.days, label: 'días' }, { val: countdown.hours, label: 'horas' }, { val: countdown.minutes, label: 'min' }, { val: countdown.seconds, label: 'seg' }].map(({ val, label }) => (
                      <div key={label} className="text-center min-w-[40px]">
                        <div className="text-3xl sm:text-4xl font-bold text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{String(val).padStart(2, '0')}</div>
                        <div className="text-xs text-purple-300 mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {countdown?.done && <div className="absolute bottom-0 left-0 right-0 px-5 pb-5"><span className="text-sm font-bold text-green-400">¡Ya disponible!</span></div>}
            </div>
            <div className="px-5 pb-5 pt-3">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">{album?.type === 'ep' ? 'EP' : album?.type === 'album' ? 'Álbum' : 'Single'} · Próximamente</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{album?.title}</h1>
              {album?.description && <p className="text-purple-300 text-sm mb-3">{album.description}</p>}
              {releaseDate && <p className="text-sm text-purple-400 mb-4">Lanzamiento: {new Date(releaseDate + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
              <button onClick={handlePresave} disabled={presaving}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition ${presaved ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-900/50'}`}>
                {presaving ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <svg className="w-4 h-4" fill={presaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>}
                {presaved ? 'Guardado ✓' : 'Preguardar'}
                {presaveCount > 0 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">{presaveCount}</span>}
              </button>
              {presaved && <p className="text-xs text-purple-400 mt-2">Recibirás una notificación cuando se publique 🔔</p>}
            </div>
            {songs.length > 0 && (
              <div className="border-t border-white/10 px-5 pb-6 pt-4">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Vista previa · {songs.length} canción{songs.length !== 1 ? 'es' : ''}</p>
                <div className="space-y-1">
                  {songs.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-3 px-2 py-2 rounded-xl opacity-50">
                      <span className="text-xs text-purple-400 w-4 text-center shrink-0">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                          {song.title}
                          <svg className="w-3 h-3 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        </p>
                        <p className="text-xs text-purple-400 truncate">{song.display_artist || song.artist_name}</p>
                      </div>
                      <span className="text-xs text-purple-500 shrink-0">{formatDuration(song.duration)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-6 p-4 sm:p-6">
                <div className="relative shrink-0">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-gray-100 shadow-md mx-auto sm:mx-0">
                    {album?.cover_url ? <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-purple-100 flex items-center justify-center"><svg className="w-12 h-12 text-purple-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg></div>}
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">{album?.type === 'ep' ? 'EP' : album?.type === 'album' ? 'Álbum' : 'Single'}</p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">{album?.title}</h1>
                  {album?.description && <p className="text-gray-400 text-sm mb-3">{album.description}</p>}
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap text-xs text-gray-400 mb-4">
                    {album?.release_date && <span>{new Date(album.release_date).getFullYear()}</span>}
                    {songs.length > 0 && <><span>·</span><span>{songs.length} canción{songs.length !== 1 ? 'es' : ''}</span></>}
                    {totalDuration > 0 && <><span>·</span><span>{Math.floor(totalDuration / 60)} min {totalDuration % 60} seg</span></>}
                  </div>
                  {songs.length > 0 && (
                    <button onClick={() => playAlbum(songs[0])} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition mx-auto sm:mx-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                      Reproducir todo
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6">
                {songs.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Este proyecto aún no tiene canciones.</p> : (
                  <div className="space-y-1">
                    {songs.map((song, index) => {
                      const isCurrentSong = currentSong?.id === song.id
                      return (
                        <div key={song.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition hover:bg-gray-50 cursor-pointer ${isCurrentSong && isPlaying ? 'bg-purple-50' : ''}`} onClick={() => playAlbum(song)}>
                          <div className="w-6 text-center shrink-0">{isCurrentSong && isPlaying ? <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse inline-block"/> : <span className="text-xs text-gray-400">{index + 1}</span>}</div>
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}