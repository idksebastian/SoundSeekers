import { useNavigate } from 'react-router-dom'
import { deleteSong } from '../api/songs'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'

export default function SongCard({ song, onRefresh }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { playSong, currentSong, isPlaying } = usePlayer()
  const isOwner = user?.id === song.user_id
  const isCurrentSong = currentSong?.id === song.id

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta canción?')) return
    await deleteSong(song.id)
    onRefresh()
  }

  const goToArtist = () => {
    if (song.user_id) navigate(`/artist/${song.user_id}`)
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">

      {/* Portada */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={song.cover_url}
          alt={song.title}
          className="w-full h-full object-cover"
        />
        {/* Overlay play */}
        <div
          onClick={() => playSong(song)}
          className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
            {isCurrentSong && isPlaying ? (
              <svg className="w-5 h-5 text-purple-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-purple-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
          </div>
        </div>

        {/* Badge género */}
        <span className="absolute top-3 left-3 text-xs text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full font-medium">
          {song.genre}
        </span>

        {/* Indicador reproduciendo */}
        {isCurrentSong && isPlaying && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-purple-700 text-white text-xs px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Reproduciendo
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">

        {/* Título */}
        <div>
          <h3 className="text-black font-semibold text-base truncate">{song.title}</h3>
          {/* Nombre artista clickeable */}
          <button
            onClick={goToArtist}
            className="text-gray-400 text-sm truncate hover:text-purple-600 transition flex items-center gap-1 mt-0.5"
          >
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            {song.artist_name ?? 'Artista desconocido'}
          </button>
        </div>

        {/* Descripción */}
        {song.description && (
          <p className="text-gray-500 text-sm line-clamp-2">{song.description}</p>
        )}

        {/* Botón reproducir */}
        <button
          onClick={() => playSong(song)}
          className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 transition border ${
            isCurrentSong && isPlaying
              ? 'bg-purple-50 border-purple-200'
              : 'bg-gray-50 hover:bg-purple-50 border-gray-200 hover:border-purple-200'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center shrink-0">
            {isCurrentSong && isPlaying ? (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
          </div>
          <span className="text-sm text-gray-600 font-medium">
            {isCurrentSong && isPlaying ? 'Reproduciendo...' : 'Reproducir'}
          </span>
        </button>

        {/* Botones dueño */}
        {isOwner && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => navigate(`/edit/${song.id}`)}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}