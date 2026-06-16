    import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isFollowing, toggleFollow, getFollowers, getFollowing } from '../api/profile'
import { isAdmin, getListenerAdminDetail } from '../api/adminRequests'

const LISTENER_LEVELS = [
  { min: 0,    max: 49,   label: 'Novato',      color: '#9ca3af', bg: '#f9fafb',   icon: '🎧' },
  { min: 50,   max: 199,  label: 'Melómano',    color: '#10b981', bg: '#f0fdf4',   icon: '🎵' },
  { min: 200,  max: 499,  label: 'Fanático',    color: '#3b82f6', bg: '#eff6ff',   icon: '🎶' },
  { min: 500,  max: 999,  label: 'Experto',     color: '#f59e0b', bg: '#fffbeb',   icon: '⭐' },
  { min: 1000, max: Infinity, label: 'Leyenda', color: '#7c3aed', bg: '#f5f3ff',   icon: '👑' },
]

function getLevel(streams) {
  return LISTENER_LEVELS.find(l => streams >= l.min && streams <= l.max) ?? LISTENER_LEVELS[0]
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
  const nextLevel = LISTENER_LEVELS[levelIndex + 1]
  const progressPct = nextLevel
    ? Math.round(((streams - level.min) / (nextLevel.min - level.min)) * 100)
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div style={{ background: level.bg }} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg">
              {level.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-black">Nivel: {level.label}</p>
              <p className="text-xs text-gray-400">
                {nextLevel ? `${streams.toLocaleString()} / ${nextLevel.min.toLocaleString()} rep. para ${nextLevel.label}` : '¡Nivel máximo alcanzado! 🏆'}
              </p>
            </div>
            <span style={{ color: level.color }} className="ml-auto text-sm font-bold">{progressPct}%</span>
          </div>
          {/* Barra de progreso */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div style={{ width: `${progressPct}%`, background: level.color, transition: 'width 0.8s ease' }} className="h-full rounded-full"/>
          </div>
          {/* Todos los niveles */}
          <div className="flex items-center justify-between mt-3">
            {LISTENER_LEVELS.map((l, i) => (
              <div key={l.label} className="flex flex-col items-center gap-1">
                <div style={{ background: i <= levelIndex ? l.bg : '#f9fafb', border: `2px solid ${i <= levelIndex ? l.color : '#e5e7eb'}` }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs">
                  {i <= levelIndex ? l.icon : '·'}
                </div>
                <p style={{ color: i <= levelIndex ? l.color : '#d1d5db' }} className="text-[10px] font-semibold hidden sm:block">{l.label}</p>
              </div>
            ))}
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