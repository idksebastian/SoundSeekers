import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicProfile, getPublicProfileStreams, isFollowing, toggleFollow } from '../api/profile'
import { getMySongs } from '../api/songs'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { getUserRole } from '../api/roles'
import SkeletonSongRow from '../components/SkeletonSongRow'
import SettingsModal from '../components/SettingsModal'

export default function ArtistProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { playSong, currentSong, isPlaying } = usePlayer()

  const [profile, setProfile] = useState(null)
  const [songs, setSongs] = useState([])
  const [streams, setStreams] = useState(0)
  const [following, setFollowing] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [role, setRole] = useState(null)

  const isOwnProfile = user?.id === userId

  const loadData = async () => {
    try {
      const [profileData, songsData, streamsData] = await Promise.all([
        getPublicProfile(userId),
        getMySongs(userId),
        getPublicProfileStreams(userId)
      ])
      setProfile(profileData)
      setSongs(songsData)
      setStreams(streamsData)
      if (user && !isOwnProfile) {
        const followStatus = await isFollowing(userId)
        setFollowing(followStatus)
      }
      if (user && isOwnProfile) {
        const userRole = await getUserRole(userId)
        setRole(userRole)
      }
    } catch {
      if (userId === user?.id) {
        navigate('/profile')
      } else {
        setError('Este usuario no tiene perfil de artista.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [userId])

  const handleFollow = async () => {
    if (!user) return navigate('/login')
    setLoadingFollow(true)
    try {
      const newStatus = await toggleFollow(userId)
      setFollowing(newStatus)
      setProfile(prev => ({
        ...prev,
        followers: newStatus ? prev.followers + 1 : prev.followers - 1
      }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingFollow(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-4 sm:space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 animate-pulse">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gray-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-gray-200 rounded-full w-1/3" />
              <div className="h-4 bg-gray-200 rounded-full w-1/4" />
              <div className="h-3 bg-gray-200 rounded-full w-2/3" />
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6 mt-6 pt-6 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-7 w-10 bg-gray-200 rounded-full" />
                <div className="h-3 w-14 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="h-5 bg-gray-200 rounded-full w-1/4 mb-4 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonSongRow key={i} />)}
          </div>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gray-500">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-600 text-sm hover:underline">
          Volver atrás
        </button>
      </div>
    </div>
  )

  const socials = {
    instagram: profile?.instagram,
    twitter: profile?.twitter,
    tiktok: profile?.tiktok,
    youtube: profile?.youtube,
    website: profile?.website,
  }
  const hasSocials = Object.values(socials).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">

      {showSettings && (
        <SettingsModal
          user={user}
          role={role}
          onClose={() => setShowSettings(false)}
          onProfileUpdated={async () => {
            await loadData()
            setShowSettings(false)
          }}
        />
      )}

      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-4 sm:space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.artist_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white uppercase">
                    {profile?.artist_name?.[0] ?? '?'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-black truncate">{profile?.artist_name}</h1>
                  <span className="text-xs px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-600 font-medium shrink-0">
                    Artista
                  </span>
                </div>
                {profile?.artist_genre && (
                  <p className="text-gray-400 text-sm mt-0.5">{profile.artist_genre}</p>
                )}
                {(profile?.description || profile?.artist_bio) && (
                  <p className="text-gray-500 text-sm mt-1 italic">"{profile.description || profile.artist_bio}"</p>
                )}
                {profile?.artist_mood && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-400">{profile.artist_mood}</span>
                  </div>
                )}
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

            <div className="shrink-0">
              {!isOwnProfile && user && (
                <button
                  onClick={handleFollow}
                  disabled={loadingFollow}
                  className={`px-3 sm:px-5 py-2 rounded-xl text-sm font-semibold transition border ${
                    following
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'bg-purple-700 text-white border-purple-700 hover:bg-purple-800'
                  }`}
                >
                  {loadingFollow ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : following ? 'Siguiendo' : 'Seguir'}
                </button>
              )}

              {isOwnProfile && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition"
                  title="Ajustes"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-black">{songs.length}</p>
              <p className="text-xs text-gray-400">Canciones</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-black">{profile?.followers ?? 0}</p>
              <p className="text-xs text-gray-400">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-black">{profile?.following ?? 0}</p>
              <p className="text-xs text-gray-400">Siguiendo</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-black">{streams}</p>
              <p className="text-xs text-gray-400">Reproducciones</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold text-black mb-4">Canciones de {profile?.artist_name}</h2>
          {songs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">
                {isOwnProfile ? 'No has subido canciones aún.' : 'Este artista aún no ha subido canciones.'}
              </p>
              {isOwnProfile && (
                <button onClick={() => navigate('/upload')} className="mt-3 text-sm text-purple-600 font-medium hover:underline">
                  + Subir primera canción
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map(song => {
                const isCurrentSong = currentSong?.id === song.id
                return (
                  <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition border border-gray-100">
                    <img src={song.cover_url} alt={song.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-black font-medium text-sm truncate">{song.title}</p>
                      <p className="text-gray-400 text-xs">{song.genre}</p>
                    </div>
                    {isCurrentSong && isPlaying && (
                      <div className="hidden sm:flex items-center gap-1 text-purple-600 text-xs font-medium shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        Reproduciendo
                      </div>
                    )}
                    <button
                      onClick={() => playSong(song, songs)}
                      className="w-9 h-9 rounded-full bg-purple-700 hover:bg-purple-800 active:bg-purple-900 flex items-center justify-center transition shrink-0"
                    >
                      {isCurrentSong && isPlaying ? (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 3l14 9-14 9V3z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}