import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../api/auth'

const SECTIONS = [
  { id: 'account', label: 'Cuenta', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'privacy', label: 'Privacidad', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { id: 'notifications', label: 'Notificaciones', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'appearance', label: 'Apariencia', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 'danger', label: 'Zona de peligro', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
]

export default function SettingsModal({ onClose, user }) {
  const [activeSection, setActiveSection] = useState('account')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
    await logoutUser()
    navigate('/register')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex max-h-[85vh]">

        {/* Sidebar */}
        <div className="w-48 bg-gray-50 border-r border-gray-100 p-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-black">Ajustes</h2>
            <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center transition">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition text-left ${
                  activeSection === s.id
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-6 overflow-y-auto">

          {/* Cuenta */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Cuenta</h3>
                <p className="text-gray-400 text-sm">Administra tu información de cuenta.</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
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

              {/* Cambiar contraseña */}
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

          {/* Privacidad */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Privacidad</h3>
                <p className="text-gray-400 text-sm">Controla quién puede ver tu información.</p>
              </div>
              {[
                { label: 'Perfil público', desc: 'Cualquiera puede ver tu perfil' },
                { label: 'Mostrar seguidores', desc: 'Mostrar tu número de seguidores' },
                { label: 'Mostrar reproducciones', desc: 'Mostrar cuántas veces se reproducen tus canciones' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-medium text-black">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <div className="w-10 h-6 bg-purple-600 rounded-full flex items-center justify-end px-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notificaciones */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Notificaciones</h3>
                <p className="text-gray-400 text-sm">Elige qué notificaciones quieres recibir.</p>
              </div>
              {[
                { label: 'Nuevos seguidores', desc: 'Cuando alguien te sigue' },
                { label: 'Me gusta en canciones', desc: 'Cuando alguien da like a tu canción' },
                { label: 'Comentarios', desc: 'Cuando alguien comenta tu contenido' },
                { label: 'Novedades de SoundSeekers', desc: 'Actualizaciones y noticias de la plataforma' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-medium text-black">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition ${i % 2 === 0 ? 'bg-purple-600 justify-end' : 'bg-gray-200 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Apariencia */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Apariencia</h3>
                <p className="text-gray-400 text-sm">Personaliza cómo se ve SoundSeekers.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Claro', active: true },
                  { label: 'Oscuro', active: false },
                ].map(theme => (
                  <div key={theme.label}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                      theme.active ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <div className={`w-full h-16 rounded-xl mb-2 ${theme.label === 'Claro' ? 'bg-white border border-gray-200' : 'bg-gray-900'}`} />
                    <p className={`text-sm font-medium ${theme.active ? 'text-purple-700' : 'text-gray-600'}`}>{theme.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">El modo oscuro estará disponible próximamente.</p>
            </div>
          )}

          {/* Zona de peligro */}
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