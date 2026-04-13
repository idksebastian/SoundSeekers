import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'
import { getUserRole, isAdmin, getPendingCount } from '../api/roles'
import SettingsModal from './SettingsModal'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const name = user?.user_metadata?.name
  const avatar = user?.user_metadata?.avatar_url
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [role, setRole] = useState(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (user) {
      getUserRole(user.id).then(r => setRole(r))
      isAdmin(user.id).then(admin => {
        setIsAdminUser(admin)
        if (admin) getPendingCount().then(setPendingCount)
      })
    }
  }, [user])

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
    setMenuOpen(false)
  }

  const navLink = (to, label) => {
    const isActive = location.pathname === to
    return (
      <Link to={to}
        className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
          isActive ? 'text-purple-700 bg-purple-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}>
        {label}
      </Link>
    )
  }

  return (
    <>
      {showSettings && (
        <SettingsModal
          user={user}
          role={role}
          onClose={() => setShowSettings(false)}
          onProfileUpdated={() => setShowSettings(false)}
        />
      )}

      <nav className="bg-white text-black px-6 py-3 flex justify-between items-center border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link to="/home" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center text-sm font-bold">SS</div>
            <span className="font-bold text-gray-900 text-sm hidden sm:block">SoundSeekers</span>
          </Link>
          <div className="flex items-center gap-1">
            {navLink('/home', 'Inicio')}
            {navLink('/dashboard', 'Explorar')}
            {navLink('/animo', 'Ánimo')}
            {navLink('/community', 'Comunidad')}
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {user ? (
            <>
              <Link to="/upload"
                className="bg-purple-700 hover:bg-purple-800 px-4 py-1.5 text-white font-semibold rounded-lg transition text-sm">
                + Subir
              </Link>

              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-100" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold uppercase text-white">
                      {name?.[0] ?? '?'}
                    </div>
                  )}
                  <span className="text-sm text-gray-700 hidden sm:block">{name ?? user.email}</span>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-black truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            role?.role === 'artist' ? navigate(`/artist/${user.id}`) : navigate('/profile')
                            setMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Ver perfil
                        </button>
                        <button
                          onClick={() => { setShowSettings(true); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Ajustes
                        </button>
                        {isAdminUser && (
                          <button
                            onClick={() => { navigate('/admin'); setMenuOpen(false) }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 transition text-left">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Panel de admin
                            {pendingCount > 0 && (
                              <span className="ml-auto bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {pendingCount}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition text-left">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">
                Iniciar sesión
              </Link>
              <Link to="/register" className="px-4 py-1.5 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition">
                Regístrate
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}