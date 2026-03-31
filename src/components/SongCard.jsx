import { useNavigate } from 'react-router-dom'
import { deleteSong } from '../api/songs'
import { useAuth } from '../context/AuthContext'

export default function SongCard({ song, onRefresh }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isOwner = user?.id === song.user_id

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta canción?')) return
    await deleteSong(song.id)
    onRefresh()
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover"/>
        <span className="absolute top-3 left-3 text-xs text-white bg-purple-600/90 px-2.5 py-1 rounded-full font-medium">
          {song.genre}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-black font-semibold text-base truncate">{song.title}</h3>
          <p className="text-gray-400 text-sm truncate">Autor: {song.artist_name ?? 'Artista desconocido'}</p>
        </div>
        {song.description && (
          <p className="text-gray-500 text-sm line-clamp-2">{song.description}</p>
        )}

        <audio controls src={song.audio_url} className="w-full h-8 accent-purple-600" />

        {isOwner && (
          <div className="flex gap-2 pt-1">
            <button onClick={() => navigate(`/edit/${song.id}`)} className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Editar
            </button>
            <button onClick={handleDelete} className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition">
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}