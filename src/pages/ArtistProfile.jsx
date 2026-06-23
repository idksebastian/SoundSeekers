import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicProfile, getPublicProfileStreams, isFollowing, toggleFollow, getFollowers, getFollowing } from '../api/profile'
import { getMySongs, getAppearsIn } from '../api/songs'
import { getArtistAlbums } from '../api/albums'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { getUserRole } from '../api/roles'
import SkeletonSongRow from '../components/SkeletonSongRow'
import { supabase } from '../lib/supabase'

const TABS = ['Populares', 'Álbumes', 'EPs', 'Singles', 'Aparece en']

function FollowModal({ title, users: initialUsers, onClose, onNavigate, currentUserId }) {
  const [users, setUsers] = useState(initialUsers)
  const [loadingFollow, setLoadingFollow] = useState({})

  useEffect(() => { setUsers(initialUsers) }, [initialUsers])

  const handleToggleFollow = async (e, targetUserId) => {
    e.stopPropagation()
    if (!currentUserId) return
    setLoadingFollow(prev => ({ ...prev, [targetUserId]: true }))
    try {
      const newStatus = await toggleFollow(targetUserId)
      setUsers(prev => prev.map(u =>
        u.user_id === targetUserId ? { ...u, is_following: newStatus } : u
      ))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingFollow(prev => ({ ...prev, [targetUserId]: false }))
    }
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111', margin: 0 }}>{title}</h3>
            <button
              onClick={onClose}
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
            {users.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '8px' }}>
                <svg width="40" height="40" fill="none" stroke="#e5e7eb" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>No hay usuarios aún.</p>
              </div>
            ) : (
              users.map(u => {
                const isMe = u.user_id === currentUserId
                const isFollowingUser = u.is_following
                const isLoading = loadingFollow[u.user_id]
                return (
                  <div
                    key={u.user_id}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { onNavigate(u.user_id); onClose() }}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb', flexShrink: 0 }}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.artist_name || u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>
                          {(u.artist_name || u.name)?.[0] ?? '?'}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                        {u.artist_name || u.name}
                      </p>
                      {u.artist_name && u.name && (
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                      )}
                      {u.artist_genre && (
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.artist_genre}</p>
                      )}
                    </div>
                    {!isMe && currentUserId && (
                      <button
                        onClick={(e) => handleToggleFollow(e, u.user_id)}
                        disabled={isLoading}
                        style={{ flexShrink: 0, padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: isFollowingUser ? '1px solid #e5e7eb' : '1px solid #7c3aed', background: isFollowingUser ? '#fff' : '#7c3aed', color: isFollowingUser ? '#374151' : '#fff', cursor: 'pointer', minWidth: '76px', textAlign: 'center', fontFamily: 'inherit' }}
                      >
                        {isLoading ? (
                          <svg style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite', margin: '0 auto', display: 'block' }} fill="none" viewBox="0 0 24 24">
                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : isFollowingUser ? 'Siguiendo' : 'Seguir'}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function ArtistProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { playSong, currentSong, isPlaying } = usePlayer()

  const [profile, setProfile] = useState(null)
  const [songs, setSongs] = useState([])
  const [albums, setAlbums] = useState([])
  const [appearsIn, setAppearsIn] = useState([])
  const [streams, setStreams] = useState(0)
  const [following, setFollowing] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [role, setRole] = useState(null)
  const [activeTab, setActiveTab] = useState('Populares')
  const [followModal, setFollowModal] = useState(null)
  const [followModalUsers, setFollowModalUsers] = useState([])
  const [loadingModal, setLoadingModal] = useState(false)

  const isOwnProfile = user?.id === userId

  const loadData = async () => {
    try {
      const [profileData, songsData, streamsData, albumsData, appearsInData] = await Promise.all([
        getPublicProfile(userId),
        getMySongs(userId),
        getPublicProfileStreams(userId),
        getArtistAlbums(userId),
        getAppearsIn(userId),
      ])
      setProfile(profileData)
      setSongs(songsData)
      setStreams(streamsData)
      setAlbums(albumsData)
      setAppearsIn(appearsInData)
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
        navigate(`/listener/${userId}`, { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // ✅ Realtime: actualizar contador de seguidores en tiempo real
    const channel = supabase
      .channel(`follows:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'follows',
        filter: `following_id=eq.${userId}`
      }, async () => {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId)
        setProfile(prev => prev ? { ...prev, followers: count ?? 0 } : prev)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [userId])

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

  const handleOpenFollowModal = (type) => {
    navigate(`/artist/${userId}/followers`, { state: { tab: type } })
  }

  const singles = songs.filter(s => !s.album_id)
  const albumList = albums.filter(a => a.type === 'album')
  const epList = albums.filter(a => a.type === 'ep')
  const popularSongs = [...songs].sort((a, b) => (b.streams ?? 0) - (a.streams ?? 0)).slice(0, 5)

  const SongRow = ({ song, queue }) => {
    const isCurrentSong = currentSong?.id === song.id
    const displayName = song.display_artist || song.artist_name
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition border border-gray-100">
        <img src={song.cover_url} alt={song.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-black font-medium text-sm truncate">{song.title}</p>
          <p className="text-gray-400 text-xs truncate">{displayName}</p>
        </div>
        {song.streams > 0 && (
          <p className="text-xs text-gray-400 hidden sm:block shrink-0">{song.streams.toLocaleString()} rep.</p>
        )}
        {isCurrentSong && isPlaying && (
          <div className="hidden sm:flex items-center gap-1 text-purple-600 text-xs font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          </div>
        )}
        {isOwnProfile && (
          <button onClick={e => { e.stopPropagation(); navigate(`/edit/${song.id}`) }}
            className="w-9 h-9 rounded-full border border-gray-200 hover:bg-purple-50 hover:border-purple-200 flex items-center justify-center transition shrink-0">
            <svg className="w-3.5 h-3.5 text-gray-400 hover:text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
        )}
        <button onClick={() => playSong(song, queue)}
          className="w-9 h-9 rounded-full bg-purple-700 hover:bg-purple-800 active:bg-purple-900 flex items-center justify-center transition shrink-0">
          {isCurrentSong && isPlaying ? (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
          ) : (
            <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
          )}
        </button>
      </div>
    )
  }

  const AlbumCard = ({ album }) => (
    <div onClick={() => navigate(`/album/${album.id}`)}
      className="bg-gray-50 rounded-2xl p-3 hover:bg-gray-100 transition cursor-pointer">
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-gray-200">
        {album.cover_url ? (
          <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-purple-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg>
          </div>
        )}
        {album.status === 'presave' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <span className="text-white text-xs font-bold bg-purple-600 px-2 py-1 rounded-full">Próximamente</span>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-black truncate">{album.title}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {album.release_date ? new Date(album.release_date).getFullYear() : '—'} · {album.type === 'ep' ? 'EP' : album.type === 'album' ? 'Álbum' : 'Single'}
      </p>
    </div>
  )

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
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
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
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-600 text-sm hover:underline">Volver atrás</button>
      </div>
    </div>
  )

  const socials = { instagram: profile?.instagram, twitter: profile?.twitter, tiktok: profile?.tiktok, youtube: profile?.youtube, website: profile?.website }
  const hasSocials = Object.values(socials).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      {followModal && (
        <FollowModal
          title={
            followModal === 'followers'
              ? `Seguidores (${profile?.followers ?? 0})`
              : `Siguiendo (${profile?.following ?? 0})`
          }
          users={loadingModal ? [] : followModalUsers}
          onClose={() => setFollowModal(null)}
          onNavigate={(uid) => navigate(`/artist/${uid}`)}
          currentUserId={user?.id ?? null}
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
                  <span className="text-xs px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-600 font-medium shrink-0">Artista</span>
                </div>
                {profile?.artist_genre && <p className="text-gray-400 text-sm mt-0.5">{profile.artist_genre}</p>}
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
                <button onClick={handleFollow} disabled={loadingFollow}
                  className={`px-3 sm:px-5 py-2 rounded-xl text-sm font-semibold transition border ${
                    following ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-purple-700 text-white border-purple-700 hover:bg-purple-800'
                  }`}>
                  {loadingFollow ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : following ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
              {isOwnProfile && (
                <button onClick={() => navigate('/settings')}
                  className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-black leading-tight">{songs.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Canciones</p>
            </div>
            <button
              className="text-center hover:bg-gray-50 rounded-xl transition py-1 cursor-pointer"
              onClick={() => handleOpenFollowModal('followers')}>
              <p className="text-lg sm:text-2xl font-bold text-black leading-tight">{profile?.followers ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Seguidores</p>
            </button>
            <button
              className="text-center hover:bg-gray-50 rounded-xl transition py-1 cursor-pointer"
              onClick={() => handleOpenFollowModal('following')}>
              <p className="text-lg sm:text-2xl font-bold text-black leading-tight">{profile?.following ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Siguiendo</p>
            </button>
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-black leading-tight truncate">{streams.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">Reproducciones</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
            {TABS.filter(tab => {
              if (tab === 'Álbumes' && albumList.length === 0) return false
              if (tab === 'EPs' && epList.length === 0) return false
              if (tab === 'Singles' && singles.length === 0) return false
              if (tab === 'Aparece en' && appearsIn.length === 0) return false
              return true
            }).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 py-1.5 rounded-xl text-sm font-medium transition ${
                  activeTab === tab ? 'bg-purple-700 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'Populares' && (
              <div className="space-y-3">
                {popularSongs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">{isOwnProfile ? 'No has subido canciones aún.' : 'Este artista aún no ha subido canciones.'}</p>
                    {isOwnProfile && (
                      <button onClick={() => navigate('/upload')} className="mt-3 text-sm text-purple-600 font-medium hover:underline">+ Subir primera canción</button>
                    )}
                  </div>
                ) : popularSongs.map(song => <SongRow key={song.id} song={song} queue={popularSongs} />)}
              </div>
            )}
            {activeTab === 'Álbumes' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {albumList.map(album => <AlbumCard key={album.id} album={album} />)}
              </div>
            )}
            {activeTab === 'EPs' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {epList.map(album => <AlbumCard key={album.id} album={album} />)}
              </div>
            )}
            {activeTab === 'Singles' && (
              <div className="space-y-3">
                {singles.map(song => <SongRow key={song.id} song={song} queue={singles} />)}
              </div>
            )}
            {activeTab === 'Aparece en' && (
              <div className="space-y-3">
                {appearsIn.map(song => <SongRow key={song.id} song={song} queue={appearsIn} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}