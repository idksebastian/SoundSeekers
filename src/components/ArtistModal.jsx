import { useState } from 'react'
import { upgradeToArtist } from '../api/roles'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Electrónica', 'Reggaeton', 'Jazz', 'Champeta', 'Vallenato', 'Salsa', 'Otro']
const MOODS = ['🎨 Creando', '🎤 Listo para el escenario', '🎧 En estudio', '🌙 Inspirado', '🔥 En racha']

const TERMS = [
  'Subiré únicamente contenido original del que soy autor o tengo los derechos.',
  'No publicaré contenido que infrinja derechos de autor de terceros.',
  'Entiendo que el contenido inapropiado será eliminado y mi cuenta suspendida.',
  'Me comprometo a mantener una comunidad respetuosa con otros artistas y oyentes.',
  'Acepto que SoundSeekers puede promocionar mi música dentro de la plataforma.',
]

export default function ArtistModal({ userId, onSuccess, onClose }) {
  const [step, setStep] = useState(1) // 1: términos, 2: identidad, 3: debut
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
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all ${s <= step ? 'bg-white w-8' : 'bg-white/30 w-4'}`} />
              ))}
            </div>
            {step < 3 && (
              <button onClick={onClose} className="text-white/70 hover:text-white text-sm">✕</button>
            )}
          </div>
          <h2 className="text-xl font-bold mt-3">
            {step === 1 && '🎭 Tu promesa como artista'}
            {step === 2 && '🎤 Tu identidad'}
            {step === 3 && '🚀 ¡Bienvenido al escenario!'}
          </h2>
          <p className="text-white/70 text-sm mt-1">
            {step === 1 && 'Antes de subir al escenario, lee y acepta estos compromisos.'}
            {step === 2 && 'Cuéntanos quién eres como artista.'}
            {step === 3 && 'Tu perfil de artista está listo.'}
          </p>
        </div>

        <div className="p-6">

          {/* Paso 1 — Términos */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {TERMS.map((term, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-purple-600 font-bold text-sm shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-gray-600 text-sm">{term}</p>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm text-gray-700 font-medium">
                  Acepto todos los compromisos como artista de SoundSeekers
                </span>
              </label>

              <div className="flex gap-3 mt-2">
                <button onClick={onClose}
                  className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
                  Ahora no
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!accepted}
                  className="flex-1 h-11 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 transition text-sm disabled:opacity-40"
                >
                  Continuar →
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
                <label className="text-sm font-medium text-gray-700">¿Cómo llegas hoy al escenario?</label>
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

              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(1)}
                  className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
                  ← Volver
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
                      Subiendo al escenario...
                    </>
                  ) : '🎤 Subir al escenario'}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3 — Debut */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-4xl">
                🎤
              </div>
              <div>
                <h3 className="text-xl font-bold text-black">¡Estás en el escenario!</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Ahora eres <span className="text-purple-600 font-semibold">{artistName}</span> en SoundSeekers.
                  Ya puedes subir tu primera canción.
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-left space-y-2">
                <p className="text-sm font-medium text-purple-700">Ahora puedes:</p>
                <p className="text-sm text-gray-600">🎵 Subir tus canciones</p>
                <p className="text-sm text-gray-600">🎭 Personalizar tu perfil de artista</p>
                <p className="text-sm text-gray-600">📊 Ver tus reproducciones y seguidores</p>
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