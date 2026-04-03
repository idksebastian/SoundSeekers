import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const name = user?.user_metadata?.name
  const avatar = user?.user_metadata?.avatar_url // ← correcto

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  return (
    <nav className="bg-white text-black px-6 py-4 flex justify-between items-center border-b border-gray-300">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center text-sm font-bold uppercase">
          SS
        </div>
        <Link to="/home" className="text-sm text-gray-600 hover:text-black transition">Inicio</Link>
        <Link to="/dashboard" className="text-sm text-gray-600 hover:text-black transition">Explorar</Link>
      </div>

      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <Link to="/upload" className="bg-purple-600 px-4 py-1.5 text-white font-semibold rounded-lg hover:bg-purple-700 transition text-sm">
              + Subir canción
            </Link>

            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
              {avatar ? (
                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold uppercase text-white">
                  {name?.[0] ?? '?'}
                </div>
              )}
              <span className="text-sm text-gray-700">{name ?? user.email}</span>
            </Link>

            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">
              Salir
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-5 py-2 rounded-full border border-gray-200 text-black font-semibold text-sm hover:bg-gray-100 transition-colors">
              Iniciar sesión
            </Link>
            <Link to="/register" className="px-5 py-2 rounded-full bg-purple-700 text-white font-semibold text-sm hover:bg-purple-600 transition-colors">
              Regístrate
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}