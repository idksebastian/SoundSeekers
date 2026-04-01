import { useState } from 'react'
import { upgradeToArtist } from '../api/roles'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Electrónica', 'Reggaeton', 'Jazz', 'Champeta', 'Vallenato', 'Salsa', 'Otro']

const MOODS = ['Creando', 'Listo para el escenario', 'En estudio', 'Inspirado', 'En racha']

const TERMS = [
  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, text: 'Subiré únicamente contenido original del que soy autor o tengo los derechos.' },
  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>, text: 'No publicaré contenido que infrinja derechos de autor de terceros.' },
  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>, text: 'Entiendo que el contenido inapropiado será eliminado y mi cuenta suspendida.' },
  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, text: 'Me comprometo a mantener una comunidad respetuosa con otros artistas y oyentes.' },
  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>, text: 'Acepto que SoundSeekers puede promocionar mi música dentro de la plataforma.' },
]

export default function ArtistModal({ userId, onSuccess, onClose }) {
  const [step, setStep] = useState(1)
  const [accepted, setAccepted] = useState(false)
  const [artistName, setArtistName] = useState('')
  const [artistBio, setArtistBio] = useState('')
  const [artistGenre, setArtistGenre] = useState('')
  const [artistMood, setArtistMood] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUpgrade = async () => {
    if (!artistName.trim()) return setError('El nombre artístico es obligatorio.')
    if (!artistGenre) return setError('Selecciona tu género principal.')
    setLoading(true)
    try {
      await upgradeToArtist({ userId, artistName, artistBio, artistGenre, artistMood })
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-purple-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-3">
            {/* Steps */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-white w-8' : 'bg-white/30 w-4'}`} />
              ))}
            </div>
            {step < 3 && (
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {step === 1 && (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
              {step === 2 && (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {step === 3 && (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {step === 1 && 'Tu promesa como artista'}
                {step === 2 && 'Tu identidad'}
                {step === 3 && 'Bienvenido al escenario'}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {step === 1 && 'Lee y acepta estos compromisos antes de continuar.'}
                {step === 2 && 'Cuéntanos quién eres como artista.'}
                {step === 3 && 'Tu perfil de artista está listo.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">

          {/* Paso 1 — Términos */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                {TERMS.map((term, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-purple-600 shrink-0 mt-0.5">{term.icon}</div>
                    <p className="text-gray-600 text-sm">{term.text}</p>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm text-gray-700 font-medium">
                  Acepto todos los compromisos como artista
                </span>
              </label>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
                  Ahora no
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!accepted}
                  className="flex-1 h-11 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 transition text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continuar
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Paso 2 — Identidad */}
          {step === 2 && (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nombre artístico *</label>
                <input
                  placeholder="¿Cómo te conocerá el mundo?"
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                  maxLength={50}
                  className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Género principal *</label>
                <select
                  value={artistGenre}
                  onChange={e => setArtistGenre(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">Selecciona tu género</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tu frase — ¿Quién eres?</label>
                <textarea
                  placeholder="Una línea que te defina como artista..."
                  value={artistBio}
                  onChange={e => setArtistBio(e.target.value)}
                  maxLength={150}
                  rows={2}
                  className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Estado de hoy</label>
                <div className="grid grid-cols-2 gap-2">
                  {MOODS.map(mood => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setArtistMood(mood)}
                      className={`text-xs px-3 py-2 rounded-xl border transition text-left ${
                        artistMood === mood
                          ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition text-sm flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="flex-1 h-11 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Procesando...
                    </>
                  ) : (
                    <>
                      Subir al escenario
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3 — Debut */}
          {step === 3 && (
            <div className="text-center space-y-5 py-2">
              <div className="w-20 h-20 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-black">Estás en el escenario</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Ahora eres <span className="text-purple-600 font-semibold">{artistName}</span> en SoundSeekers.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-2.5">
                <p className="text-sm font-medium text-gray-700">Ahora puedes:</p>
                {[
                  { text: 'Subir tus canciones', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
                  { text: 'Personalizar tu perfil de artista', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                  { text: 'Ver tus reproducciones y seguidores', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={onSuccess}
                className="w-full h-11 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 transition text-sm"
              >
                Ver mi perfil de artista
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}