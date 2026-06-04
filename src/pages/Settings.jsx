import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'
import { updateProfile, getFollowStats } from '../api/profile'
import { getMySongs } from '../api/songs'
import { getArtistAlbums } from '../api/albums'

const SECTIONS = [
  { id: 'stats', label: 'Estadísticas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', artist: true },
  { id: 'edit', label: 'Editar perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'account', label: 'Cuenta', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'notifications', label: 'Notificaciones', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'danger', label: 'Zona de peligro', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', danger: true },
]

function NotificationSettings({ userId, isArtist }) {
  const STORAGE_KEY = `ss_notif_prefs_${userId}`
  const defaultPrefs = { follow: true, like: true, comment: true, feat_invite: true, presave: true }
  const [prefs, setPrefs] = useState(() => {
    try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } }
    catch { return defaultPrefs }
  })
  const [saved, setSaved] = useState(false)
  const toggle = (key) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const items = [
    { key: 'follow', label: 'Nuevos seguidores', desc: 'Cuando alguien empiece a seguirte', color: '#7c3aed', bg: '#f5f3ff', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { key: 'like', label: 'Likes en posts', desc: 'Cuando alguien le dé like a tu publicación', color: '#ec4899', bg: '#fdf2f8', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { key: 'comment', label: 'Comentarios', desc: 'Cuando alguien comente en tu post', color: '#3b82f6', bg: '#eff6ff', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    ...(isArtist ? [
      { key: 'feat_invite', label: 'Invitaciones a colaborar', desc: 'Cuando otro artista te invite a un feat', color: '#f59e0b', bg: '#fffbeb', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
      { key: 'presave', label: 'Presaves', desc: 'Cuando alguien guarde tu próximo lanzamiento', color: '#10b981', bg: '#f0fdf4', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
    ] : []),
  ]
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
        {items.map(item => (
          <div key={item.key}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: prefs[item.key] ? item.bg : '#f9fafb', borderRadius: '16px', border: `1px solid ${prefs[item.key] ? item.bg : '#f3f4f6'}`, transition: 'all 0.2s', cursor: 'pointer' }}
            onClick={() => toggle(item.key)}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: prefs[item.key] ? '#fff' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: prefs[item.key] ? '0 2px 8px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}>
              <svg width="18" height="18" fill="none" stroke={prefs[item.key] ? item.color : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={item.icon}/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: prefs[item.key] ? '#111' : '#9ca3af', margin: '0 0 2px', transition: 'color 0.2s' }}>{item.label}</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{item.desc}</p>
            </div>
            <div style={{ width: '44px', height: '24px', borderRadius: '100px', background: prefs[item.key] ? item.color : '#e5e7eb', position: 'relative', flexShrink: 0, transition: 'background 0.2s', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', top: '3px', left: prefs[item.key] ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          Guardar preferencias
        </button>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Guardado
          </div>
        )}
      </div>
    </div>
  )
}

const NAME_CHANGE_LIMIT = 2
const NAME_CHANGE_DAYS = 30

export default function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)
  const [activeSection, setActiveSection] = useState('edit')
  const [role, setRole] = useState(null)
  const [loadingRole, setLoadingRole] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [artistName, setArtistName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [socialLinks, setSocialLinks] = useState({ instagram: '', twitter: '', tiktok: '', youtube: '', website: '' })

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Stats state
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [songStats, setSongStats] = useState([])

  useEffect(() => {
    if (!user) return
    const fetchRole = async () => {
      const { data } = await supabase.from('user_roles').select('*').eq('user_id', user.id).single()
      setRole(data)
      setName(user.user_metadata?.name ?? '')
      setArtistName(data?.artist_name ?? '')
      setDescription(data?.description ?? data?.artist_bio ?? '')
      setAvatarPreview(user.user_metadata?.avatar_url ?? null)
      setSocialLinks({
        instagram: data?.instagram ?? '',
        twitter: data?.twitter ?? '',
        tiktok: data?.tiktok ?? '',
        youtube: data?.youtube ?? '',
        website: data?.website ?? '',
      })
      setLoadingRole(false)
    }
    fetchRole()
  }, [user])

  useEffect(() => {
    if (activeSection !== 'stats' || !user) return
    const fetchStats = async () => {
      setLoadingStats(true)
      try {
        const [songs, followData, albums] = await Promise.all([
          getMySongs(user.id),
          getFollowStats(user.id),
          getArtistAlbums(user.id),
        ])
        const totalStreams = songs.reduce((a, s) => a + (s.streams ?? 0), 0)
        const topSongs = [...songs].sort((a, b) => (b.streams ?? 0) - (a.streams ?? 0)).slice(0, 5)
        const { data: presavesData } = await supabase.from('presaves').select('id', { count: 'exact' }).in('album_id', albums.map(a => a.id))
        setStats({ totalStreams, totalSongs: songs.length, totalAlbums: albums.length, followers: followData.followers, following: followData.following, presaves: presavesData?.length ?? 0 })
        setSongStats(topSongs)
      } catch (err) { console.error(err) }
      finally { setLoadingStats(false) }
    }
    fetchStats()
  }, [activeSection, user])

  const isArtist = role?.role === 'artist'
  const nameChanges = role?.name_changes ?? 0
  const lastNameChange = role?.last_name_change ? new Date(role.last_name_change) : null
  const daysSinceLastChange = lastNameChange ? Math.floor((Date.now() - lastNameChange.getTime()) / (1000 * 60 * 60 * 24)) : NAME_CHANGE_DAYS + 1
  const canChangeName = nameChanges < NAME_CHANGE_LIMIT || daysSinceLastChange >= NAME_CHANGE_DAYS
  const remainingChanges = Math.max(0, NAME_CHANGE_LIMIT - nameChanges)

  const initialName = user?.user_metadata?.name ?? ''
  const initialArtistName = role?.artist_name ?? ''
  const initialDescription = role?.description ?? role?.artist_bio ?? ''

  const hasChanges = useMemo(() => {
    if (avatarFile) return true
    if (name !== initialName) return true
    if (description !== initialDescription) return true
    if (isArtist && artistName !== initialArtistName) return true
    const initSocials = { instagram: role?.instagram ?? '', twitter: role?.twitter ?? '', tiktok: role?.tiktok ?? '', youtube: role?.youtube ?? '', website: role?.website ?? '' }
    return Object.keys(initSocials).some(k => socialLinks[k] !== initSocials[k])
  }, [name, artistName, description, avatarFile, socialLinks, role])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio.')
    if (isArtist && artistName !== initialArtistName && !canChangeName)
      return setError(`Podrás cambiar tu nombre artístico en ${NAME_CHANGE_DAYS - daysSinceLastChange} días.`)
    setLoading(true); setError(''); setMsg('')
    try {
      await updateProfile({ name, artistName: isArtist ? artistName : undefined, artistNameChanged: isArtist && artistName !== initialArtistName, avatarFile, description, ...socialLinks })
      setMsg('Perfil actualizado correctamente.')
      setAvatarFile(null)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError(''); setMsg('')
    if (!currentPassword) return setError('Ingresa tu contraseña actual.')
    if (newPassword.length < 6) return setError('La nueva contraseña debe tener mínimo 6 caracteres.')
    if (newPassword !== confirmPassword) return setError('Las contraseñas nuevas no coinciden.')
    if (currentPassword === newPassword) return setError('La nueva contraseña debe ser diferente a la actual.')

    setLoading(true)
    try {
      // Verificar contraseña actual re-autenticando
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) return setError('La contraseña actual es incorrecta.')

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) return setError(updateError.message)

      setMsg('Contraseña actualizada correctamente.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setResetLoading(true)
    setError(''); setMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    if (error) return setError(error.message)
    setResetSent(true)
  }

  const handleDeleteAccount = async () => {
    if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return
    await logoutUser()
    navigate('/register')
  }

  const visibleSections = SECTIONS.filter(s => !s.artist || isArtist)

  if (loadingRole) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-32" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '2rem 2rem 4rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(-1)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>{name?.[0]?.toUpperCase() ?? '?'}</div>
              }
            </div>
            <div>
              <p style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>{isArtist ? artistName || name : name}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{isArtist ? 'Artista' : 'Oyente'} · {user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '-2rem auto 0', padding: '0 2rem', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Sidebar */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', position: 'sticky', top: '84px' }}>
          {visibleSections.map(s => (
            <button key={s.id}
              onClick={() => { setActiveSection(s.id); setMsg(''); setError('') }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
                marginBottom: s.danger ? '0' : '2px', marginTop: s.danger ? '8px' : '0',
                background: activeSection === s.id ? (s.danger ? '#fef2f2' : '#f5f3ff') : 'transparent',
                color: activeSection === s.id ? (s.danger ? '#ef4444' : '#7c3aed') : s.danger ? '#ef4444' : '#374151',
                borderTop: s.danger ? '1px solid #f3f4f6' : 'none',
              }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d={s.icon}/>
              </svg>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', minHeight: '500px' }}>

          {/* STATS */}
          {activeSection === 'stats' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Estadísticas</h3>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 2rem' }}>Resumen de tu actividad en SoundSeekers.</p>
              {loadingStats ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </div>
              ) : stats ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
                    {[
                      { label: 'Reproducciones', value: stats.totalStreams.toLocaleString(), icon: 'M5 3l14 9-14 9V3z', color: '#7c3aed', bg: '#f5f3ff' },
                      { label: 'Seguidores', value: stats.followers.toLocaleString(), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: '#ec4899', bg: '#fdf2f8' },
                      { label: 'Siguiendo', value: stats.following.toLocaleString(), icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: '#3b82f6', bg: '#eff6ff' },
                      { label: 'Canciones', value: stats.totalSongs.toLocaleString(), icon: 'M12 3v10.55A4 4 0 1014 17V7h4V3h-6z', color: '#10b981', bg: '#f0fdf4' },
                      { label: 'Álbumes / EPs', value: stats.totalAlbums.toLocaleString(), icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', color: '#f59e0b', bg: '#fffbeb' },
                      { label: 'Presaves', value: stats.presaves.toLocaleString(), icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', color: '#6366f1', bg: '#eef2ff' },
                    ].map(card => (
                      <div key={card.label} style={{ background: card.bg, borderRadius: '16px', padding: '1rem', border: `1px solid ${card.bg}` }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                          <svg width="16" height="16" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={card.icon}/></svg>
                        </div>
                        <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111', margin: '0 0 2px', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}>{card.value}</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: '600' }}>{card.label}</p>
                      </div>
                    ))}
                  </div>
                  {songStats.length > 0 && (
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '800', color: '#111', margin: '0 0 12px' }}>Top canciones</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {songStats.map((song, idx) => {
                          const maxStreams = songStats[0]?.streams ?? 1
                          const pct = Math.max(4, Math.round(((song.streams ?? 0) / maxStreams) * 100))
                          return (
                            <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', borderRadius: '12px', background: idx === 0 ? '#f5f3ff' : '#f9fafb' }}>
                              <span style={{ fontSize: '12px', color: '#9ca3af', width: '16px', textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
                              <img src={song.cover_url} alt={song.title} style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}/>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '13px', fontWeight: '600', color: '#111', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                                <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: idx === 0 ? '#7c3aed' : '#d1d5db', borderRadius: '2px', transition: 'width 0.5s ease' }}/>
                                </div>
                              </div>
                              <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '700', flexShrink: 0 }}>{(song.streams ?? 0).toLocaleString()}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* EDIT PROFILE */}
          {activeSection === 'edit' && (
            <div className="space-y-5">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Editar perfil</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.5rem' }}>Actualiza tu información pública.</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
              {msg && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div onClick={() => avatarInputRef.current?.click()}
                    className="relative group cursor-pointer w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition bg-gray-100 shrink-0">
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      </div>
                    )}
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Foto de perfil</p>
                    <p className="text-xs text-gray-400">Recomendado: 400x400px</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <input required value={name} onChange={e => setName(e.target.value)} maxLength={50}
                    className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"/>
                </div>

                {isArtist && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Nombre artístico</label>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${canChangeName ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {canChangeName ? `${remainingChanges} cambio${remainingChanges !== 1 ? 's' : ''} disponible${remainingChanges !== 1 ? 's' : ''}` : `Disponible en ${NAME_CHANGE_DAYS - daysSinceLastChange} días`}
                      </span>
                    </div>
                    <input value={artistName} onChange={e => setArtistName(e.target.value)} disabled={!canChangeName} maxLength={50}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${canChangeName ? 'bg-white border-gray-300 text-black' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}/>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <textarea placeholder="Cuéntale al mundo quién eres..." value={description} onChange={e => setDescription(e.target.value)} maxLength={150} rows={3}
                    className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"/>
                  <p className="text-xs text-gray-400 text-right">{description?.length ?? 0}/150</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Redes sociales</label>
                  {[
                    { key: 'instagram', placeholder: 'Instagram (@usuario)', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z' },
                    { key: 'twitter', placeholder: 'Twitter/X (@usuario)', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                    { key: 'tiktok', placeholder: 'TikTok (@usuario)', icon: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z' },
                    { key: 'youtube', placeholder: 'YouTube (URL del canal)', icon: 'M21.593 7.203a2.506 2.506 0 00-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.44a2.56 2.56 0 00-1.766 1.778c-.44 1.61-.44 4.821-.44 4.821s0 3.21.44 4.821c.268.973 1.017 1.671 1.766 1.773C5.736 19 12 19 12 19s6.264 0 7.831-.367a2.51 2.51 0 001.762-1.773c.44-1.61.44-4.821.44-4.821s0-3.21-.44-4.836zM9.996 15.005l.005-6 5.207 3.005-5.212 2.995z' },
                    { key: 'website', placeholder: 'Sitio web (https://...)', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                  ].map(({ key, placeholder, icon }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d={icon}/></svg>
                      </div>
                      <input type="text" placeholder={placeholder} value={socialLinks[key] ?? ''}
                        onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 bg-white border border-gray-300 text-black rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={loading || !hasChanges}
                  className="w-full h-10 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Guardando...</> : 'Guardar cambios'}
                </button>
              </form>
            </div>
          )}

          {/* ACCOUNT */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Cuenta</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.5rem' }}>Administra tu información de cuenta.</p>
              </div>

              {/* Info de cuenta */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                {[
                  { label: 'Correo', value: user?.email },
                  { label: 'Nombre', value: user?.user_metadata?.name },
                  { label: 'Rol', value: isArtist ? 'Artista' : 'Oyente' },
                  { label: 'Miembro desde', value: new Date(user?.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' }) },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">{item.label}</p>
                    <p className="text-sm font-medium text-black">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Cambiar contraseña */}
              <div className="border border-gray-100 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-black mb-0.5">Cambiar contraseña</h4>
                  <p className="text-xs text-gray-400">Ingresa tu contraseña actual para poder cambiarla.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {error}
                  </div>
                )}
                {msg && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-600 text-xs px-3 py-2.5 rounded-xl">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    {msg}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3">
                  {/* Contraseña actual */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Contraseña actual</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-3">
                    {/* Nueva contraseña */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Nueva contraseña</label>
                      <input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Confirmar nueva contraseña */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Confirmar nueva contraseña</label>
                      <input
                        type="password"
                        placeholder="Repite la nueva contraseña"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {/* Indicador de coincidencia */}
                      {confirmPassword && (
                        <p className={`text-xs font-medium mt-1 ${newPassword === confirmPassword ? 'text-green-500' : 'text-red-400'}`}>
                          {newPassword === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full h-10 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-40 flex items-center justify-center gap-2">
                    {loading ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Verificando...</>
                    ) : 'Actualizar contraseña'}
                  </button>
                </form>

                {/* Olvidé mi contraseña */}
                <div className="pt-1">
                  {resetSent ? (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 text-xs px-3 py-2.5 rounded-xl">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      Te enviamos un correo a <span className="font-semibold">{user?.email}</span> para restablecer tu contraseña.
                    </div>
                  ) : (
                    <button
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold hover:underline transition disabled:opacity-50 flex items-center gap-1">
                      {resetLoading ? (
                        <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Enviando...</>
                      ) : '¿Olvidaste tu contraseña?'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Notificaciones</h3>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.5rem' }}>Elige qué notificaciones quieres recibir.</p>
              <NotificationSettings userId={user?.id} isArtist={isArtist} />
            </div>
          )}

          {/* DANGER */}
          {activeSection === 'danger' && (
            <div className="space-y-6">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Zona de peligro</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.5rem' }}>Acciones irreversibles sobre tu cuenta.</p>
              </div>
              <div className="border border-red-200 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-red-600">Eliminar cuenta</p>
                  <p className="text-xs text-gray-400 mt-0.5">Se eliminarán todos tus datos, canciones y perfil permanentemente.</p>
                </div>
                <button onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition">
                  Eliminar mi cuenta
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}