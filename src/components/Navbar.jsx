import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const name = user?.user_metadata?.name
  const avatar = user?.user_metadata?.avatar_url

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  const navLink = (to, label) => {
    const isActive = location.pathname === to
    return (
      <Link
        to={to}
        className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
          isActive
            ? 'text-purple-700 bg-purple-50'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="bg-white text-black px-6 py-3 flex justify-between items-center border-b border-gray-200 sticky top-0 z-40">

      {/* Logo + links */}
      <div className="flex items-center gap-6">
        <Link to="/home" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center text-sm font-bold">
            SS
          </div>
          <span className="font-bold text-gray-900 text-sm hidden sm:block">SoundSeekers</span>
        </Link>

        <div className="flex items-center gap-1">
          {navLink('/home', 'Inicio')}
          {navLink('/dashboard', 'Explorar')}
          {navLink('/community', 'Comunidad')}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 items-center">
        {user ? (
          <>
            <Link
              to="/upload"
              className="bg-purple-700 hover:bg-purple-800 px-4 py-1.5 text-white font-semibold rounded-lg transition text-sm"
            >
              + Subir
            </Link>

            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
              {avatar ? (
                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-100" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold uppercase text-white">
                  {name?.[0] ?? '?'}
                </div>
              )}
              <span className="text-sm text-gray-700 hidden sm:block">{name ?? user.email}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition"
            >
              Salir
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="px-4 py-1.5 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition"
            >
              Regístrate
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
