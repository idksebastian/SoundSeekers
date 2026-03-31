import { useState, useRef } from 'react'
import { createSong } from '../api/songs'
import { useNavigate } from 'react-router-dom'

const GENRES = ['Champeta', 'Rap', 'Vallenato', 'Salsa', 'Reggaeton', 'Otro']

export default function Upload() {
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
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!coverFile || !audioFile) return setError('Debes subir portada y audio.')
    setUploading(true)
    setError('')
    try {
      const finalGenre = genre === 'Otro' ? customGenre : genre
      await createSong({ title, genre: finalGenre, description, coverFile, audioFile })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-2xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-balck mb-2">Subir canción</h1>
          <p className="text-gray-400">Comparte tu música con el mundo.</p>
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-8">

          <div className="space-y-2">
            <label className="text-sm font-medium text-black text-semibold">Portada</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-gray-600 hover:border-purple-500 transition-colors overflow-hidden aspect-square max-w-60">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500 group-hover:text-purple-400 transition-colors">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Agregar portada</span>
                </div>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-black text-semibold">Título *</label>
            <input required placeholder="Nombre de tu canción" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="w-full bg-white text-black border border-gray-600 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-black text-semibold">Descripción</label>
            <textarea placeholder="Cuéntanos sobre esta canción..." value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3} className="w-full bg-white text-black border border-gray-600 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-black text-semibold">Género *</label>
            <select required value={genre} onChange={e => setGenre(e.target.value)} className="w-full bg-white text-black border border-gray-600 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecciona un género</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {genre === 'Otro' && (
              <input placeholder="Escribe tu género personalizado" value={customGenre} onChange={e => setCustomGenre(e.target.value)} maxLength={50} className="w-full mt-2 bg-white text-black border border-gray-600 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-black text-semibold">Archivo de audio *</label>
            <div onClick={() => audioInputRef.current?.click()} className="cursor-pointer rounded-xl border-2 border-dashed border-gray-600 hover:border-purple-500 transition-colors p-6">
              {audioFile ? (
                <div className="flex items-center gap-3 text-black">
                  <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium truncate">{audioFile.name}</span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-500 hover:text-purple-400 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span className="text-sm font-medium">Seleccionar archivo de audio</span>
                  <span className="text-xs">MP3, WAV, FLAC · máx. 50MB</span>
                </div>
              )}
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
            </div>
          </div>

          <button type="submit" disabled={uploading} className="w-full h-12 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-base font-semibold transition flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Subiendo...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Publicar canción
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  )
}