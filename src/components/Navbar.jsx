import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'
import { getUserRole, isAdmin, getPendingCount } from '../api/roles'
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead, subscribeToNotifications } from '../api/notifications'

const NOTIFICATION_LABELS = {
  follow: 'te empezó a seguir',
  like: 'le dio like a tu post',
  comment: 'comentó en tu post',
  feat_invite: 'te invitó a colaborar en una canción',
  presave: 'guardó tu próximo lanzamiento',
}

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const name = user?.user_metadata?.name
  const avatar = user?.user_metadata?.avatar_url
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [role, setRole] = useState(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef(null)

  useEffect(() => {
    if (user) {
      getUserRole(user.id).then(r => setRole(r))
      isAdmin(user.id).then(admin => {
        setIsAdminUser(admin)
        if (admin) getPendingCount().then(setPendingCount)
      })
      getUnreadCount().then(setUnreadCount)

      const channel = subscribeToNotifications(user.id, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })

      return () => { channel.unsubscribe() }
    }
  }, [user])

  useEffect(() => {
    if (notifOpen && user) {
      getNotifications().then(setNotifications)
    }
  }, [notifOpen])

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpenNotifs = async () => {
    setNotifOpen(prev => !prev)
    setMenuOpen(false)
    if (!notifOpen && unreadCount > 0) {
      await markAllAsRead()
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    }
    setNotifOpen(false)
    if (notif.type === 'follow' || notif.type === 'feat_invite') {
      navigate(`/artist/${notif.from_user_id}`)
    } else if (notif.type === 'like' || notif.type === 'comment') {
      navigate('/community')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
    setMenuOpen(false)
  }

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  const navLink = (to, label) => {
    const isActive = location.pathname === to
    return (
      <Link to={to}
        className={`text-sm font-medium transition-all px-3 py-1.5 rounded-lg ${
          isActive ? 'text-purple-700 bg-purple-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}>
        {label}
      </Link>
    )
  }

  return (
    <nav className="bg-white text-black px-4 sm:px-6 py-3 flex justify-between items-center border-b border-gray-200 sticky top-0 z-40">

      <div className="flex items-center gap-2 sm:gap-6">
        <Link to="/home" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center text-sm font-bold shrink-0">SS</div>
          <span className="font-bold text-gray-900 text-sm hidden md:block">SoundSeekers</span>
        </Link>
        <div className="hidden sm:flex items-center gap-1">
          {navLink('/home', 'Inicio')}
          {navLink('/dashboard', 'Explorar')}
          {navLink('/animo', 'Ánimo')}
          {navLink('/community', 'Comunidad')}
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 items-center">
        {user ? (
          <>
            <Link to="/upload"
              className="bg-purple-700 hover:bg-purple-800 active:bg-purple-900 px-3 sm:px-4 py-1.5 text-white font-semibold rounded-lg transition-all text-sm">
              <span className="hidden sm:block">+ Subir</span>
              <span className="sm:hidden">+</span>
            </Link>

            <div className="relative" ref={notifRef}>
              <button onClick={handleOpenNotifs}
                className="relative w-9 h-9 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50 flex items-center justify-center transition-all">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-black">Notificaciones</p>
                    {notifications.some(n => !n.read) && (
                      <button onClick={async () => {
                        await markAllAsRead()
                        setUnreadCount(0)
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                      }} className="text-xs text-purple-600 hover:underline">
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-400 font-medium">Sin notificaciones</p>
                        <p className="text-xs text-gray-300 mt-1">Te avisaremos cuando algo pase</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button key={notif.id} onClick={() => handleNotifClick(notif)}
                          className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${
                            !notif.read ? 'bg-purple-50/50' : ''
                          }`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-purple-500' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">
                              <span className="font-semibold">
                                {notif.from_user_id === user.id ? 'Tú' : 'Alguien'}
                              </span>
                              {' '}{NOTIFICATION_LABELS[notif.type] ?? 'interactuó contigo'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatTime(notif.created_at)}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false) }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-all">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover ring-2 ring-purple-100 shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold uppercase text-white shrink-0">
                    {name?.[0] ?? '?'}
                  </div>
                )}
                <span className="text-sm text-gray-700 hidden sm:block max-w-[100px] truncate">{name ?? user.email}</span>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform hidden sm:block ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold uppercase text-white shrink-0">
                          {name?.[0] ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-black truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="sm:hidden border-b border-gray-100 py-1">
                      {[
                        { to: '/home', label: 'Inicio' },
                        { to: '/dashboard', label: 'Explorar' },
                        { to: '/animo', label: 'Ánimo' },
                        { to: '/community', label: 'Comunidad' },
                      ].map(({ to, label }) => (
                        <button key={to} onClick={() => { navigate(to); setMenuOpen(false) }}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left">
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          role?.role === 'artist' ? navigate(`/artist/${user.id}`) : navigate('/profile')
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition text-left group">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition shrink-0">
                          <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span>Mi perfil</span>
                      </button>

                      {isAdminUser && (
                        <button
                          onClick={() => { navigate('/admin'); setMenuOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 active:bg-purple-100 transition text-left group">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition shrink-0">
                            <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <span className="text-purple-600 font-medium">Panel admin</span>
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition text-left group">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-red-100 flex items-center justify-center transition shrink-0">
                          <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
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
            <Link to="/login" className="px-3 sm:px-4 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition">
              Iniciar sesión
            </Link>
            <Link to="/register" className="px-3 sm:px-4 py-1.5 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 active:bg-purple-900 transition">
              Regístrate
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}