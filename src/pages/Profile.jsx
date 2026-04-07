import { useState, useEffect } from 'react'
import { getProfile, getFollowStats, getSongStreams } from '../api/profile'
import { getUserRole, createListenerRole, updateArtistMood, getArtistLevel, getListenerLevel } from '../api/roles'
import { getMySongs } from '../api/songs'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import ArtistModal from '../components/ArtistModal'
import SettingsModal from '../components/SettingsModal'
import SkeletonSongRow from '../components/SkeletonSongRow'

const MOODS = ['Creando', 'Listo para el escenario', 'En estudio', 'Inspirado', 'En racha']

export default function Profile() {
  const navigate = useNavigate()
  const { playSong, currentSong, isPlaying } = usePlayer()

  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [showArtistModal, setShowArtistModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [songs, setSongs] = useState([])
  const [stats, setStats] = useState({ followers: 0, following: 0, streams: 0 })
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const u = await getProfile()
    setUser(u)
    setName(u.user_metadata?.name ?? '')

    let userRole = await getUserRole(u.id)
    if (!userRole) userRole = await createListenerRole(u.id)
    setRole(userRole)

    const [mySongs, followStats] = await Promise.all([
      getMySongs(u.id),
      getFollowStats(u.id)
    ])
    setSongs(mySongs)
    const streams = await getSongStreams(mySongs.map(s => s.id))
    setStats({ ...followStats, streams })
    setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  const handleMoodChange = async (mood) => {
    await updateArtistMood(user.id, mood)
    setRole(prev => ({ ...prev, artist_mood: mood }))
  }

  const isArtist = role?.role === 'artist'
  const artistLevel = isArtist ? getArtistLevel(stats.streams, stats.followers) : null
  const listenerLevel = !isArtist ? getListenerLevel(stats.streams) : null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-3xl space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded-full w-1/3" />
              <div className="h-3.5 bg-gray-200 rounded-full w-1/4" />
            </div>
          </div>
          <div className="flex gap-6 mt-6 pt-6 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-7 w-10 bg-gray-200 rounded-full" />
                <div className="h-3 w-14 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="h-5 bg-gray-200 rounded-full w-1/4 mb-4 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonSongRow key={i} />)}
          </div>
        </div>
      </div>
    </div>
  )

  const avatarPreview = user?.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">

      {showArtistModal && (
        <ArtistModal
          userId={user.id}
          onSuccess={() => { setShowArtistModal(false); loadData() }}
          onClose={() => setShowArtistModal(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          user={user}
          role={role}
          onClose={() => setShowSettings(false)}
          onProfileUpdated={() => { loadData(); setShowSettings(false) }}
        />
      )}

      <div className="container mx-auto px-6 max-w-3xl space-y-6">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-700 flex items-center justify-center text-2xl font-bold text-white uppercase">
                    {name?.[0] ?? '?'}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-black">
                    {isArtist ? role.artist_name : name}
                  </h1>
                  {isArtist ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${artistLevel.color}`}>
                      {artistLevel.level}
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-500 font-medium">
                      {listenerLevel.icon} {listenerLevel.level}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                {role?.description && (
                  <p className="text-gray-500 text-sm mt-1">{role.description}</p>
                )}
                {isArtist && role.artist_bio && !role.description && (
                  <p className="text-gray-500 text-sm mt-1 italic">"{role.artist_bio}"</p>
                )}
                {(role?.instagram || role?.twitter || role?.tiktok || role?.youtube || role?.website) && (
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {role?.instagram && <a href={`https://instagram.com/${role.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Instagram</a>}
                    {role?.twitter && <a href={`https://twitter.com/${role.twitter.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Twitter</a>}
                    {role?.tiktok && <a href={`https://tiktok.com/${role.tiktok.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">TikTok</a>}
                    {role?.youtube && <a href={role.youtube} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">YouTube</a>}
                    {role?.website && <a href={role.website} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Web</a>}
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {isArtist && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">Estado de hoy</p>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map(mood => (
                  <button key={mood} onClick={() => handleMoodChange(mood)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      role.artist_mood === mood
                        ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-black">{songs.length}</p>
              <p className="text-xs text-gray-400">Canciones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-black">{stats.followers}</p>
              <p className="text-xs text-gray-400">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-black">{stats.following}</p>
              <p className="text-xs text-gray-400">Siguiendo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-black">{stats.streams}</p>
              <p className="text-xs text-gray-400">Reproducciones</p>
            </div>
          </div>

          {!isArtist && (
            <button onClick={() => setShowArtistModal(true)}
              className="mt-4 w-full h-11 border-2 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Solicitar verificación de artista
            </button>
          )}
        </div>

        {isArtist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-black mb-4">Mis canciones</h2>
            {songs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No has subido canciones aún.</p>
                <button onClick={() => navigate('/upload')} className="mt-3 text-sm text-purple-600 font-medium hover:underline">
                  + Subir primera canción
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {songs.map(song => {
                  const isCurrentSong = currentSong?.id === song.id
                  return (
                    <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition border border-gray-100">
                      <img src={song.cover_url} alt={song.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-black font-medium text-sm truncate">{song.title}</p>
                        <p className="text-gray-400 text-xs">{song.genre}</p>
                      </div>
                      <button onClick={() => playSong(song)}
                        className="w-9 h-9 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition shrink-0">
                        {isCurrentSong && isPlaying ? (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                        ) : (
                          <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {!isArtist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-black mb-1">Tu nivel de oyente</h2>
            <p className="text-gray-400 text-sm mb-4">Escucha más música para subir de nivel.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '👀', label: 'Curioso', desc: 'Registrarte', done: true },
                { icon: '🗺️', label: 'Explorador', desc: '10 reproducciones', done: stats.streams >= 10 },
                { icon: '🎧', label: 'Melómano', desc: '20 reproducciones', done: stats.streams >= 20 },
                { icon: '🔭', label: 'Descubridor', desc: '50 reproducciones', done: stats.streams >= 50 },
              ].map(lvl => (
                <div key={lvl.label} className={`p-3 rounded-xl border ${lvl.done ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                  <p className="text-2xl mb-1">{lvl.icon}</p>
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