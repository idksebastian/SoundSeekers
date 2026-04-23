import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'
import { getUserRole, isAdmin, getPendingCount } from '../api/roles'
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead, subscribeToNotifications } from '../api/notifications'
import { getPendingFeatsCount } from '../api/songs'

const NOTIFICATION_CONFIG = {
  follow: {
    label: 'te empezó a seguir',
    icon: (
      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    )
  },
  like: {
    label: 'le dio like a tu post',
    icon: (
      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>
    )
  },
  comment: {
    label: 'comentó en tu post',
    icon: (
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
    )
  },
  feat_invite: {
    label: 'te invitó a colaborar en una canción',
    icon: (
      <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    )
  },
  presave: {
    label: 'guardó tu próximo lanzamiento',
    icon: (
      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>
    )
  },
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
  const [featCount, setFeatCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifsLoaded, setNotifsLoaded] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    if (!user) return

    Promise.all([
      getUserRole(user.id),
      isAdmin(user.id),
      getUnreadCount(),
      getNotifications(),
    ]).then(([r, admin, count, notifs]) => {
      setRole(r)
      if (r?.role === 'artist') getPendingFeatsCount().then(setFeatCount)
      setIsAdminUser(admin)
      if (admin) getPendingCount().then(setPendingCount)
      setUnreadCount(count)
      setNotifications(notifs)
      setNotifsLoaded(true)
    })

    const channel = subscribeToNotifications(user.id, async (payload) => {
      const newNotif = payload.new
      if (newNotif.from_user_id) {
        const { data: profile } = await import('../lib/supabase').then(m =>
          m.supabase.from('profiles').select('user_id, name, artist_name, avatar_url')
            .eq('user_id', newNotif.from_user_id).single()
        )
        setNotifications(prev => [{ ...newNotif, from_profile: profile }, ...prev])
      } else {
        setNotifications(prev => [{ ...newNotif, from_profile: null }, ...prev])
      }
      setUnreadCount(prev => prev + 1)
      if (newNotif.type === 'feat_invite') setFeatCount(prev => prev + 1)
    })

    return () => { channel.unsubscribe() }
  }, [user])

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
    if (notif.type === 'feat_invite') {
      navigate('/requests')
    } else if (notif.type === 'follow') {
      navigate(`/artist/${notif.from_user_id}`)
    } else if (notif.type === 'like' || notif.type === 'comment') {
      navigate(`/community?post=${notif.reference_id}`)
    } else if (notif.type === 'presave') {
      navigate(`/artist/${user.id}`)
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

  const getFromName = (notif) => {
    const p = notif.from_profile
    if (!p) return 'Alguien'
    return p.artist_name || p.name || 'Alguien'
  }

  const getFromAvatar = (notif) => notif.from_profile?.avatar_url ?? null

  return (
    <nav className="bg-white text-black px-4 sm:px-6 py-3 flex justify-between items-center border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-6">
        <Link to="/home" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center text-sm font-bold shrink-0">SS</div>
          <span className="hidden md:block" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#111', letterSpacing: '0.04em', lineHeight: 1 }}>SoundSeekers</span>
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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-base font-bold text-black">Notificaciones</p>
                    {notifications.some(n => !n.read) && (
                      <button onClick={async () => {
                        await markAllAsRead()
                        setUnreadCount(0)
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                      }} className="text-xs text-purple-600 hover:underline font-medium">
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {!notifsLoaded ? (
                      <div className="py-8 flex items-center justify-center">
                        <svg className="w-6 h-6 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-500">Sin notificaciones</p>
                        <p className="text-xs text-gray-400 mt-1">Te avisaremos cuando algo pase</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const config = NOTIFICATION_CONFIG[notif.type]
                        const fromName = getFromName(notif)
                        const fromAvatar = getFromAvatar(notif)
                        return (
                          <button key={notif.id} onClick={() => handleNotifClick(notif)}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition text-left ${
                              !notif.read ? 'bg-purple-50/60' : 'bg-white'
                            }`}>
                            <div className="relative shrink-0">
                              {fromAvatar ? (
                                <img src={fromAvatar} alt={fromName} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white text-sm font-bold uppercase">
                                  {fromName?.[0] ?? '?'}
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1">
                                {config?.icon}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-sm text-gray-800 leading-snug">
                                <span className="font-semibold text-black">{fromName}</span>
                                {' '}{config?.label ?? 'interactuó contigo'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2" />
                            )}
                          </button>
                        )
                      })
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

                      {role?.role === 'artist' && (
                        <button
                          onClick={() => { navigate('/requests'); setMenuOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition text-left group">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition shrink-0">
                            <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span>Solicitudes</span>
                          {featCount > 0 && (
                            <span className="ml-auto bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {featCount}
                            </span>
                          )}
                        </button>
                      )}

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