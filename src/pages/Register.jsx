import { useState } from 'react'
import { registerUser } from '../api/auth'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const validar = () => {
    if (!name.trim()) return 'El nombre es obligatorio.'
    if (name.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.'
    if (!email.includes('@')) return 'Ingresa un correo válido.'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
    if (!/[A-Z]/.test(password)) return 'La contraseña debe tener al menos una mayúscula.'
    if (!/[0-9]/.test(password)) return 'La contraseña debe tener al menos un número.'
    if (password !== confirm) return 'Las contraseñas no coinciden.'
    return null
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    const errorValidacion = validar()
    if (errorValidacion) return setError(errorValidacion)
    try {
      await registerUser(email, password, name)
      setMsg('¡Revisa tu correo para confirmar tu cuenta!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">

        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-purple-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3a9 9 0 00-9 9v4.5A2.5 2.5 0 005.5 19H7a1 1 0 001-1v-5a1 1 0 00-1-1H4.07A8 8 0 0120 12h-3a1 1 0 00-1 1v5a1 1 0 001 1h1.5A2.5 2.5 0 0021 16.5V12a9 9 0 00-9-9z"/>
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-black mb-2 text-center">Crea tu cuenta</h2>
        <p className="text-gray-400 mb-6 text-center">Únete y comparte tu música con el mundo</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}
        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">
            {msg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-black text-sm font-medium">Nombre</label>
            <input type="text" placeholder="Tu nombre artístico" value={name} required onChange={e => setName(e.target.value)} className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="text-black text-sm font-medium">Correo Electrónico</label>
            <input type="email" placeholder="tu@email.com" value={email} required onChange={e => setEmail(e.target.value)} className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="text-black text-sm font-medium">Contraseña</label>
            <input type="password" placeholder="Mín. 6 caracteres, 1 mayúscula y 1 número" value={password} required onChange={e => setPassword(e.target.value)} className="w-full mt-1 bg-white border border-gray-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />

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
            <label className="text-black text-sm font-medium">Confirmar contraseña</label>
            <input type="password" placeholder="Repite tu contraseña" value={confirm} required onChange={e => setConfirm(e.target.value)} className={`w-full mt-1 bg-white border text-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                confirm && password !== confirm ? 'border-red-400' : 'border-gray-300'
              }`} />
            {confirm && password !== confirm && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <button type="submit" className="w-full bg-purple-700 text-white font-semibold py-2 rounded-lg hover:bg-purple-800 transition">
            Crear cuenta
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-purple-700 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}