import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPendingFeats, respondFeat } from '../api/songs'
import { getUserRole } from '../api/roles'

export default function Requests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [feats, setFeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    const init = async () => {
      if (!user) return navigate('/login')
      const role = await getUserRole(user.id)
      if (role?.role !== 'artist') return navigate('/profile')
      const data = await getPendingFeats()
      setFeats(data)
      setLoading(false)
    }
    init()
  }, [user])

  const handleRespond = async (featId, accept) => {
    setProcessing(featId)
    try {
      await respondFeat(featId, accept)
      setFeats(prev => prev.filter(f => f.id !== featId))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Solicitudes</h1>
          <p className="text-gray-400 mt-1">
            {feats.length > 0
              ? `${feats.length} invitación${feats.length > 1 ? 'es' : ''} de colaboración pendiente${feats.length > 1 ? 's' : ''}`
              : 'Sin solicitudes pendientes'}
          </p>
        </div>

        {feats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Sin invitaciones</p>
            <p className="text-gray-400 text-sm mt-1">Cuando un artista te invite a colaborar aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feats.map(feat => (
              <div key={feat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <img src={feat.song?.cover_url} alt={feat.song?.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-black truncate">{feat.song?.title}</p>
                    <p className="text-sm text-gray-400">{feat.song?.genre}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {feat.inviter?.avatar_url ? (
                        <img src={feat.inviter.avatar_url} alt={feat.inviter.artist_name}
                          className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                          {feat.inviter?.artist_name?.[0] ?? '?'}
                        </div>
                      )}
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-black">{feat.inviter?.artist_name || feat.inviter?.name}</span>
                        {' '}te invitó a colaborar
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleRespond(feat.id, false)}
                    disabled={processing === feat.id}
                    className="flex-1 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleRespond(feat.id, true)}
                    disabled={processing === feat.id}
                    className="flex-1 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {processing === feat.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : 'Aceptar colaboración'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}