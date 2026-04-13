import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPendingRequests, approveArtist, rejectArtist, isAdmin } from '../api/roles'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    const init = async () => {
      if (!user) return navigate('/login')
      const admin = await isAdmin(user.id)
      if (!admin) return navigate('/home')
      setAuthorized(true)
      const data = await getPendingRequests()
      setRequests(data)
      setLoading(false)
    }
    init()
  }, [user])

  const handleApprove = async (req) => {
    setProcessing(req.user_id)
    try {
      const { data: { users } } = await import('../lib/supabase').then(m =>
        m.supabase.auth.admin.listUsers()
      )
      const userEmail = users?.find(u => u.id === req.user_id)?.email ?? ''
      await approveArtist(req.user_id, userEmail, req.artist_name)
      setRequests(prev => prev.filter(r => r.user_id !== req.user_id))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (req) => {
    setProcessing(req.user_id)
    try {
      await rejectArtist(req.user_id, '', req.artist_name)
      setRequests(prev => prev.filter(r => r.user_id !== req.user_id))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  if (!authorized || loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Panel de administración</h1>
          <p className="text-gray-400 mt-1">Solicitudes de verificación de artista</p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.user_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-black">{req.artist_name}</h3>
                      <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                        Pendiente
                      </span>
                    </div>
                    {req.artist_genre && <p className="text-gray-400 text-sm">{req.artist_genre}</p>}
                    {req.artist_bio && <p className="text-gray-500 text-sm mt-1 italic">"{req.artist_bio}"</p>}
                    {req.accepted_terms_at && (
                      <p className="text-gray-300 text-xs mt-2">
                        Solicitud: {new Date(req.accepted_terms_at).toLocaleDateString('es-CO', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processing === req.user_id}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.user_id}
                      className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {processing === req.user_id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : 'Aprobar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}