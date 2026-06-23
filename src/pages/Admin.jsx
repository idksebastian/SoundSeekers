import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPendingRequests, approveArtist, rejectArtist, isAdmin } from '../api/roles'
import { supabase } from '../lib/supabase'

const TABS = [
  { id: 'requests', label: 'Solicitudes de artista', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
  { id: 'messages', label: 'Mensajes de contacto', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
]

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [processing, setProcessing] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSending, setRejectSending] = useState(false)

  // Mensajes de contacto
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (!user) return navigate('/login')
      const admin = await isAdmin(user.id)
      if (!admin) return navigate('/home')
      setAuthorized(true)
      const data = await getPendingRequests()
      setRequests(data)

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

  useEffect(() => {
    if (activeTab === 'messages') loadMessages()
  }, [activeTab])

  const loadMessages = async () => {
    setLoadingMessages(true)
    try {
      const { data } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
      setMessages(data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return
    setReplying(true)
    try {
      // Buscar si el email del mensaje coincide con algún usuario
      const { data: authUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', selectedMessage.email)
        .single()

      // Si encontramos el usuario, enviarle notificación del sistema
      if (authUsers?.user_id) {
        await supabase.from('notifications').insert([{
          user_id: authUsers.user_id,
          type: 'system',
          from_user_id: null,
          reference_id: selectedMessage.id,
          message: replyText.trim(),
        }])
      }

      // Marcar mensaje como respondido en la tabla
      await supabase
        .from('contact_messages')
        .update({ replied: true, reply: replyText.trim(), replied_at: new Date().toISOString() })
        .eq('id', selectedMessage.id)

      setMessages(prev => prev.map(m =>
        m.id === selectedMessage.id
          ? { ...m, replied: true, reply: replyText.trim(), replied_at: new Date().toISOString() }
          : m
      ))
      setReplySuccess(true)
      setReplyText('')
      setTimeout(() => setReplySuccess(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setReplying(false)
    }
  }

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

  const formatDate = (d) => new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const motivoLabel = {
    soporte: 'Soporte técnico',
    privacidad: 'Privacidad / datos',
    derechos: 'Derechos de autor',
    artista: 'Verificación artista',
    legal: 'Consulta legal',
    otro: 'Otro',
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

      {/* Modal rechazo artista */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-black mb-1">Rechazar solicitud</h3>
            <p className="text-sm text-gray-400 mb-4">
              Escribe el motivo para <span className="font-semibold text-gray-700">{rejectModal.artist_name}</span>. Se le enviará como notificación.
            </p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Ej: Tu perfil no cumple con los requisitos mínimos..." rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-4" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleRejectConfirm} disabled={rejectSending}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2">
                {rejectSending && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver + responder mensaje */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-black">Mensaje de contacto</h3>
              <button onClick={() => { setSelectedMessage(null); setReplyText(''); setReplySuccess(false) }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Info del remitente */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-medium">Nombre</span>
                <span className="text-gray-800 font-semibold">{selectedMessage.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-medium">Email</span>
                <span className="text-gray-800 font-semibold">{selectedMessage.email}</span>
              </div>
              {selectedMessage.motivo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Motivo</span>
                  <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full text-xs">
                    {motivoLabel[selectedMessage.motivo] ?? selectedMessage.motivo}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-medium">Fecha</span>
                <span className="text-gray-500 text-xs">{formatDate(selectedMessage.created_at)}</span>
              </div>
            </div>

            {/* Mensaje */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mensaje</p>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                {selectedMessage.mensaje}
              </div>
            </div>

            {/* Respuesta previa */}
            {selectedMessage.replied && selectedMessage.reply && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  Respuesta enviada · {formatDate(selectedMessage.replied_at)}
                </p>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                  {selectedMessage.reply}
                </div>
              </div>
            )}

            {/* Formulario de respuesta */}
            {replySuccess ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-4 py-3 rounded-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Respuesta enviada correctamente
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {selectedMessage.replied ? 'Enviar otra respuesta' : 'Responder'}
                </p>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none mb-3"
                />
                <p className="text-xs text-gray-400 mb-3">
                  Si el usuario tiene cuenta en SoundSeekers con este email, recibirá la respuesta como notificación del sistema.
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setSelectedMessage(null); setReplyText('') }}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                    Cerrar
                  </button>
                  <button onClick={handleReply} disabled={replying || !replyText.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center gap-2">
                    {replying && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                    Enviar respuesta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">Panel de administración</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id ? 'bg-purple-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d={tab.icon}/>
              </svg>
              {tab.label}
              {tab.id === 'requests' && requests.length > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{requests.length}</span>
              )}
              {tab.id === 'messages' && messages.filter(m => !m.replied).length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{messages.filter(m => !m.replied).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB SOLICITUDES ── */}
        {activeTab === 'requests' && (
          requests.length === 0 ? (
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
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100 shrink-0 flex items-center justify-center">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={req.artist_name} className="w-full h-full object-cover"/>
                          ) : (
                            <span className="text-purple-700 font-bold text-lg uppercase">{req.artist_name?.[0] ?? '?'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-black">{req.artist_name}</h3>
                            <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">Pendiente</span>
                          </div>
                          {profile?.name && <p className="text-xs text-gray-400">Nombre real: {profile.name}</p>}
                        </div>
                      </div>
                      <button onClick={() => navigate(`/artist/${req.user_id}`)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 text-purple-600 text-xs font-semibold hover:bg-purple-50 transition">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Ver perfil
                      </button>
                    </div>

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
                          <span className="text-xs text-gray-400">{formatDate(req.accepted_terms_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                      <button onClick={() => { setRejectModal(req); setRejectReason('') }} disabled={processing === req.user_id}
                        className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                        Rechazar
                      </button>
                      <button onClick={() => handleApprove(req)} disabled={processing === req.user_id}
                        className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-50 flex items-center gap-2">
                        {processing === req.user_id && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                        Aprobar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── TAB MENSAJES ── */}
        {activeTab === 'messages' && (
          loadingMessages ? (
            <div className="flex justify-center py-16">
              <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Sin mensajes aún</p>
              <p className="text-gray-400 text-sm mt-1">Aquí aparecerán los mensajes del formulario de contacto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id}
                  onClick={() => { setSelectedMessage(msg); setReplyText(''); setReplySuccess(false) }}
                  className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition group ${
                    msg.replied ? 'border-gray-100' : 'border-purple-100 bg-purple-50/30'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm uppercase ${
                        msg.replied ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {msg.nombre?.[0] ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-black">{msg.nombre}</p>
                          {!msg.replied && (
                            <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Nuevo</span>
                          )}
                          {msg.replied && (
                            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                              Respondido
                            </span>
                          )}
                          {msg.motivo && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{motivoLabel[msg.motivo] ?? msg.motivo}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{msg.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2 ml-13">{msg.mensaje}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}