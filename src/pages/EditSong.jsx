import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSongs, updateSong } from '../api/songs'
import { supabase } from '../lib/supabase'

const GENRES = ['Champeta', 'Rap', 'Vallenato', 'Salsa', 'Reggaeton', 'Otro']

async function uploadFile(bucket, file) {
  const { data: { session } } = await supabase.auth.getSession()
  const ext = file.name.split('.').pop()
  const path = `${session.user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export default function EditSong() {
  const { id } = useParams()
  const navigate = useNavigate()
  const coverInputRef = useRef(null)
  const audioInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [customGenre, setCustomGenre] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [audioName, setAudioName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSongs().then(songs => {
      const song = songs.find(s => s.id === id)
      if (!song) return navigate('/dashboard')
      setTitle(song.title)
      setDescription(song.description ?? '')
      setGenre(GENRES.includes(song.genre) ? song.genre : 'Otro')
      if (!GENRES.includes(song.genre)) setCustomGenre(song.genre)
      setCoverPreview(song.cover_url)
      setAudioName(song.audio_url.split('/').pop())
      setLoading(false)
    })
  }, [id])

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleAudioChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) return setError('El archivo supera los 50MB.')
    setAudioFile(file)
    setAudioName(file.name)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fields = {
        title,
        description,
        genre: genre === 'Otro' ? customGenre : genre,
      }
      if (coverFile) fields.cover_url = await uploadFile('covers', coverFile)
      if (audioFile) fields.audio_url = await uploadFile('audios', audioFile)
      await updateSong(id, fields)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
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
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-2xl">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-black mb-2">Editar canción</h1>
          <p className="text-gray-400">Actualiza la información de tu canción.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Portada */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Portada</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors overflow-hidden aspect-square max-w-60"
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Cambiar portada</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 group-hover:text-purple-500 transition-colors">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Cambiar portada</span>
                </div>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Título *</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Género */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Género *</label>
            <select
              required
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecciona un género</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {genre === 'Otro' && (
              <input
                value={customGenre}
                onChange={e => setCustomGenre(e.target.value)}
                maxLength={50}
                placeholder="Escribe tu género personalizado"
                className="w-full mt-2 bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
          </div>

          {/* Audio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Archivo de audio <span className="text-gray-400 font-normal">(opcional — reemplaza el actual)</span>
            </label>
            <div
              onClick={() => audioInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors p-6"
            >
              <div className="flex items-center gap-3 text-black">
                <svg className="w-5 h-5 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium truncate">{audioName || 'Audio actual'}</span>
                {audioFile && (
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Clic para reemplazar · MP3, WAV, FLAC · máx. 50MB</p>
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 h-12 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-base font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-12 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-base font-semibold transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Guardando...
                </>
              ) : 'Guardar cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}