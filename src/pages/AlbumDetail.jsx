import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAlbum, togglePresave, getPresaveCount, hasPresaved } from '../api/albums'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'

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
          const [count, saved] = await Promise.all([
            getPresaveCount(albumId),
            user ? hasPresaved(albumId) : Promise.resolve(false)
          ])
          setPresaveCount(count)
          setPresaved(saved)
        }
      } catch {
        navigate(-1)
      } finally {
        setLoading(false)
      }
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
    } catch (err) {
      console.error(err)
    } finally {
      setPresaving(false)
    }
  }

  const formatDuration = (secs) => {
    if (!secs) return '--:--'
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
  }

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0)
  const isPresave = album?.status === 'presave'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-4 sm:space-y-6">

        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-6 p-4 sm:p-6">
            <div className="relative shrink-0">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-gray-100 shadow-md mx-auto sm:mx-0">
                {album?.cover_url ? (
                  <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>
              {isPresave && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-purple-600 px-3 py-1.5 rounded-full">Próximamente</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">
                {album?.type === 'ep' ? 'EP' : album?.type === 'album' ? 'Álbum' : 'Single'}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">{album?.title}</h1>
              {album?.description && (
                <p className="text-gray-400 text-sm mb-3">{album.description}</p>
              )}
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap text-xs text-gray-400 mb-4">
                {album?.release_date && (
                  <span>{new Date(album.release_date).getFullYear()}</span>
                )}
                {songs.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{songs.length} canción{songs.length !== 1 ? 'es' : ''}</span>
                  </>
                )}
                {totalDuration > 0 && (
                  <>
                    <span>·</span>
                    <span>{Math.floor(totalDuration / 60)} min {totalDuration % 60} seg</span>
                  </>
                )}
              </div>

              {isPresave ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    {album?.presave_date
                      ? `Sale el ${new Date(album.presave_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : 'Próximo lanzamiento'}
                  </p>
                  <button onClick={handlePresave} disabled={presaving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition border ${
                      presaved
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-purple-700 text-white border-purple-700 hover:bg-purple-800'
                    }`}>
                    {presaving ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill={presaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    )}
                    {presaved ? 'Guardado' : 'Guardar lanzamiento'}
                    {presaveCount > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${presaved ? 'bg-purple-200 text-purple-800' : 'bg-white/20 text-white'}`}>
                        {presaveCount}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                songs.length > 0 && (
                  <button onClick={() => playSong(songs[0], songs)}
                    className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition mx-auto sm:mx-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                    Reproducir todo
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            {songs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Este proyecto aún no tiene canciones.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {songs.map((song, index) => {
                  const isCurrentSong = currentSong?.id === song.id
                  const displayArtist = song.display_artist || song.artist_name
                  const locked = isPresave

                  return (
                    <div key={song.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                        locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                      } ${isCurrentSong && isPlaying ? 'bg-purple-50' : ''}`}
                      onClick={() => !locked && playSong(song, songs)}>

                      <div className="w-6 text-center shrink-0">
                        {isCurrentSong && isPlaying ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse inline-block" />
                        ) : (
                          <span className="text-xs text-gray-400">{index + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isCurrentSong && isPlaying ? 'text-purple-700' : 'text-black'}`}>
                          {song.title}
                          {locked && (
                            <svg className="w-3 h-3 text-gray-400 inline-block ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{displayArtist}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {song.streams > 0 && !locked && (
                          <span className="text-xs text-gray-400 hidden sm:block">{song.streams.toLocaleString()} rep.</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDuration(song.duration)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}