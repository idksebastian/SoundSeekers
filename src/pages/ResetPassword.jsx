import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [status, setStatus] = useState('checking')
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search
    // ✅ Misma lógica que en AuthContext: soporta implicit y PKCE.
    const hasRecoveryHash =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      search.includes('code=')

    let resolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 🔍 DEBUG TEMPORAL — quitar después de diagnosticar
      console.log('[RESET DEBUG]', { event, hasSession: !!session, href: window.location.href, hasRecoveryHash })

      // ✅ FIX (gotcha PKCE): aceptamos también 'SIGNED_IN' como señal de
      // que el formulario debe mostrarse, siempre que la URL sea de
      // recovery. En PKCE, Supabase no siempre distingue el evento como
      // PASSWORD_RECOVERY — a veces llega como SIGNED_IN normal.
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && hasRecoveryHash)) {
        resolved = true
        setStatus('ready')
      }
    })

    const checkInitial = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (resolved) return

      if (session && hasRecoveryHash) {
        setStatus('ready')
        resolved = true
        return
      }

      setTimeout(() => {
        if (!resolved) setStatus(prev => prev === 'checking' ? 'invalid' : prev)
      }, 2500)
    }
    checkInitial()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const validar = () => {
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
    if (!/[A-Z]/.test(password)) return 'La contraseña debe tener al menos una mayúscula.'
    if (!/[0-9]/.test(password)) return 'La contraseña debe tener al menos un número.'
    if (password !== confirm) return 'Las contraseñas no coinciden.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errorValidacion = validar()
    if (errorValidacion) return setError(errorValidacion)

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { error: sameError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        })
        if (!sameError) {
          setLoading(false)
          return setError('La nueva contraseña debe ser diferente a la anterior.')
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white p-8 rounded-2xl w-full max-w-lg text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Enlace inválido o expirado</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Este enlace de recuperación ya no es válido. Solicita uno nuevo para restablecer tu contraseña.
          </p>
          <a href="/forgot-password" className="text-purple-700 hover:underline text-sm font-semibold">
            Solicitar nuevo enlace
          </a>
        </div>
      </div>
    )
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
                <input type="password" placeholder="Mín. 6 caracteres, 1 mayúscula y 1 número" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"/>

                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      <div className={`h-1 flex-1 rounded-full ${password.length >= 6 ? 'bg-purple-500' : 'bg-gray-200'}`} />
                      <div className={`h-1 flex-1 rounded-full ${/[A-Z]/.test(password) ? 'bg-purple-500' : 'bg-gray-200'}`} />
                      <div className={`h-1 flex-1 rounded-full ${/[0-9]/.test(password) ? 'bg-purple-500' : 'bg-gray-200'}`} />
                    </div>
                    <p className="text-xs text-gray-400">Mínimo 6 caracteres · una mayúscula · un número</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-black font-semibold text-sm">Confirmar contraseña</label>
                <input type="password" placeholder="Repite tu contraseña" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required
                  className={`w-full mt-1 bg-white border text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    confirm && password !== confirm ? 'border-red-400' : 'border-gray-300'
                  }`}/>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
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