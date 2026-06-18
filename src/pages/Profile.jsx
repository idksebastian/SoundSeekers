import { useState, useEffect } from 'react'
import { getProfile, getFollowStats, getSongStreams } from '../api/profile'
import { getUserRole, createListenerRole, updateArtistMood, getArtistLevel, getListenerLevel } from '../api/roles'
import { getMySongs, deleteSong } from '../api/songs'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import ArtistModal from '../components/ArtistModal'
import { supabase } from '../lib/supabase'

const MOODS = ['Creando', 'Listo para el escenario', 'En estudio', 'Inspirado', 'En racha']

const LISTENER_LEVELS = [
  { label: 'Curioso', desc: 'Registrarte en SoundSeekers', min: 0, max: 10, color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff',
    icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg> },
  { label: 'Explorador', desc: '10 reproducciones', min: 10, max: 20, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
    icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg> },
  { label: 'Melómano', desc: '20 reproducciones', min: 20, max: 50, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc',
    icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg> },
  { label: 'Descubridor', desc: '50 reproducciones', min: 50, max: 50, color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg> },
]

// Íconos SVG para redes sociales
const SOCIAL_ICONS = {
  instagram: { label: 'Instagram', color: '#E1306C', bg: '#fdf2f8',
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
  twitter: { label: 'Twitter / X', color: '#000000', bg: '#f9fafb',
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  tiktok: { label: 'TikTok', color: '#010101', bg: '#f9fafb',
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg> },
  youtube: { label: 'YouTube', color: '#FF0000', bg: '#fff5f5',
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  website: { label: 'Sitio web', color: '#6366f1', bg: '#eef2ff',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
}

function getSocialHref(key, value) {
  if (!value) return '#'
  if (key === 'instagram') return `https://instagram.com/${value.replace('@', '')}`
  if (key === 'twitter') return `https://twitter.com/${value.replace('@', '')}`
  if (key === 'tiktok') return `https://tiktok.com/${value.replace('@', '')}`
  if (key === 'youtube') return value.startsWith('http') ? value : `https://youtube.com/${value}`
  if (key === 'website') return value.startsWith('http') ? value : `https://${value}`
  return value
}

export default function Profile() {
  const navigate = useNavigate()
  const { playSong, currentSong, isPlaying } = usePlayer()

  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [showArtistModal, setShowArtistModal] = useState(false)
  const [songs, setSongs] = useState([])
  const [likedSongs, setLikedSongs] = useState([])
  const [stats, setStats] = useState({ followers: 0, following: 0, streams: 0 })
  const [listenerStreams, setListenerStreams] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [activeTab, setActiveTab] = useState('songs') // 'songs' | 'likes'

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

      // Canciones con like
      const { data: likesData } = await supabase
        .from('song_likes')
        .select('song_id, songs(id, title, cover_url, display_artist, audio_url, genre, streams)')
        .eq('user_id', u.id)
      setLikedSongs(likesData?.map(l => l.songs).filter(Boolean) ?? [])

      if (userRole?.role !== 'artist') {
        const { count } = await supabase.from('streams').select('*', { count: 'exact', head: true }).eq('user_id', u.id)
        setListenerStreams(count ?? 0)
      }
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

  const handleUnlike = async (songId) => {
    await supabase.from('song_likes').delete().eq('user_id', user.id).eq('song_id', songId)
    setLikedSongs(prev => prev.filter(s => s.id !== songId))
  }

  const isArtist = role?.role === 'artist'
  const isPending = role?.status === 'pending'
  const artistLevel = isArtist ? getArtistLevel(stats.streams, stats.followers) : null
  const listenerLevel = !isArtist ? getListenerLevel(listenerStreams) : null
  const avatarPreview = user?.user_metadata?.avatar_url ?? null
  const bio = role?.artist_bio ?? role?.description ?? null
  const socials = { instagram: role?.instagram, twitter: role?.twitter, tiktok: role?.tiktok, youtube: role?.youtube, website: role?.website }
  const hasSocials = Object.values(socials).some(Boolean)

  const currentLevelIdx = LISTENER_LEVELS.findIndex(l => l.label === listenerLevel?.level)
  const currentLevel = LISTENER_LEVELS[currentLevelIdx] ?? LISTENER_LEVELS[0]
  const nextLevel = LISTENER_LEVELS[currentLevelIdx + 1] ?? null
  const progressPct = nextLevel
    ? Math.min(100, Math.round(((listenerStreams - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100))
    : 100

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

        {/* Tarjeta principal */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
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
                      <span className="text-xs px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-600 font-medium shrink-0 flex items-center gap-1">
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        {listenerLevel?.level}
                      </span>
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

              {/* Redes sociales con íconos */}
              {hasSocials && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {Object.entries(socials).map(([key, value]) => {
                    if (!value) return null
                    const s = SOCIAL_ICONS[key]
                    if (!s) return null
                    return (
                      <a key={key} href={getSocialHref(key, value)} target="_blank" rel="noreferrer"
                        title={s.label}
                        style={{ background: s.bg, color: s.color }}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition hover:scale-110 hover:shadow-md border border-gray-100">
                        {s.icon}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Estado artista */}
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

          {/* Stats */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 overflow-x-auto">
            {[
              { value: songs.length, label: 'Canciones' },
              { value: stats.followers, label: 'Seguidores' },
              { value: stats.following, label: 'Siguiendo' },
              { value: stats.streams, label: 'Reproducciones' },
            ].map(item => (
              <div key={item.label} className="text-center shrink-0">
                <p className="text-xl sm:text-2xl font-bold text-black">{item.value}</p>
                <p className="text-xs text-gray-400 whitespace-nowrap">{item.label}</p>
              </div>
            ))}
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

        {/* Canciones (artista) con tabs mis canciones / likes */}
        {isArtist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
              <button onClick={() => setActiveTab('songs')}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition ${activeTab === 'songs' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Mis canciones
              </button>
              <button onClick={() => setActiveTab('likes')}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'likes' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <svg className="w-3.5 h-3.5" fill={activeTab === 'likes' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                Me gusta {likedSongs.length > 0 && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{likedSongs.length}</span>}
              </button>
            </div>

            {activeTab === 'songs' && (
              songs.length === 0 ? (
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
                            {deletingId === song.id
                              ? <svg className="w-3 h-3 animate-spin text-red-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                              : <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isConfirming ? 'text-red-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            }
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
              )
            )}

            {activeTab === 'likes' && (
              likedSongs.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  <p className="text-gray-400 text-sm">Aún no has dado like a ninguna canción.</p>
                  <p className="text-xs text-gray-300 mt-1">Da like desde el reproductor para verlas aquí.</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {likedSongs.map(song => {
                    const isCurrentSong = currentSong?.id === song.id
                    return (
                      <div key={song.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-gray-100 hover:bg-purple-50 hover:border-purple-100 transition">
                        <img src={song.cover_url} alt={song.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-black font-medium text-xs sm:text-sm truncate">{song.title}</p>
                          <p className="text-gray-400 text-xs truncate">{song.display_artist}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => handleUnlike(song.id)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-200 bg-purple-50 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition group" title="Quitar like">
                            <svg className="w-3 h-3 text-purple-500 group-hover:text-red-500 transition" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                          </button>
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
              )
            )}
          </div>
        )}

        {/* Likes para oyentes */}
        {!isArtist && likedSongs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-black mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              Canciones que me gustan
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{likedSongs.length}</span>
            </h2>
            <div className="space-y-2">
              {likedSongs.map(song => (
                <div key={song.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-purple-50 hover:border-purple-100 transition">
                  <img src={song.cover_url} alt={song.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-black font-medium text-sm truncate">{song.title}</p>
                    <p className="text-gray-400 text-xs truncate">{song.display_artist}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleUnlike(song.id)} className="w-8 h-8 rounded-full border border-purple-200 bg-purple-50 hover:bg-red-50 flex items-center justify-center transition group" title="Quitar like">
                      <svg className="w-3.5 h-3.5 text-purple-500 group-hover:text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    </button>
                    <button onClick={() => playSong(song)} className="w-9 h-9 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition">
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nivel oyente */}
        {!isArtist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base sm:text-lg font-bold text-black">Tu nivel de oyente</h2>
              <span className="text-xs text-gray-400 font-medium">{listenerStreams} rep. totales</span>
            </div>
            <p className="text-gray-400 text-sm mb-5">Escucha más música en SoundSeekers para subir de nivel.</p>
            {nextLevel && (
              <div className="mb-5 p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div style={{ color: currentLevel.color }}>{currentLevel.icon}</div>
                    <span className="text-sm font-bold text-gray-800">{currentLevel.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">→</span>
                    <div style={{ color: nextLevel.color }}>{nextLevel.icon}</div>
                    <span className="text-sm font-semibold" style={{ color: nextLevel.color }}>{nextLevel.label}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%`, background: `linear-gradient(to right, ${currentLevel.color}, ${nextLevel.color})` }}/>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-right">
                  {listenerStreams} / {nextLevel.min} reproducciones para {nextLevel.label}
                </p>
              </div>
            )}
            {nextLevel === null && (
              <div className="mb-5 p-3.5 rounded-xl border border-amber-200 bg-amber-50 flex items-center gap-3">
                <div className="text-amber-500">{currentLevel.icon}</div>
                <div>
                  <p className="text-sm font-bold text-amber-700">¡Nivel máximo alcanzado!</p>
                  <p className="text-xs text-amber-600">Eres un verdadero Descubridor de música.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {LISTENER_LEVELS.map((lvl) => {
                const done = listenerStreams >= lvl.min
                return (
                  <div key={lvl.label} className="p-3 rounded-xl border transition-all"
                    style={{ borderColor: done ? lvl.border : '#f3f4f6', background: done ? lvl.bg : '#f9fafb', opacity: done ? 1 : 0.5 }}>
                    <div className="mb-1.5" style={{ color: done ? lvl.color : '#9ca3af' }}>{lvl.icon}</div>
                    <p className="text-sm font-semibold" style={{ color: done ? lvl.color : '#9ca3af' }}>{lvl.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{lvl.desc}</p>
                    {done && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: lvl.color }}><path d="M20 6L9 17l-5-5"/></svg>
                        <span className="text-xs font-semibold" style={{ color: lvl.color }}>Desbloqueado</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}