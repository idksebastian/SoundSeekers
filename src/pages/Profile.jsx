import { useState, useRef, useEffect } from 'react'
import { getProfile, updateProfile, getFollowStats, getSongStreams } from '../api/profile'
import { getMySongs } from '../api/songs'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'

export default function Profile() {
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)
  const { playSong, currentSong, isPlaying } = usePlayer()

  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [songs, setSongs] = useState([])
  const [stats, setStats] = useState({ followers: 0, following: 0, streams: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const u = await getProfile()
      setUser(u)
      setName(u.user_metadata?.name ?? '')
      setEmail(u.email)
      setAvatarPreview(u.user_metadata?.avatar_url ?? null)

      const [mySongs, followStats] = await Promise.all([
        getMySongs(u.id),
        getFollowStats(u.id)
      ])
      setSongs(mySongs)

      const streams = await getSongStreams(mySongs.map(s => s.id))
      setStats({ ...followStats, streams })
      setLoading(false)
    }
    loadData()
  }, [])

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
      await updateProfile({ name, avatarFile })
      setMsg('Perfil actualizado correctamente.')
      setAvatarFile(null)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-3xl">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
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
                <h1 className="text-2xl font-bold text-black">{name}</h1>
                <p className="text-gray-400 text-sm">{email}</p>
              </div>
            </div>


            <button onClick={() => setEditing(!editing)} className="w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition" title="Editar perfil" >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <div className="flex gap-6 mt-6 pt-6 border-t border-gray-100">
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
        </div>

        {editing && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-black mb-4">Editar perfil</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
            )}
            {msg && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="flex items-center gap-4">
                <div onClick={() => avatarInputRef.current?.click()} className="relative group cursor-pointer w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors bg-gray-100" >
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <p className="text-xs text-gray-400">Clic para cambiar foto</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <input required value={name} onChange={e => setName(e.target.value)} maxLength={50}
                  className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
                <input value={email} readOnly
                  className="w-full bg-gray-100 border border-gray-200 text-gray-400 rounded-xl px-4 py-2.5 cursor-not-allowed" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 h-11 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl font-semibold transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 h-11 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2">
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-black mb-4">Mis canciones</h2>
          {songs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No has subido canciones aún.</p>
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

      </div>
    </div>
  )
}