import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSongs, updateSong, searchArtists } from '../api/songs'
import { supabase } from '../lib/supabase'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Electrónica', 'Reggaeton', 'Jazz', 'Champeta', 'Vallenato', 'Salsa', 'Rap', 'Folk', 'Indie', 'Otro']
const CREDIT_ROLES = ['Compositor', 'Letrista', 'Productor', 'Sonidista', 'Arreglista', 'Ingeniero de mezcla', 'Ingeniero de masterización', 'Sello discográfico', 'Otro']
const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/x-m4a']

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
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [credits, setCredits] = useState([])
  const [creditName, setCreditName] = useState('')
  const [creditRole, setCreditRole] = useState('')
  const [collaborators, setCollaborators] = useState([])
  const [featSearch, setFeatSearch] = useState('')
  const [featResults, setFeatResults] = useState([])
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
      if (!song) return navigate('/profile')
      setTitle(song.title)
      setDescription(song.description ?? '')
      setGenre(GENRES.includes(song.genre) ? song.genre : 'Otro')
      if (!GENRES.includes(song.genre)) setCustomGenre(song.genre)
      setCoverPreview(song.cover_url)
      setAudioName(song.audio_url?.split('/').pop() ?? '')
      setTags(song.tags ?? [])
      setCredits(song.credits ?? [])
      setCollaborators(song.collaborators ?? [])
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
    if (!ACCEPTED_AUDIO.includes(file.type)) return setError('Formato no soportado.')
    if (file.size > 50 * 1024 * 1024) return setError('El archivo supera los 50MB.')
    setAudioFile(file)
    setAudioName(file.name)
    setError('')
  }

  const handleFeatSearch = async (query) => {
    setFeatSearch(query)
    if (query.trim().length < 2) { setFeatResults([]); return }
    const results = await searchArtists(query)
    setFeatResults(results)
  }

  const addCollaborator = (artist) => {
    if (collaborators.find(c => c.user_id === artist.user_id)) return
    setCollaborators(prev => [...prev, { user_id: artist.user_id, name: artist.artist_name }])
    setFeatSearch('')
    setFeatResults([])
  }

  const removeCollaborator = (userId) =>
    setCollaborators(prev => prev.filter(c => c.user_id !== userId))

  const addCredit = () => {
    if (!creditName.trim() || !creditRole) return
    setCredits(prev => [...prev, { name: creditName.trim(), role: creditRole }])
    setCreditName('')
    setCreditRole('')
  }

  const removeCredit = (index) =>
    setCredits(prev => prev.filter((_, i) => i !== index))

  const handleAddTag = (e) => {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 5) setTags(prev => [...prev, tag])
    setTagInput('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const collabNames = collaborators.map(c => c.name || c.artist_name).filter(Boolean)
      const fields = {
        title,
        description,
        genre: genre === 'Otro' ? customGenre : genre,
        tags: tags.length ? tags : null,
        credits,
        collaborators,
        display_artist: collabNames.length > 0 ? null : null,
      }
      if (coverFile) fields.cover_url = await uploadFile('covers', coverFile)
      if (audioFile) fields.audio_url = await uploadFile('audios', audioFile)
      await updateSong(id, fields)
      navigate(-1)
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
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">

        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition text-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-3xl font-bold text-black mb-1">Editar canción</h1>
          <p className="text-gray-400 text-sm">Actualiza la información de tu canción.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-5">
            <h2 className="text-base font-bold text-black">Información básica</h2>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="space-y-2 shrink-0">
                <label className="text-sm font-medium text-gray-700">Portada</label>
                <div onClick={() => coverInputRef.current?.click()}
                  className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-400 transition overflow-hidden w-full sm:w-36 aspect-square bg-gray-50">
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 group-hover:text-purple-500 transition p-3 text-center">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium">Cambiar portada</span>
                    </div>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Título *</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                    className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Género *</label>
                  <select required value={genre} onChange={e => setGenre(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">Selecciona</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {genre === 'Otro' && (
                    <input value={customGenre} onChange={e => setCustomGenre(e.target.value)} maxLength={50}
                      placeholder="Escribe tu género" className="w-full mt-2 bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3}
                className="w-full bg-white border border-gray-300 text-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none" />
              <p className="text-xs text-gray-400 text-right">{description.length}/500</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Etiquetas <span className="text-gray-400 font-normal">(máx. 5)</span></label>
              <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-gray-300 bg-white min-h-[42px]">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    #{tag}
                    <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                {tags.length < 5 && (
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? '#urbano, #acústico...' : ''}
                    className="flex-1 min-w-[120px] text-sm text-black focus:outline-none bg-transparent" />
                )}
              </div>
              <p className="text-xs text-gray-400">Presiona Enter o coma para agregar.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-black">Audio</h2>
            <div onClick={() => audioInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed transition p-4 ${
                audioFile ? 'border-purple-200 bg-purple-50' : 'border-gray-200 hover:border-purple-400 bg-gray-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${audioFile ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <svg className={`w-4 h-4 ${audioFile ? 'text-purple-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{audioName || 'Audio actual'}</p>
                  <p className="text-xs text-gray-400">Clic para reemplazar · MP3, WAV, FLAC · máx. 50MB</p>
                </div>
              </div>
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-black">Artistas principales (feat.)</h2>
            <div className="relative">
              <input placeholder="Buscar artista en SoundSeekers..."
                value={featSearch} onChange={e => handleFeatSearch(e.target.value)}
                className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
              {featResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                  {featResults.map(artist => (
                    <button key={artist.user_id} type="button" onClick={() => addCollaborator(artist)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left">
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt={artist.artist_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                          {artist.artist_name?.[0] ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-black">{artist.artist_name}</p>
                        <p className="text-xs text-gray-400">{artist.artist_genre}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {collaborators.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {collaborators.map(c => (
                    <span key={c.user_id} className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {c.name || c.artist_name}
                      <button type="button" onClick={() => removeCollaborator(c.user_id)}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Se mostrará como: <span className="font-medium text-gray-600">
                    Artista Principal{collaborators.map(c => `, ${c.name || c.artist_name}`).join('')}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-black">Créditos</h2>
            {credits.length > 0 && (
              <div className="space-y-1.5">
                {credits.map((credit, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-black">{credit.name}</span>
                      <span className="text-xs text-gray-400 ml-2">· {credit.role}</span>
                    </div>
                    <button type="button" onClick={() => removeCredit(i)} className="text-gray-300 hover:text-red-400 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input placeholder="Nombre" value={creditName} onChange={e => setCreditName(e.target.value)}
                className="flex-1 bg-white text-black border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
              <select value={creditRole} onChange={e => setCreditRole(e.target.value)}
                className="w-40 bg-white text-black border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                <option value="">Rol</option>
                {CREDIT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button type="button" onClick={addCredit} disabled={!creditName.trim() || !creditRole}
                className="px-3 py-2 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-40">
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 h-11 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-semibold transition text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-11 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2">
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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