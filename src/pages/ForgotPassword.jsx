import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
        </div>

        {sent ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-black mb-2">Revisa tu correo</h2>
            <p className="text-gray-400 mb-6">
              Enviamos un enlace de recuperación a <strong className="text-black">{email}</strong>. Revisa tu bandeja de entrada y spam.
            </p>
            <Link to="/login" className="text-purple-700 hover:underline text-sm font-semibold">
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-black mb-2 text-center">¿Olvidaste tu contraseña?</h2>
            <p className="text-gray-400 mb-6 text-center text-sm">
              Ingresa tu correo y te enviamos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-black font-semibold text-sm">Correo Electrónico</label>
                <input type="email" placeholder="tu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
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
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>

            <p className="text-sm text-center text-gray-600 mt-4">
              <Link to="/login" className="text-purple-700 hover:underline">← Volver al inicio de sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}