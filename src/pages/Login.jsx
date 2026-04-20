import { useState } from 'react'
import { loginUser } from '../api/auth'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Si ya hay sesión activa → redirige al dashboard
  if (user) return <Navigate to="/dashboard" replace />

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await loginUser(email, password)
      navigate('/dashboard', { replace: true }) // replace evita volver atrás al login
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white p-8 rounded-2xl w-full max-w-lg">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-purple-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3a9 9 0 00-9 9v4.5A2.5 2.5 0 005.5 19H7a1 1 0 001-1v-5a1 1 0 00-1-1H4.07A8 8 0 0120 12h-3a1 1 0 00-1 1v5a1 1 0 001 1h1.5A2.5 2.5 0 0021 16.5V12a9 9 0 00-9-9z"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-black mb-2 text-center">Bienvenido de vuelta</h2>
        <p className="text-gray-400 mb-6 text-center">Inicia sesión para seguir descubriendo música</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-black font-semibold text-sm">Correo Electrónico</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="text-black font-semibold text-sm">Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <Link to="/forgot-password" className="text-xs text-purple-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <button type="submit"
            className="w-full bg-purple-700 text-white font-semibold py-2 rounded-lg hover:bg-purple-800 transition">
            Iniciar sesión
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 mt-4">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-purple-700 hover:underline">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  )
}