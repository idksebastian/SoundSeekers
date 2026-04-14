import { useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../api/auth'
import { updateProfile } from '../api/profile'

const SECTIONS = [
  { id: 'edit', label: 'Editar perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'account', label: 'Cuenta', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'privacy', label: 'Privacidad', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { id: 'notifications', label: 'Notificaciones', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'appearance', label: 'Apariencia', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 'danger', label: 'Zona de peligro', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
]

const NAME_CHANGE_LIMIT = 2
const NAME_CHANGE_DAYS = 30

export default function SettingsModal({ onClose, user, role, onProfileUpdated }) {
  const [activeSection, setActiveSection] = useState('edit')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)

  const initialName = user?.user_metadata?.name ?? ''
  const initialArtistName = role?.artist_name ?? ''
  const initialSocials = {
    instagram: role?.instagram ?? '',
    twitter: role?.twitter ?? '',
    tiktok: role?.tiktok ?? '',
    youtube: role?.youtube ?? '',
    website: role?.website ?? '',
  }

  const [name, setName] = useState(initialName)
  const [artistName, setArtistName] = useState(initialArtistName)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.user_metadata?.avatar_url ?? null)
  const [socialLinks, setSocialLinks] = useState(initialSocials)

  const isArtist = role?.role === 'artist'
  const nameChanges = role?.name_changes ?? 0
  const lastNameChange = role?.last_name_change ? new Date(role.last_name_change) : null
  const daysSinceLastChange = lastNameChange
    ? Math.floor((Date.now() - lastNameChange.getTime()) / (1000 * 60 * 60 * 24))
    : NAME_CHANGE_DAYS + 1
  const canChangeName = nameChanges < NAME_CHANGE_LIMIT || daysSinceLastChange >= NAME_CHANGE_DAYS
  const remainingChanges = Math.max(0, NAME_CHANGE_LIMIT - nameChanges)

  const hasChanges = useMemo(() => {
    if (avatarFile) return true
    if (name !== initialName) return true
    if (isArtist && artistName !== initialArtistName) return true
    return Object.keys(initialSocials).some(k => socialLinks[k] !== initialSocials[k])
  }, [name, artistName, avatarFile, socialLinks])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio.')
    if (isArtist && artistName !== initialArtistName && !canChangeName) {
      return setError(`Podrás cambiar tu nombre artístico en ${NAME_CHANGE_DAYS - daysSinceLastChange} días.`)
    }
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await updateProfile({
        name,
        artistName: isArtist ? artistName : undefined,
        artistNameChanged: isArtist && artistName !== initialArtistName,
        avatarFile,
        ...socialLinks
      })
      setMsg('Perfil actualizado correctamente.')
      setAvatarFile(null)
      onProfileUpdated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden.')
    if (newPassword.length < 6) return setError('Mínimo 6 caracteres.')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) return setError(error.message)
    setMsg('Contraseña actualizada correctamente.')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleDeleteAccount = async () => {
    if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return
    onClose()
    await logoutUser()
    navigate('/register')
  }

  const ComingSoon = ({ feature }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700">{feature} próximamente</p>
      <p className="text-xs text-gray-400 mt-1">Estamos trabajando en esta función.</p>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex max-h-[90vh]">

        <div className="w-48 bg-gray-50 border-r border-gray-100 p-4 shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-black">Ajustes</h2>
            <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center transition">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1 flex-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => { setActiveSection(s.id); setMsg(''); setError('') }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition text-left ${
                  activeSection === s.id ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                } ${s.id === 'danger' ? 'text-red-500 hover:bg-red-50 mt-4' : ''}`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">

          {activeSection === 'edit' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Editar perfil</h3>
                <p className="text-gray-400 text-sm">Actualiza tu información pública.</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              {msg && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl">{msg}</div>}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div onClick={() => avatarInputRef.current?.click()}
                    className="relative group cursor-pointer w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition bg-gray-100 shrink-0">
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Foto de perfil</p>
                    <p className="text-xs text-gray-400">Recomendado: 400x400px</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <input required value={name} onChange={e => setName(e.target.value)} maxLength={50}
                    className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>

                {isArtist && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Nombre artístico</label>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        canChangeName ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {canChangeName
                          ? `${remainingChanges} cambio${remainingChanges !== 1 ? 's' : ''} disponible${remainingChanges !== 1 ? 's' : ''}`
                          : `Disponible en ${NAME_CHANGE_DAYS - daysSinceLastChange} días`}
                      </span>
                    </div>
                    <input
                      value={artistName}
                      onChange={e => setArtistName(e.target.value)}
                      disabled={!canChangeName}
                      maxLength={50}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        canChangeName
                          ? 'bg-white border-gray-300 text-black'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    />
                    <p className="text-xs text-gray-400">Máximo {NAME_CHANGE_LIMIT} cambios cada {NAME_CHANGE_DAYS} días.</p>
                  </div>
                )}

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
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d={icon} />
                        </svg>
                      </div>
                      <input type="text" placeholder={placeholder} value={socialLinks[key] ?? ''}
                        onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 bg-white border border-gray-300 text-black rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={loading || !hasChanges}
                  className="w-full h-10 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Guardando...
                    </>
                  ) : 'Guardar cambios'}
                </button>
              </form>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Cuenta</h3>
                <p className="text-gray-400 text-sm">Administra tu información de cuenta.</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Correo</p>
                  <p className="text-sm font-medium text-black">{user?.email}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="text-sm font-medium text-black">{user?.user_metadata?.name}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Miembro desde</p>
                  <p className="text-sm font-medium text-black">
                    {new Date(user?.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-black mb-3">Cambiar contraseña</h4>
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">{error}</div>}
                {msg && <div className="bg-green-50 border border-green-200 text-green-600 text-xs px-3 py-2 rounded-xl mb-3">{msg}</div>}
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input type="password" placeholder="Nueva contraseña" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <input type="password" placeholder="Confirmar contraseña" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <button type="submit" disabled={loading}
                    className="w-full h-10 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50">
                    {loading ? 'Guardando...' : 'Actualizar contraseña'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && <ComingSoon feature="Configuración de privacidad" />}
          {activeSection === 'notifications' && <ComingSoon feature="Configuración de notificaciones" />}
          {activeSection === 'appearance' && <ComingSoon feature="Configuración de apariencia" />}

          {activeSection === 'danger' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Zona de peligro</h3>
                <p className="text-gray-400 text-sm">Acciones irreversibles sobre tu cuenta.</p>
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