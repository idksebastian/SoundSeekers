import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isFollowing, toggleFollow, getFollowers, getFollowing } from '../api/profile'
import { isAdmin, getListenerAdminDetail } from '../api/adminRequests'

const LISTENER_LEVELS = [
  {
    label: 'Curioso',
    desc: 'Registrarte en SoundSeekers',
    min: 0,
    max: 10,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#e9d5ff',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    ),
  },
  {
    label: 'Explorador',
    desc: '10 reproducciones',
    min: 10,
    max: 20,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ),
  },
  {
    label: 'Melómano',
    desc: '20 reproducciones',
    min: 20,
    max: 50,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M3 18v-6a9 9 0 0118 0v6"/>
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
      </svg>
    ),
  },
  {
    label: 'Descubridor',
    desc: '50 reproducciones',
    min: 50,
    max: Infinity,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
      </svg>
    ),
  },
]

function getLevel(streams) {
  // Buscar el nivel más alto alcanzado
  for (let i = LISTENER_LEVELS.length - 1; i >= 0; i--) {
    if (streams >= LISTENER_LEVELS[i].min) return LISTENER_LEVELS[i]
  }
  return LISTENER_LEVELS[0]
}

export default function ListenerProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [streams, setStreams] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [adminDetail, setAdminDetail] = useState(null)
  const [artistRequest, setArtistRequest] = useState(null)

  const isOwnProfile = user?.id === userId

  useEffect(() => {
    const load = async () => {
      try {
        // Perfil básico
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (profileErr) throw profileErr
        setProfile(profileData)

        // Role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .single()
        setRole(roleData)

        // Si es artista, redirigir al perfil de artista
        if (roleData?.role === 'artist') {
          navigate(`/artist/${userId}`, { replace: true })
          return
        }

        // Streams del oyente
        const { count: streamCount } = await supabase
          .from('streams')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
        setStreams(streamCount ?? 0)

        // Followers / following
        const { count: fwrs } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId)
        const { count: fwing } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId)
        setFollowersCount(fwrs ?? 0)
        setFollowingCount(fwing ?? 0)

        // ¿Lo sigo?
        if (user && !isOwnProfile) {
          const status = await isFollowing(userId)
          setFollowing(status)
        }

        // ¿Soy admin?
        if (user) {
          const admin = await isAdmin()
          setAdminMode(admin)
          if (admin) {
            const detail = await getListenerAdminDetail(userId)
            setAdminDetail(detail)
            // Buscar solicitud de artista
            const { data: req } = await supabase
              .from('artist_requests')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            setArtistRequest(req)
          }
        }
      } catch (e) {
        setError('No se encontró este perfil.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, user])

  const handleFollow = async () => {
    if (!user) return navigate('/login')
    setLoadingFollow(true)
    try {
      const newStatus = await toggleFollow(userId)
      setFollowing(newStatus)
      setFollowersCount(p => newStatus ? p + 1 : p - 1)
    } catch {} finally { setLoadingFollow(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gray-500">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-600 text-sm hover:underline">Volver atrás</button>
      </div>
    </div>
  )

  const level = getLevel(streams)
  const levelIndex = LISTENER_LEVELS.indexOf(level)
  const nextLevel = LISTENER_LEVELS[levelIndex + 1] ?? null
  const progressPct = nextLevel
    ? Math.min(100, Math.round(((streams - level.min) / (nextLevel.min - level.min)) * 100))
    : 100

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl space-y-4">

        {/* ── Card principal ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
                      {profile?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                }
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-black truncate">{profile?.name ?? 'Usuario'}</h1>
                  {/* Badge de nivel */}
                  <span style={{ background: level.bg, color: level.color }} className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0">
                    {level.icon} {level.label}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-0.5">Oyente</p>
                {profile?.description && (
                  <p className="text-gray-500 text-sm mt-1 italic">"{profile.description}"</p>
                )}
                {/* Redes */}
                {(profile?.instagram || profile?.twitter || profile?.tiktok) && (
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {profile.instagram && <a href={`https://instagram.com/${profile.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Instagram</a>}
                    {profile.twitter   && <a href={`https://twitter.com/${profile.twitter.replace('@','')}`}   target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">Twitter</a>}
                    {profile.tiktok    && <a href={`https://tiktok.com/${profile.tiktok.replace('@','')}`}    target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-600 transition">TikTok</a>}
                  </div>
                )}
              </div>
            </div>

            {/* Botón seguir / settings */}
            <div className="shrink-0">
              {!isOwnProfile && user && (
                <button onClick={handleFollow} disabled={loadingFollow}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                    following ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-purple-700 text-white border-purple-700 hover:bg-purple-800'
                  }`}>
                  {loadingFollow
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : following ? 'Siguiendo' : 'Seguir'
                  }
                </button>
              )}
              {isOwnProfile && (
                <button onClick={() => navigate('/settings')}
                  className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
            <button className="text-center hover:bg-gray-50 rounded-xl py-1 transition"
              onClick={() => navigate(`/artist/${userId}/followers`, { state: { tab: 'followers' } })}>
              <p className="text-lg sm:text-2xl font-bold text-black leading-tight">{followersCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Seguidores</p>
            </button>
            <button className="text-center hover:bg-gray-50 rounded-xl py-1 transition"
              onClick={() => navigate(`/artist/${userId}/followers`, { state: { tab: 'following' } })}>
              <p className="text-lg sm:text-2xl font-bold text-black leading-tight">{followingCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Siguiendo</p>
            </button>
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-black leading-tight">{streams.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">Reproducciones</p>
            </div>
          </div>
        </div>

        {/* ── Nivel de oyente ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base sm:text-lg font-bold text-black">Nivel de oyente</h2>
            <span className="text-xs text-gray-400 font-medium">{streams.toLocaleString()} rep. totales</span>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            {isOwnProfile ? 'Escucha más música en SoundSeekers para subir de nivel.' : 'Nivel basado en reproducciones totales.'}
          </p>

          {nextLevel && (
            <div className="mb-5 p-3.5 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div style={{ color: level.color }}>{level.icon}</div>
                  <span className="text-sm font-bold text-gray-800">{level.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">→</span>
                  <div style={{ color: nextLevel.color }}>{nextLevel.icon}</div>
                  <span className="text-sm font-semibold" style={{ color: nextLevel.color }}>{nextLevel.label}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%`, background: `linear-gradient(to right, ${level.color}, ${nextLevel.color})` }}/>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 text-right">
                {streams.toLocaleString()} / {nextLevel.min.toLocaleString()} reproducciones para {nextLevel.label}
              </p>
            </div>
          )}

          {!nextLevel && (
            <div className="mb-5 p-3.5 rounded-xl border border-amber-200 bg-amber-50 flex items-center gap-3">
              <div style={{ color: level.color }}>{level.icon}</div>
              <div>
                <p className="text-sm font-bold text-amber-700">¡Nivel máximo alcanzado!</p>
                <p className="text-xs text-amber-600">Un verdadero Descubridor de música.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {LISTENER_LEVELS.map((lvl) => {
              const done = streams >= lvl.min
              return (
                <div key={lvl.label}
                  className="p-3 rounded-xl border transition-all"
                  style={{ borderColor: done ? lvl.border : '#f3f4f6', background: done ? lvl.bg : '#f9fafb', opacity: done ? 1 : 0.5 }}>
                  <div className="mb-1.5" style={{ color: done ? lvl.color : '#9ca3af' }}>{lvl.icon}</div>
                  <p className="text-sm font-semibold" style={{ color: done ? lvl.color : '#9ca3af' }}>{lvl.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{lvl.desc}</p>
                  {done && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: lvl.color }}>
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: lvl.color }}>Desbloqueado</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Panel Admin ── */}
        {adminMode && adminDetail && (
          <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <h3 className="text-sm font-bold text-purple-700">Panel de Administrador</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Reproducciones totales', value: adminDetail.totalStreams.toLocaleString() },
                { label: 'Seguidores',             value: adminDetail.followers.toLocaleString() },
                { label: 'Siguiendo',              value: adminDetail.following.toLocaleString() },
                { label: 'User ID',                value: userId.slice(0, 8) + '...', mono: true },
                { label: 'Rol actual',             value: adminDetail.role?.role ?? 'listener' },
                { label: 'Miembro desde',          value: adminDetail.role?.created_at ? new Date(adminDetail.role.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' }) : '—' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className={`text-sm font-bold text-black ${item.mono ? 'font-mono text-xs' : ''}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Solicitud de artista */}
            {artistRequest ? (
              <div className={`rounded-xl p-4 border ${
                artistRequest.status === 'pending'  ? 'bg-amber-50 border-amber-200' :
                artistRequest.status === 'approved' ? 'bg-green-50 border-green-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800">Solicitud de artista</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    artistRequest.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                    artistRequest.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {artistRequest.status === 'pending' ? 'Pendiente' : artistRequest.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p><span className="font-semibold">Nombre artístico:</span> {artistRequest.artist_name}</p>
                  {artistRequest.genre    && <p><span className="font-semibold">Género:</span> {artistRequest.genre}</p>}
                  {artistRequest.message  && <p><span className="font-semibold">Mensaje:</span> {artistRequest.message}</p>}
                  {artistRequest.instagram && <p><span className="font-semibold">Instagram:</span> {artistRequest.instagram}</p>}
                  {artistRequest.spotify_url && <p><span className="font-semibold">Spotify:</span> <a href={artistRequest.spotify_url} target="_blank" rel="noreferrer" className="text-purple-600 underline">Ver perfil</a></p>}
                  <p><span className="font-semibold">Enviada:</span> {new Date(artistRequest.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  {artistRequest.admin_note && <p><span className="font-semibold">Nota admin:</span> {artistRequest.admin_note}</p>}
                </div>
                {artistRequest.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => navigate(`/requests?highlight=${artistRequest.id}`)}
                      className="flex-1 py-2 rounded-xl bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 transition">
                      Revisar en solicitudes →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Sin solicitud de artista</p>
              </div>
            )}
          </div>
        )}

        {/* ── Quiere ser artista (propio perfil oyente) ── */}
        {isOwnProfile && role?.role === 'listener' && (
          <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl p-5 text-white">
            <h3 className="text-base font-bold mb-1">¿Eres artista?</h3>
            <p className="text-sm text-white/80 mb-4">Solicita el cambio de perfil y empieza a subir tu música.</p>
            <button onClick={() => navigate('/request-artist')}
              className="bg-white text-purple-700 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-purple-50 transition">
              Solicitar perfil de artista →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}