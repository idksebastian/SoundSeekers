import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api/auth'
import { updateProfile, getFollowStats } from '../api/profile'
import { getMySongs, deleteSong, updateSong } from '../api/songs'
import { getArtistAlbums } from '../api/albums'
import { usePlayer } from '../context/PlayerContext'

const SECTIONS = [
  { id: 'stats', label: 'Estadísticas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', artist: true },
  { id: 'songs', label: 'Mis canciones', icon: 'M12 3v10.55A4 4 0 1014 17V7h4V3h-6z', artist: true },
  { id: 'edit', label: 'Editar perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'account', label: 'Cuenta', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'notifications', label: 'Notificaciones', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'danger', label: 'Zona de peligro', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', danger: true },
]

const GENRES = ['Reggaeton', 'Hip-Hop', 'Champeta', 'Electrónica', 'Pop', 'Indie', 'Jazz', 'Folk', 'Vallenato', 'Salsa', 'Rap', 'Otro']

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
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: prefs[item.key] ? item.bg : '#f9fafb', borderRadius: '14px', border: `1px solid ${prefs[item.key] ? item.bg : '#f3f4f6'}`, transition: 'all 0.2s', cursor: 'pointer' }}
            onClick={() => toggle(item.key)}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: prefs[item.key] ? '#fff' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" stroke={prefs[item.key] ? item.color : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={item.icon}/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: prefs[item.key] ? '#111' : '#9ca3af', margin: '0 0 2px' }}>{item.label}</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{item.desc}</p>
            </div>
            <div style={{ width: '40px', height: '22px', borderRadius: '100px', background: prefs[item.key] ? item.color : '#e5e7eb', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '3px', left: prefs[item.key] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}/>
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
  const { playSong } = usePlayer()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const [activeSection, setActiveSection] = useState('edit')
  const [role, setRole] = useState(null)
  const [loadingRole, setLoadingRole] = useState(true)

  // Edit profile state
  const [name, setName] = useState('')
  const [artistName, setArtistName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [socialLinks, setSocialLinks] = useState({ instagram: '', twitter: '', tiktok: '', youtube: '', website: '' })

  // Account state
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

  // Songs state
  const [songs, setSongs] = useState([])
  const [loadingSongs, setLoadingSongs] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [editingSong, setEditingSong] = useState(null) // song being edited
  const [editForm, setEditForm] = useState({ title: '', genre: '', description: '' })
  const [editCoverFile, setEditCoverFile] = useState(null)
  const [editCoverPreview, setEditCoverPreview] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [songMsg, setSongMsg] = useState('')

  useEffect(() => {
    if (!user) return
    const fetchRole = async () => {
      const { data } = await supabase.from('user_roles').select('*').eq('user_id', user.id).single()
      setRole(data)
      setName(user.user_metadata?.name ?? '')
      setArtistName(data?.artist_name ?? '')
      setDescription(data?.description ?? data?.artist_bio ?? '')
      setAvatarPreview(user.user_metadata?.avatar_url ?? null)
      setSocialLinks({ instagram: data?.instagram ?? '', twitter: data?.twitter ?? '', tiktok: data?.tiktok ?? '', youtube: data?.youtube ?? '', website: data?.website ?? '' })
      setLoadingRole(false)
    }
    fetchRole()
  }, [user])

  // Cargar canciones cuando se activa la sección
  useEffect(() => {
    if (activeSection !== 'songs' || !user) return
    const fetchSongs = async () => {
      setLoadingSongs(true)
      try {
        const data = await getMySongs(user.id)
        setSongs(data)
      } catch (err) { console.error(err) }
      finally { setLoadingSongs(false) }
    }
    fetchSongs()
  }, [activeSection, user])

  useEffect(() => {
    if (activeSection !== 'stats' || !user) return
    const fetchStats = async () => {
      setLoadingStats(true)
      try {
        const [songsData, followData, albums] = await Promise.all([getMySongs(user.id), getFollowStats(user.id), getArtistAlbums(user.id)])
        const totalStreams = songsData.reduce((a, s) => a + (s.streams ?? 0), 0)
        const topSongs = [...songsData].sort((a, b) => (b.streams ?? 0) - (a.streams ?? 0)).slice(0, 5)
        const { data: presavesData } = await supabase.from('presaves').select('id', { count: 'exact' }).in('album_id', albums.map(a => a.id))
        setStats({ totalStreams, totalSongs: songsData.length, totalAlbums: albums.length, followers: followData.followers, following: followData.following, presaves: presavesData?.length ?? 0 })
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) return setError('La contraseña actual es incorrecta.')
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) return setError(updateError.message)
      setMsg('Contraseña actualizada correctamente.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch { setError('Ocurrió un error. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  const handleForgotPassword = async () => {
    setResetLoading(true); setError(''); setMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` })
    setResetLoading(false)
    if (error) return setError(error.message)
    setResetSent(true)
  }

  const handleDeleteAccount = async () => {
    if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return
    await logoutUser()
    navigate('/register')
  }

  // ── Song management ──────────────────────────────────────────────────────────
  const handleDeleteSong = async (songId) => {
    if (confirmDeleteId !== songId) { setConfirmDeleteId(songId); return }
    setDeletingId(songId)
    try {
      await deleteSong(songId)
      setSongs(prev => prev.filter(s => s.id !== songId))
      setConfirmDeleteId(null)
      setSongMsg('Canción eliminada correctamente.')
      setTimeout(() => setSongMsg(''), 3000)
    } catch (err) { console.error(err) }
    finally { setDeletingId(null) }
  }

  const openEditSong = (song) => {
    setEditingSong(song)
    setEditForm({ title: song.title, genre: song.genre ?? '', description: song.description ?? '' })
    setEditCoverFile(null)
    setEditCoverPreview(song.cover_url)
  }

  const handleEditCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setEditCoverFile(file)
    setEditCoverPreview(URL.createObjectURL(file))
  }

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return
    setSavingEdit(true)
    try {
      let coverUrl = editingSong.cover_url
      if (editCoverFile) {
        const ext = editCoverFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}_cover.${ext}`
        const { error: uploadError } = await supabase.storage.from('covers').upload(path, editCoverFile, { upsert: true })
        if (!uploadError) {
          const { data } = supabase.storage.from('covers').getPublicUrl(path)
          coverUrl = data.publicUrl
        }
      }
      const updated = await updateSong(editingSong.id, {
        title: editForm.title.trim(),
        genre: editForm.genre,
        description: editForm.description.trim(),
        cover_url: coverUrl,
      })
      setSongs(prev => prev.map(s => s.id === updated.id ? updated : s))
      setEditingSong(null)
      setSongMsg('Canción actualizada correctamente.')
      setTimeout(() => setSongMsg(''), 3000)
    } catch (err) { console.error(err) }
    finally { setSavingEdit(false) }
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        .settings-header { background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 1.5rem 1rem 3.5rem; }
        @media (min-width: 600px) { .settings-header { padding: 2rem 2rem 4rem; } }
        .settings-layout { max-width: 1100px; margin: -1.5rem auto 0; padding: 0 1rem; }
        @media (min-width: 600px) { .settings-layout { margin: -2rem auto 0; padding: 0 2rem; } }
        @media (min-width: 768px) { .settings-layout { display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: start; } .settings-sidebar-desktop { display: block; } .settings-tabs-mobile { display: none; } }
        @media (max-width: 767px) { .settings-sidebar-desktop { display: none; } .settings-tabs-mobile { display: flex; } }
        .settings-sidebar-desktop { background: #fff; border-radius: 20px; padding: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); position: sticky; top: 84px; }
        .settings-tabs-mobile { overflow-x: auto; gap: 6px; padding: 0 0 8px; margin-bottom: 12px; }
        .settings-tab-mobile { flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 100px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; color: #6b7280; }
        .settings-tab-mobile.active { background: #7c3aed; color: #fff; border-color: #7c3aed; }
        .settings-tab-mobile.danger { color: #ef4444; border-color: #fecaca; }
        .settings-tab-mobile.danger.active { background: #ef4444; color: #fff; border-color: #ef4444; }
        .settings-content { background: #fff; border-radius: 20px; padding: 1.25rem; box-shadow: 0 4px 20px rgba(0,0,0,0.06); min-height: 400px; }
        @media (min-width: 600px) { .settings-content { padding: 2rem; } }
        .sidebar-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: none; cursor: pointer; text-align: left; font-size: 13px; font-weight: 600; font-family: inherit; margin-bottom: 2px; transition: all 0.15s; }
        .song-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; border: 1px solid #f3f4f6; background: #fafafa; transition: all 0.15s; }
        .song-card:hover { background: #f5f3ff; border-color: #ede9fe; }
      `}</style>

      {/* Header */}
      <div className="settings-header">
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(-1)} style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{name?.[0]?.toUpperCase() ?? '?'}</div>
              }
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0, lineHeight: 1.2 }}>{isArtist ? artistName || name : name}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{isArtist ? 'Artista' : 'Oyente'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-layout">

        {/* Sidebar desktop */}
        <div className="settings-sidebar-desktop">
          {visibleSections.map(s => (
            <button key={s.id} className="sidebar-btn"
              onClick={() => { setActiveSection(s.id); setMsg(''); setError('') }}
              style={{
                background: activeSection === s.id ? (s.danger ? '#fef2f2' : '#f5f3ff') : 'transparent',
                color: activeSection === s.id ? (s.danger ? '#ef4444' : '#7c3aed') : s.danger ? '#ef4444' : '#374151',
                borderTop: s.danger ? '1px solid #f3f4f6' : 'none',
                marginTop: s.danger ? '8px' : '0',
              }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d={s.icon}/>
              </svg>
              {s.label}
            </button>
          ))}
        </div>

        <div>
          {/* Tabs mobile */}
          <div className="settings-tabs-mobile">
            {visibleSections.map(s => (
              <button key={s.id}
                className={`settings-tab-mobile ${s.danger ? 'danger' : ''} ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => { setActiveSection(s.id); setMsg(''); setError('') }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d={s.icon}/>
                </svg>
                {s.label}
              </button>
            ))}
          </div>

          <div className="settings-content">

            {/* ── ESTADÍSTICAS ── */}
            {activeSection === 'stats' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Estadísticas</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.5rem' }}>Resumen de tu actividad en SoundSeekers.</p>
                {loadingStats ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  </div>
                ) : stats ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
                      {[
                        { label: 'Reproducciones', value: stats.totalStreams.toLocaleString(), icon: 'M5 3l14 9-14 9V3z', color: '#7c3aed', bg: '#f5f3ff' },
                        { label: 'Seguidores', value: stats.followers.toLocaleString(), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: '#ec4899', bg: '#fdf2f8' },
                        { label: 'Siguiendo', value: stats.following.toLocaleString(), icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: '#3b82f6', bg: '#eff6ff' },
                        { label: 'Canciones', value: stats.totalSongs.toLocaleString(), icon: 'M12 3v10.55A4 4 0 1014 17V7h4V3h-6z', color: '#10b981', bg: '#f0fdf4' },
                        { label: 'Álbumes / EPs', value: stats.totalAlbums.toLocaleString(), icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', color: '#f59e0b', bg: '#fffbeb' },
                        { label: 'Presaves', value: stats.presaves.toLocaleString(), icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', color: '#6366f1', bg: '#eef2ff' },
                      ].map(card => (
                        <div key={card.label} style={{ background: card.bg, borderRadius: '14px', padding: '0.9rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <svg width="14" height="14" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={card.icon}/></svg>
                          </div>
                          <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#111', margin: '0 0 2px', fontFamily: "'Bebas Neue', sans-serif" }}>{card.value}</p>
                          <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: '600' }}>{card.label}</p>
                        </div>
                      ))}
                    </div>
                    {songStats.length > 0 && (
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '800', color: '#111', margin: '0 0 10px' }}>Top canciones</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {songStats.map((song, idx) => {
                            const maxStreams = songStats[0]?.streams ?? 1
                            const pct = Math.max(4, Math.round(((song.streams ?? 0) / maxStreams) * 100))
                            return (
                              <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '12px', background: idx === 0 ? '#f5f3ff' : '#f9fafb' }}>
                                <span style={{ fontSize: '11px', color: '#9ca3af', width: '14px', flexShrink: 0 }}>{idx + 1}</span>
                                <img src={song.cover_url} alt={song.title} style={{ width: '34px', height: '34px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }}/>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#111', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                                  <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: idx === 0 ? '#7c3aed' : '#d1d5db', borderRadius: '2px' }}/>
                                  </div>
                                </div>
                                <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', flexShrink: 0 }}>{(song.streams ?? 0).toLocaleString()}</span>
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

            {/* ── MIS CANCIONES ── */}
            {activeSection === 'songs' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111', margin: 0 }}>Mis canciones</h3>
                  <button onClick={() => navigate('/upload')}
                    className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    Subir canción
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.25rem' }}>Gestiona las canciones que has publicado.</p>

                {songMsg && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    {songMsg}
                  </div>
                )}

                {/* Modal editar canción */}
                {editingSong && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingSong(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-5">
                        <h4 className="text-base font-bold text-black">Editar canción</h4>
                        <button onClick={() => setEditingSong(null)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>

                      {/* Portada editable */}
                      <div className="flex items-center gap-4 mb-5">
                        <div className="relative group cursor-pointer shrink-0" onClick={() => coverInputRef.current?.click()}>
                          <img src={editCoverPreview} alt={editingSong.title} className="w-16 h-16 rounded-xl object-cover"/>
                          <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
                          </div>
                          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditCoverChange}/>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-black truncate">{editingSong.title}</p>
                          <p className="text-xs text-gray-400">Clic en la imagen para cambiar la portada</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">Título</label>
                          <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} maxLength={80}
                            className="w-full bg-white border border-gray-300 text-black rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">Género</label>
                          <select value={editForm.genre} onChange={e => setEditForm(p => ({ ...p, genre: e.target.value }))}
                            className="w-full bg-white border border-gray-300 text-black rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">Descripción</label>
                          <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} maxLength={300}
                            className="w-full bg-white border border-gray-300 text-black rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"/>
                          <p className="text-xs text-gray-400 text-right">{editForm.description.length}/300</p>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-5">
                        <button onClick={() => setEditingSong(null)}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                          Cancelar
                        </button>
                        <button onClick={handleSaveEdit} disabled={savingEdit || !editForm.title.trim()}
                          className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                          {savingEdit ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Guardando...</> : 'Guardar cambios'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {loadingSongs ? (
                  <div className="flex justify-center py-12">
                    <svg className="w-7 h-7 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  </div>
                ) : songs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium text-sm">No has subido canciones aún</p>
                    <button onClick={() => navigate('/upload')} className="mt-3 text-sm text-purple-600 font-semibold hover:underline">
                      + Subir primera canción
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {songs.map(song => {
                      const isConfirming = confirmDeleteId === song.id
                      return (
                        <div key={song.id} className={`song-card ${isConfirming ? '!border-red-200 !bg-red-50' : ''}`}>
                          {/* Portada */}
                          <img src={song.cover_url} alt={song.title} className="w-12 h-12 rounded-xl object-cover shrink-0"/>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-black truncate">{song.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">{song.genre}</span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z"/></svg>
                                {(song.streams ?? 0).toLocaleString()} rep.
                              </span>
                            </div>
                            {isConfirming && <p className="text-xs text-red-500 font-medium mt-1">¿Confirmar eliminación? Esta acción no se puede deshacer.</p>}
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Play */}
                            <button onClick={() => playSong(song)}
                              className="w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center transition"
                              title="Reproducir">
                              <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                            </button>

                            {/* Editar */}
                            <button onClick={() => openEditSong(song)}
                              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                              title="Editar">
                              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => handleDeleteSong(song.id)}
                              disabled={deletingId === song.id}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-50 ${isConfirming ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-100 hover:bg-red-50'}`}
                              title={isConfirming ? 'Confirmar eliminación' : 'Eliminar'}>
                              {deletingId === song.id ? (
                                <svg className="w-3.5 h-3.5 animate-spin text-red-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                              ) : (
                                <svg className={`w-3.5 h-3.5 ${isConfirming ? 'text-white' : 'text-gray-500 group-hover:text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              )}
                            </button>

                            {/* Cancelar confirmación */}
                            {isConfirming && (
                              <button onClick={() => setConfirmDeleteId(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── EDITAR PERFIL ── */}
            {activeSection === 'edit' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Editar perfil</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.25rem' }}>Actualiza tu información pública.</p>
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
                {msg && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{msg}</div>}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div onClick={() => avatarInputRef.current?.click()} className="relative group cursor-pointer w-14 h-14 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition bg-gray-100 shrink-0">
                      {avatarPreview ? (
                        <>
                          <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover"/>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
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
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="text-sm font-medium text-gray-700">Nombre artístico</label>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${canChangeName ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {canChangeName ? `${remainingChanges} cambio${remainingChanges !== 1 ? 's' : ''} disponible${remainingChanges !== 1 ? 's' : ''}` : `En ${NAME_CHANGE_DAYS - daysSinceLastChange} días`}
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
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d={icon}/></svg>
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

            {/* ── CUENTA ── */}
            {activeSection === 'account' && (
              <div className="space-y-5">
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Cuenta</h3>
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.25rem' }}>Administra tu información de cuenta.</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                  {[
                    { label: 'Correo', value: user?.email },
                    { label: 'Nombre', value: user?.user_metadata?.name },
                    { label: 'Rol', value: isArtist ? 'Artista' : 'Oyente' },
                    { label: 'Miembro desde', value: new Date(user?.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' }) },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center gap-4">
                      <p className="text-sm text-gray-500 shrink-0">{item.label}</p>
                      <p className="text-sm font-medium text-black text-right truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="border border-gray-100 rounded-2xl p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-black mb-0.5">Cambiar contraseña</h4>
                    <p className="text-xs text-gray-400">Ingresa tu contraseña actual para poder cambiarla.</p>
                  </div>
                  {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{error}</div>}
                  {msg && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-600 text-xs px-3 py-2.5 rounded-xl"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>{msg}</div>}
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Contraseña actual</label>
                      <input type="password" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    </div>
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Nueva contraseña</label>
                        <input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Confirmar nueva contraseña</label>
                        <input type="password" placeholder="Repite la nueva contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                        {confirmPassword && (
                          <p className={`text-xs font-medium mt-1 ${newPassword === confirmPassword ? 'text-emerald-500' : 'text-red-400'}`}>
                            {newPassword === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                          </p>
                        )}
                      </div>
                    </div>
                    <button type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full h-10 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-40 flex items-center justify-center gap-2">
                      {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Verificando...</> : 'Actualizar contraseña'}
                    </button>
                  </form>
                  <div className="pt-1">
                    {resetSent ? (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 text-xs px-3 py-2.5 rounded-xl">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        Te enviamos un correo a <span className="font-semibold">{user?.email}</span>
                      </div>
                    ) : (
                      <button onClick={handleForgotPassword} disabled={resetLoading}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold hover:underline transition disabled:opacity-50">
                        {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── NOTIFICACIONES ── */}
            {activeSection === 'notifications' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Notificaciones</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.25rem' }}>Elige qué notificaciones quieres recibir.</p>
                <NotificationSettings userId={user?.id} isArtist={isArtist} />
              </div>
            )}

            {/* ── ZONA DE PELIGRO ── */}
            {activeSection === 'danger' && (
              <div className="space-y-5">
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111', margin: '0 0 4px' }}>Zona de peligro</h3>
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 1.25rem' }}>Acciones irreversibles sobre tu cuenta.</p>
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
    </div>
  )
}
