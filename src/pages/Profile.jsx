import { useState, useRef, useEffect } from 'react'
import { getProfile, updateProfile, getFollowStats, getSongStreams } from '../api/profile'
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
  const avatarInputRef = useRef(null)
  const { playSong, currentSong, isPlaying } = usePlayer()

  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [showArtistModal, setShowArtistModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [songs, setSongs] = useState([])
  const [stats, setStats] = useState({ followers: 0, following: 0, streams: 0 })
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', twitter: '', tiktok: '', youtube: '', website: ''
  })

  const loadData = async () => {
    const u = await getProfile()
    setUser(u)
    setName(u.user_metadata?.name ?? '')
    setEmail(u.email)
    setAvatarPreview(u.user_metadata?.avatar_url ?? null)

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

    setDescription(userRole?.description ?? '')
    setSocialLinks({
      instagram: userRole?.instagram ?? '',
      twitter: userRole?.twitter ?? '',
      tiktok: userRole?.tiktok ?? '',
      youtube: userRole?.youtube ?? '',
      website: userRole?.website ?? '',
    })
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    setError('')
    setMsg('')
    try {
      await updateProfile({ name, avatarFile, description, ...socialLinks })
      setMsg('Perfil actualizado.')
      setAvatarFile(null)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">

      {/* Modales */}
      {showArtistModal && (
        <ArtistModal
          userId={user.id}
          onSuccess={() => { setShowArtistModal(false); loadData() }}
          onClose={() => setShowArtistModal(false)}
        />
      )}
      {showSettings && (
        <SettingsModal user={user} onClose={() => setShowSettings(false)} />
      )}

      <div className="container mx-auto px-6 max-w-3xl space-y-6">

        {/* Card principal */}
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
                <p className="text-gray-400 text-sm">{email}</p>
                {role?.description && (
                  <p className="text-gray-500 text-sm mt-1">{role.description}</p>
                )}
                {isArtist && role.artist_bio && !role.description && (
                  <p className="text-gray-500 text-sm mt-1 italic">"{role.artist_bio}"</p>
                )}

                {/* Redes sociales */}
                {(role?.instagram || role?.twitter || role?.tiktok || role?.youtube || role?.website) && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {role?.instagram && (
                      <a href={`https://instagram.com/${role.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-purple-600 transition">
                        Instagram
                      </a>
                    )}
                    {role?.twitter && (
                      <a href={`https://twitter.com/${role.twitter.replace('@', '')}`} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-purple-600 transition">
                        Twitter
                      </a>
                    )}
                    {role?.tiktok && (
                      <a href={`https://tiktok.com/${role.tiktok.replace('@', '')}`} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-purple-600 transition">
                        TikTok
                      </a>
                    )}
                    {role?.youtube && (
                      <a href={role.youtube} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-purple-600 transition">
                        YouTube
                      </a>
                    )}
                    {role?.website && (
                      <a href={role.website} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-purple-600 transition">
                        Web
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Botones acción */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Editar perfil */}
              <button
                onClick={() => setEditing(!editing)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium transition"
                title="Editar perfil"
              >
                Editar
              </button>
              {/* Ajustes */}
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
            </div>
          </div>

          {/* Mood artista */}
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

          {/* Stats */}
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

          {/* Botón artista */}
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

        {/* Formulario editar */}
        {editing && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-black mb-4">Editar perfil</h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
            {msg && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div onClick={() => avatarInputRef.current?.click()}
                  className="relative group cursor-pointer w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition bg-gray-100">
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Foto de perfil</p>
                  <p className="text-xs text-gray-400 mt-0.5">Recomendado: 400x400px</p>
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <input required value={name} onChange={e => setName(e.target.value)} maxLength={50}
                  className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>

              {/* Nombre artístico — solo lectura si es artista */}
              {isArtist && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nombre artístico</label>
                  <input value={role?.artist_name ?? ''} readOnly
                    className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed" />
                  <p className="text-xs text-gray-400">Para cambiar tu nombre artístico contacta soporte.</p>
                </div>
              )}

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea placeholder="Cuéntale al mundo quién eres..."
                  value={description} onChange={e => setDescription(e.target.value)}
                  maxLength={150} rows={3}
                  className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none" />
                <p className="text-xs text-gray-400 text-right">{description?.length ?? 0}/150</p>
              </div>

              {/* Redes sociales */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Redes sociales</label>
                {[
                  { key: 'instagram', placeholder: 'Instagram (@usuario)', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z' },
                  { key: 'twitter', placeholder: 'Twitter/X (@usuario)', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                  { key: 'tiktok', placeholder: 'TikTok (@usuario)', icon: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z' },
                  { key: 'youtube', placeholder: 'YouTube (URL del canal)', icon: 'M21.593 7.203a2.506 2.506 0 00-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.44a2.56 2.56 0 00-1.766 1.778c-.44 1.61-.44 4.821-.44 4.821s0 3.21.44 4.821c.268.973 1.017 1.671 1.766 1.773C5.736 19 12 19 12 19s6.264 0 7.831-.367a2.51 2.51 0 001.762-1.773c.44-1.61.44-4.821.44-4.821s0-3.21-.44-4.836zM9.996 15.005l.005-6 5.207 3.005-5.212 2.995z' },
                  { key: 'website', placeholder: 'Sitio web (https://...)', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                ].map(({ key, placeholder, icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d={icon} />
                      </svg>
                    </div>
                    <input type="text" placeholder={placeholder}
                      value={socialLinks[key] ?? ''}
                      onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 bg-white border border-gray-300 text-black rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                ))}
              </div>

              {/* Email solo lectura */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
                <input value={email} readOnly
                  className="w-full bg-gray-100 border border-gray-200 text-gray-400 rounded-xl px-4 py-2.5 cursor-not-allowed text-sm" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 h-11 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl font-semibold transition text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 h-11 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Guardando...
                    </>
                  ) : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Canciones */}
        {isArtist && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-black mb-4">Mis canciones</h2>
            {songs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No has subido canciones aún.</p>
                <button onClick={() => navigate('/upload')}
                  className="mt-3 text-sm text-purple-600 font-medium hover:underline">
                  + Subir primera canción
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {songs.map(song => {
                  const isCurrentSong = currentSong?.id === song.id
                  return (
                    <div key={song.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition border border-gray-100">
                      <img src={song.cover_url} alt={song.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-black font-medium text-sm truncate">{song.title}</p>
                        <p className="text-gray-400 text-xs">{song.genre}</p>
                      </div>
                      <button onClick={() => playSong(song)}
                        className="w-9 h-9 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition shrink-0">
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
        )}

        {/* Niveles oyente */}
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
                <div key={lvl.label}
                  className={`p-3 rounded-xl border ${lvl.done ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
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