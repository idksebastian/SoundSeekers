import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserRole } from '../api/roles'

export default function ArtistRoute({ children }) {
  const { user } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      getUserRole(user.id).then(r => {
        setRole(r)
        setLoading(false)
      })
    }
  }, [user])

  if (loading) return null
  if (role?.role !== 'artist') return <Navigate to="/profile" replace />
  return children
}