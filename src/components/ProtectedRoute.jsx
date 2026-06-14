import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, silent = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // En modo silent (para Player/ChatBot) no muestra spinner ni redirige
  if (silent) return user ? children : null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}
