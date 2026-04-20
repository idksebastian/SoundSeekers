import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase maneja el token automáticamente desde la URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token válido, el usuario puede cambiar su contraseña
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white p-8 rounded-2xl w-full max-w-lg">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">¡Contraseña actualizada!</h2>
            <p className="text-gray-400 text-sm">Redirigiendo al inicio de sesión...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-black mb-2 text-center">Nueva contraseña</h2>
            <p className="text-gray-400 mb-6 text-center text-sm">
              Elige una contraseña segura para tu cuenta.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-black font-semibold text-sm">Nueva contraseña</label>
                <input type="password" placeholder="Mínimo 6 caracteres" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div>
                <label className="text-black font-semibold text-sm">Confirmar contraseña</label>
                <input type="password" placeholder="Repite tu contraseña" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required
                  className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-purple-700 text-white font-semibold py-2 rounded-lg hover:bg-purple-800 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                {loading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}