import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyPlaylists, createPlaylist, addSongToPlaylist, isSongInPlaylist } from '../api/playlists'

export default function AddToPlaylistModal({ song, onClose }) {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState({})
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!user) return
    loadPlaylists()
  }, [user])

  const loadPlaylists = async () => {
    setLoading(true)
    try {
      const data = await getMyPlaylists(user.id)
      setPlaylists(data)
      // Verificar cuáles ya tienen la canción
      const checks = {}
      await Promise.all(data.map(async pl => {
        checks[pl.id] = await isSongInPlaylist(pl.id, song.id)
      }))
      setSaved(checks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (playlistId) => {
    if (saved[playlistId]) return
    setSaving(playlistId)
    try {
      await addSongToPlaylist(playlistId, song.id)
      setSaved(prev => ({ ...prev, [playlistId]: true }))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const pl = await createPlaylist({ user_id: user.id, name: newName.trim() })
      await addSongToPlaylist(pl.id, song.id)
      setPlaylists(prev => [{ ...pl, playlist_songs: [{ count: 1 }] }, ...prev])
      setSaved(prev => ({ ...prev, [pl.id]: true }))
      setNewName('')
      setShowCreate(false)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">Agregar a playlist</h2>
            <p className="text-xs text-gray-400 truncate">{song.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition shrink-0 ml-3">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Crear nueva */}
        <div className="px-5 py-3 border-b border-gray-100">
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm text-purple-700 font-semibold hover:text-purple-800 transition">
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-purple-300 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
              </div>
              Nueva playlist
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                placeholder="Nombre de la playlist..."
                autoFocus
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button onClick={handleCreate} disabled={!newName.trim() || creating}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                {creating ? '...' : 'Crear'}
              </button>
              <button onClick={() => { setShowCreate(false); setNewName('') }}
                className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm transition">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Lista de playlists */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <svg className="w-5 h-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : playlists.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              No tienes playlists aún.
            </div>
          ) : (
            playlists.map(pl => {
              const isAdded = saved[pl.id]
              const isSaving = saving === pl.id
              const count = pl.playlist_songs?.[0]?.count ?? 0
              return (
                <button key={pl.id} onClick={() => handleAdd(pl.id)} disabled={isAdded || isSaving}
                  className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left ${isAdded ? 'opacity-70' : ''}`}>
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pl.name}</p>
                    <p className="text-xs text-gray-400">{count} canción{count !== 1 ? 'es' : ''}</p>
                  </div>
                  <div className="shrink-0">
                    {isSaving ? (
                      <svg className="w-4 h-4 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : isAdded ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
