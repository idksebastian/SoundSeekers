import { useState, useRef, useEffect } from 'react'
import { getProfile, updateProfile } from '../api/profile'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile().then(user => {
      setName(user.user_metadata?.name ?? '')
      setEmail(user.email)
      setAvatarPreview(user.user_metadata?.avatar_url ?? null)
    })
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    setError('')
    setMsg('')
    try {
      await updateProfile({ name, avatarFile })
      setMsg('Perfil actualizado correctamente.')
      setAvatarFile(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-lg">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-black mb-2">Mi perfil</h1>
          <p className="text-gray-400">Actualiza tu información personal.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}
        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-6">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors bg-gray-100"
            >
              {avatarPreview ? (
                <>
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 group-hover:text-purple-500 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <p className="text-xs text-gray-400">Clic para cambiar foto</p>
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Email — solo lectura */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
            <input
              value={email}
              readOnly
              className="w-full bg-gray-100 border border-gray-200 text-gray-400 rounded-xl px-4 py-2.5 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400">El correo no se puede cambiar.</p>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 h-12 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-base font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-12 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-base font-semibold transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Guardando...
                </>
              ) : 'Guardar cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}