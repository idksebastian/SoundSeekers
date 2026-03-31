import { useEffect, useState } from 'react'
import { getSongs } from '../api/songs'
import SongCard from '../components/SongCard'

export default function Dashboard() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSongs = async () => {
    setLoading(true)
    const data = await getSongs()
    setSongs(data)
    setLoading(false)
  }

  useEffect(() => { fetchSongs() }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Canciones</h1>
          <p className="text-gray-400 mt-1">Descubre la música de nuestra comunidad</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No hay canciones aún</p>
            <p className="text-gray-400 text-sm mt-1">¡Sé el primero en subir una!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {songs.map(song => (
              <SongCard key={song.id} song={song} onRefresh={fetchSongs} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}