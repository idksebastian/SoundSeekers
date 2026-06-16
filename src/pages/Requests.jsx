import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPendingFeats, respondFeat } from '../api/songs'
import { getUserRole } from '../api/roles'
import { isAdmin, getAllArtistRequests, approveArtistRequest, rejectArtistRequest } from '../api/adminRequests'
import { supabase } from '../lib/supabase'

const STATUS_TABS = [
  { id: 'pending',  label: 'Pendientes', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'approved', label: 'Aprobadas',  color: '#10b981', bg: '#f0fdf4' },
  { id: 'rejected', label: 'Rechazadas', color: '#ef4444', bg: '#fef2f2' },
]

export default function Requests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const highlightId = new URLSearchParams(location.search).get('highlight')

  const [tab, setTab] = useState('feats')           // 'feats' | 'artist_requests'
  const [adminMode, setAdminMode] = useState(false)
  const [isArtist, setIsArtist] = useState(false)

  // Feats
  const [feats, setFeats] = useState([])
  const [loadingFeats, setLoadingFeats] = useState(true)
  const [processing, setProcessing] = useState(null)

  // Artist requests (admin)
  const [artistRequests, setArtistRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [statusTab, setStatusTab] = useState('pending')
  const [adminNote, setAdminNote] = useState({})
  const [processingReq, setProcessingReq] = useState(null)
  const [expandedReq, setExpandedReq] = useState(highlightId ?? null)
  const highlightRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      if (!user) return navigate('/login')
      const role = await getUserRole(user.id)
      const artist = role?.role === 'artist'
      setIsArtist(artist)

      const admin = await isAdmin()
      setAdminMode(admin)

      if (artist) {
        const data = await getPendingFeats()
        setFeats(data)
      }
      setLoadingFeats(false)

      if (admin) setTab('artist_requests')
      else if (artist) setTab('feats')
      else navigate('/profile')
    }
    init()
  }, [user])

  useEffect(() => {
    if (!adminMode) return
    const fetch = async () => {
      setLoadingRequests(true)
      try { setArtistRequests(await getAllArtistRequests(statusTab)) }
      catch {} finally { setLoadingRequests(false) }
    }
    fetch()
  }, [adminMode, statusTab])

  // Scroll al highlight
  useEffect(() => {
    if (highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400)
    }
  }, [artistRequests])

  const handleRespondFeat = async (featId, accept) => {
    setProcessing(featId)
    try { await respondFeat(featId, accept); setFeats(p => p.filter(f => f.id !== featId)) }
    catch {} finally { setProcessing(null) }
  }

  const handleApprove = async (req) => {
    setProcessingReq(req.id)
    try {
      await approveArtistRequest(req.id, req.user_id, req.artist_name, adminNote[req.id] ?? '')
      setArtistRequests(p => p.filter(r => r.id !== req.id))
    } catch (e) { alert(e.message) }
    finally { setProcessingReq(null) }
  }

  const handleReject = async (req) => {
    if (!adminNote[req.id]?.trim()) { alert('Añade una nota explicando el motivo del rechazo.'); return }
    setProcessingReq(req.id)
    try {
      await rejectArtistRequest(req.id, req.user_id, adminNote[req.id])
      setArtistRequests(p => p.filter(r => r.id !== req.id))
    } catch (e) { alert(e.message) }
    finally { setProcessingReq(null) }
  }

  if (loadingFeats) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Solicitudes</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {adminMode ? 'Panel de administrador' : 'Invitaciones y colaboraciones'}
          </p>
        </div>

        {/* Tabs principales */}
        {adminMode && isArtist && (
          <div className="flex gap-2 mb-6">
            {[
              { id: 'artist_requests', label: '🛡️ Admin', badge: artistRequests.length },
              { id: 'feats', label: '🎵 Mis feats', badge: feats.length },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  tab === t.id ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                }`}>
                {t.label}
                {t.badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ════ FEATS ════ */}
        {tab === 'feats' && (
          <div>
            {feats.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
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
                      <img src={feat.song?.cover_url} alt={feat.song?.title} className="w-14 h-14 rounded-xl object-cover shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-black truncate">{feat.song?.title}</p>
                        <p className="text-sm text-gray-400">{feat.song?.genre}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {feat.inviter?.avatar_url
                            ? <img src={feat.inviter.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover"/>
                            : <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">{feat.inviter?.artist_name?.[0] ?? '?'}</div>
                          }
                          <p className="text-sm text-gray-500">
                            <span className="font-medium text-black">{feat.inviter?.artist_name || feat.inviter?.name}</span> te invitó a colaborar
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => handleRespondFeat(feat.id, false)} disabled={processing === feat.id}
                        className="flex-1 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                        Rechazar
                      </button>
                      <button onClick={() => handleRespondFeat(feat.id, true)} disabled={processing === feat.id}
                        className="flex-1 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {processing === feat.id
                          ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : 'Aceptar colaboración'
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ ADMIN: ARTIST REQUESTS ════ */}
        {tab === 'artist_requests' && adminMode && (
          <div>
            {/* Sub-tabs de estado */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {STATUS_TABS.map(st => (
                <button key={st.id} onClick={() => setStatusTab(st.id)}
                  style={statusTab === st.id ? { background: st.bg, color: st.color, borderColor: st.color } : {}}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                    statusTab === st.id ? 'border' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {st.label}
                  {statusTab === st.id && artistRequests.length > 0 && (
                    <span className="ml-1.5 text-xs font-bold opacity-70">{artistRequests.length}</span>
                  )}
                </button>
              ))}
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-16">
                <svg className="w-7 h-7 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
            ) : artistRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p className="text-gray-500 font-medium text-sm">Sin solicitudes {STATUS_TABS.find(s => s.id === statusTab)?.label.toLowerCase()}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {artistRequests.map(req => {
                  const isHighlight = req.id === highlightId
                  const isExpanded = expandedReq === req.id
                  const profile = req.profiles
                  const joinDate = req.user_roles?.created_at
                    ? new Date(req.user_roles.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
                    : '—'

                  return (
                    <div key={req.id}
                      ref={isHighlight ? highlightRef : null}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                        isHighlight ? 'border-purple-400 ring-2 ring-purple-200' : 'border-gray-100'
                      }`}>

                      {/* Cabecera del card */}
                      <div className="p-5 cursor-pointer" onClick={() => setExpandedReq(isExpanded ? null : req.id)}>
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 border-gray-200">
                            {profile?.avatar_url
                              ? <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover"/>
                              : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold text-white">
                                  {(profile?.name ?? '?')[0].toUpperCase()}
                                </div>
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-black">{profile?.name ?? 'Usuario'}</p>
                              <span className="text-xs text-gray-400">→</span>
                              <p className="text-sm font-bold text-purple-700">{req.artist_name}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {req.genre && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">{req.genre}</span>}
                              <span className="text-xs text-gray-400">Miembro desde {joinDate}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={e => { e.stopPropagation(); navigate(`/listener/${req.user_id}`) }}
                              className="text-xs text-purple-600 hover:underline font-medium">
                              Ver perfil
                            </button>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Detalle expandible */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
                          {/* Info de la solicitud */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { label: 'Bio / Descripción', value: req.bio },
                              { label: 'Mensaje al admin', value: req.message },
                              { label: 'Instagram',        value: req.instagram },
                              { label: 'Spotify',          value: req.spotify_url, link: true },
                              { label: 'SoundCloud',       value: req.soundcloud_url, link: true },
                            ].filter(i => i.value).map(item => (
                              <div key={item.label} className="bg-white rounded-xl p-3 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                                {item.link
                                  ? <a href={item.value} target="_blank" rel="noreferrer" className="text-sm text-purple-600 underline break-all">{item.value}</a>
                                  : <p className="text-sm text-gray-800">{item.value}</p>
                                }
                              </div>
                            ))}
                          </div>

                          {/* Solo en pendientes: aprobar / rechazar */}
                          {statusTab === 'pending' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nota para el usuario (obligatoria para rechazar)</label>
                                <textarea
                                  value={adminNote[req.id] ?? ''}
                                  onChange={e => setAdminNote(p => ({ ...p, [req.id]: e.target.value }))}
                                  placeholder="Ej: Aprobado, bienvenido a SoundSeekers / Necesitamos más información sobre tu música..."
                                  rows={2}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-black resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => handleReject(req)} disabled={processingReq === req.id}
                                  className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                                  Rechazar
                                </button>
                                <button onClick={() => handleApprove(req)} disabled={processingReq === req.id}
                                  className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                  {processingReq === req.id
                                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                    : '✓ Aprobar como artista'
                                  }
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Ya procesada */}
                          {statusTab !== 'pending' && req.admin_note && (
                            <div className={`rounded-xl p-3 text-sm ${statusTab === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              <span className="font-semibold">Nota admin: </span>{req.admin_note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}