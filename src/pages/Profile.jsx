import { useState, useEffect } from 'react'
import { getProfile, getFollowStats, getSongStreams } from '../api/profile'
import { getUserRole, createListenerRole, updateArtistMood, getArtistLevel, getListenerLevel } from '../api/roles'
import { getMySongs, deleteSong } from '../api/songs'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import ArtistModal from '../components/ArtistModal'

const MOODS = ['Creando', 'Listo para el escenario', 'En estudio', 'Inspirado', 'En racha']

export default function Profile() {
  const navigate = useNavigate()
  const { playSong, currentSong, isPlaying } = usePlayer()

  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [showArtistModal, setShowArtistModal] = useState(false)
  const [songs, setSongs] = useState([])
  const [stats, setStats] = useState({ followers: 0, following: 0, streams: 0 })
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const u = await getProfile()
      setUser(u)
      setName(u.user_metadata?.name ?? '')
      let userRole = await getUserRole(u.id)
      if (!userRole) userRole = await createListenerRole(u.id)
      setRole(userRole)
      const [mySongs, followStats] = await Promise.all([getMySongs(u.id), getFollowStats(u.id)])
      setSongs(mySongs)
      const streams = await getSongStreams(mySongs.map(s => s.id))
      setStats({ ...followStats, streams })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleMoodChange = async (mood) => {
    await updateArtistMood(user.id, mood)
    setRole(prev => ({ ...prev, artist_mood: mood }))
  }

  const handleDeleteSong = async (song) => {
    if (confirmDelete?.id !== song.id) { setConfirmDelete(song); return }
    setDeletingId(song.id)
    try {
      await deleteSong(song.id)
      setSongs(prev => prev.filter(s => s.id !== song.id))
      setConfirmDelete(null)
    } catch (err) { console.error(err) }
    finally { setDeletingId(null) }
  }

  const isArtist = role?.role === 'artist'
  const isPending = role?.status === 'pending'
  const artistLevel = isArtist ? getArtistLevel(stats.streams, stats.followers) : null
  const listenerLevel = !isArtist ? getListenerLevel(stats.streams) : null
  const avatarPreview = user?.user_metadata?.avatar_url ?? null
  const bio = role?.artist_bio ?? role?.description ?? null
  const socials = { instagram: role?.instagram, twitter: role?.twitter, tiktok: role?.tiktok, youtube: role?.youtube, website: role?.website }
  const hasSocials = Object.values(socials).some(Boolean)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded-full w-1/3" />
              <div className="h-3.5 bg-gray-200 rounded-full w-1/4" />
            </div>
          </div>
          <div className="flex gap-4 mt-6 pt-6 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5 flex-1">
                <div className="h-6 bg-gray-200 rounded-full" />
                <div className="h-3 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">

      {showArtistModal && (
        <ArtistModal userId={user.id} onSuccess={() => { setShowArtistModal(false); loadData() }} onClose={() => { setShowArtistModal(false); loadData() }} />
      )}

      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-4 sm:space-y-6">

        {/* Card de perfil */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">

          {/* Header: avatar + info + botón ajustes */}
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-purple-700 flex items-center justify-center text-xl sm:text-2xl font-bold text-white uppercase">
                  {name?.[0] ?? '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-black truncate">{isArtist ? role.artist_name : name}</h1>
                    {isArtist ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${artistLevel.color}`}>{artistLevel.level}</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 font-medium shrink-0">{listenerLevel.icon} {listenerLevel.level}</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm truncate">{user?.email}</p>
                  {bio && <p className="text-gray-500 text-xs sm:text-sm mt-1 italic line-clamp-2">"{bio}"</p>}
                </div>
                <button onClick={() => navigate('/settings')} className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition shrink-0">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              {hasSocials && (
                <div className="flex gap-3 mt-2 flex-wrap">
                  {socials.instagram && <a href={`https://instagram.com/${socials.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Instagram</a>}
                  {socials.twitter && <a href={`https://twitter.com/${socials.twitter.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Twitter</a>}
                  {socials.tiktok && <a href={`https://tiktok.com/${socials.tiktok.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">TikTok</a>}
                  {socials.youtube && <a href={socials.youtube} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">YouTube</a>}
                  {socials.website && <a href={socials.website} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Web</a>}
                </div>
              )}
            </div>
          </div>

          {/* Mood selector */}
          {isArtist && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">Estado de hoy</p>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map(mood => (
                  <button key={mood} onClick={() => handleMoodChange(mood)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${role.artist_mood === mood ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats — scroll horizontal en mobile muy pequeño */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 overflow-x-auto">
            <div className="text-center shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-black">{songs.length}</p>
              <p className="text-xs text-gray-400 whitespace-nowrap">Canciones</p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-black">{stats.followers}</p>
              <p className="text-xs text-gray-400 whitespace-nowrap">Seguidores</p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-black">{stats.following}</p>
              <p className="text-xs text-gray-400 whitespace-nowrap">Siguiendo</p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-black">{stats.streams}</p>
              <p className="text-xs text-gray-400 whitespace-nowrap">Reproducciones</p>
            </div>
          </div>

          {!isArtist && (
            isPending ? (
              <div className="mt-4 w-full h-11 border border-yellow-200 bg-yellow-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-yellow-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Solicitud en revisión
              </div>
            ) : (
              <button onClick={() => setShowArtistModal(true)} className="mt-4 w-full h-11 border-2 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                Solicitar verificación de artista
              </button>
            )
          )}
        </div>

        {/* Mis canciones */}
        {isArtist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-black mb-4">Mis canciones</h2>
            {songs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No has subido canciones aún.</p>
                <button onClick={() => navigate('/upload')} className="mt-3 text-sm text-purple-600 font-medium hover:underline">+ Subir primera canción</button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {songs.map(song => {
                  const isCurrentSong = currentSong?.id === song.id
                  const isConfirming = confirmDelete?.id === song.id
                  return (
                    <div key={song.id} className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition border ${isConfirming ? 'border-red-200 bg-red-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <img src={song.cover_url} alt={song.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-black font-medium text-xs sm:text-sm truncate">{song.title}</p>
                        <p className="text-gray-400 text-xs">{song.genre}</p>
                        {isConfirming && <p className="text-red-500 text-xs mt-0.5 font-medium">¿Seguro? No se puede deshacer.</p>}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button onClick={() => navigate(`/edit/${song.id}`)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center transition">
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => isConfirming ? handleDeleteSong(song) : setConfirmDelete(song)} disabled={deletingId === song.id}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition disabled:opacity-50 ${isConfirming ? 'border-red-300 bg-red-100 hover:bg-red-200' : 'border-gray-200 hover:bg-red-50 hover:border-red-200'}`}>
                          {deletingId === song.id ? (
                            <svg className="w-3 h-3 animate-spin text-red-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          ) : (
                            <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isConfirming ? 'text-red-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          )}
                        </button>
                        {isConfirming && (
                          <button onClick={() => setConfirmDelete(null)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center transition">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                        <button onClick={() => playSong(song)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition">
                          {isCurrentSong && isPlaying
                            ? <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                            : <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Nivel de oyente */}
        {!isArtist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-black mb-1">Tu nivel de oyente</h2>
            <p className="text-gray-400 text-sm mb-4">Escucha más música para subir de nivel.</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { icon: '👀', label: 'Curioso', desc: 'Registrarte', done: true },
                { icon: '🗺️', label: 'Explorador', desc: '10 reproducciones', done: stats.streams >= 10 },
                { icon: '🎧', label: 'Melómano', desc: '20 reproducciones', done: stats.streams >= 20 },
                { icon: '🔭', label: 'Descubridor', desc: '50 reproducciones', done: stats.streams >= 50 },
              ].map(lvl => (
                <div key={lvl.label} className={`p-3 rounded-xl border ${lvl.done ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                  <p className="text-xl mb-1">{lvl.icon}</p>
                  <p className={`text-sm font-semibold ${lvl.done ? 'text-purple-700' : 'text-gray-400'}`}>{lvl.label}</p>
                  <p className="text-xs text-gray-400">{lvl.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
