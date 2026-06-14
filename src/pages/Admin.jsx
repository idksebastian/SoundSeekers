import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPendingRequests, approveArtist, rejectArtist, isAdmin } from '../api/roles'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [processing, setProcessing] = useState(null)
  const [rejectModal, setRejectModal] = useState(null) // req que se va a rechazar
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSending, setRejectSending] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (!user) return navigate('/login')
      const admin = await isAdmin(user.id)
      if (!admin) return navigate('/home')
      setAuthorized(true)
      const data = await getPendingRequests()
      setRequests(data)

      // Cargar perfiles y emails de auth.users via profiles
      if (data.length > 0) {
        const ids = data.map(r => r.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', ids)
        if (profilesData) {
          const map = {}
          profilesData.forEach(p => { map[p.user_id] = p })
          setProfiles(map)
        }
      }
      setLoading(false)
    }
    init()
  }, [user])

  const handleApprove = async (req) => {
    setProcessing(req.user_id)
    try {
      await approveArtist(req.user_id, req.artist_name)
      setRequests(prev => prev.filter(r => r.user_id !== req.user_id))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectModal) return
    setRejectSending(true)
    try {
      await rejectArtist(rejectModal.user_id, rejectModal.artist_name)

      // Notificación del sistema al usuario
      await supabase.from('notifications').insert([{
        user_id: rejectModal.user_id,
        type: 'system',
        from_user_id: null,
        reference_id: null,
        message: rejectReason.trim() || 'Tu solicitud para ser artista no fue aprobada en este momento.',
      }])

      setRequests(prev => prev.filter(r => r.user_id !== rejectModal.user_id))
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      console.error(err)
    } finally {
      setRejectSending(false)
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

      {/* Modal de rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-black mb-1">Rechazar solicitud</h3>
            <p className="text-sm text-gray-400 mb-4">
              Escribe el motivo del rechazo para <span className="font-semibold text-gray-700">{rejectModal.artist_name}</span>. Se le enviará como notificación.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ej: Tu perfil no cumple con los requisitos mínimos de contenido musical original..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={rejectSending}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2">
                {rejectSending ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : null}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Panel de administración</h1>
          <p className="text-gray-400 mt-1">
            {requests.length > 0
              ? `${requests.length} solicitud${requests.length > 1 ? 'es' : ''} pendiente${requests.length > 1 ? 's' : ''}`
              : 'Sin solicitudes pendientes'}
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Todo al día</p>
            <p className="text-gray-400 text-sm mt-1">No hay solicitudes de artista pendientes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const profile = profiles[req.user_id]
              return (
                <div key={req.user_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                  {/* Header con avatar + nombre */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100 shrink-0 flex items-center justify-center">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={req.artist_name} className="w-full h-full object-cover"/>
                        ) : (
                          <span className="text-purple-700 font-bold text-lg uppercase">
                            {req.artist_name?.[0] ?? '?'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-black">{req.artist_name}</h3>
                          <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                            Pendiente
                          </span>
                        </div>
                        {profile?.name && (
                          <p className="text-xs text-gray-400">Nombre real: {profile.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Botón ver perfil */}
                    <button
                      onClick={() => navigate(`/artist/${req.user_id}`)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 text-purple-600 text-xs font-semibold hover:bg-purple-50 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      Ver perfil
                    </button>
                  </div>

                  {/* Info artista */}
                  <div className="space-y-2 mb-4">
                    {req.artist_genre && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Género</span>
                        <span className="text-sm text-gray-700">{req.artist_genre}</span>
                      </div>
                    )}
                    {req.artist_bio && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">Bio</span>
                        <span className="text-sm text-gray-600 italic">"{req.artist_bio}"</span>
                      </div>
                    )}
                    {req.artist_mood && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Estado</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                          <span className="text-sm text-gray-600">{req.artist_mood}</span>
                        </div>
                      </div>
                    )}
                    {req.accepted_terms_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Fecha</span>
                        <span className="text-xs text-gray-400">
                          {new Date(req.accepted_terms_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                    <button
                      onClick={() => { setRejectModal(req); setRejectReason('') }}
                      disabled={processing === req.user_id}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.user_id}
                      className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center gap-2">
                      {processing === req.user_id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : null}
                      Aprobar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}