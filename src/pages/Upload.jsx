import { useState, useRef } from 'react'
import { createSong, searchArtists } from '../api/songs'
import { createAlbum } from '../api/albums'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Electrónica', 'Reggaeton', 'Jazz', 'Champeta', 'Vallenato', 'Salsa', 'Rap', 'Folk', 'Indie', 'Otro']
const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/x-m4a']
const MAX_SIZE = 50 * 1024 * 1024
const CREDIT_ROLES = ['Compositor', 'Letrista', 'Productor', 'Sonidista', 'Arreglista', 'Ingeniero de mezcla', 'Ingeniero de masterización', 'Sello discográfico', 'Otro']

const emptyTrack = () => ({
  id: Math.random().toString(36).slice(2),
  title: '',
  genre: '',
  customGenre: '',
  description: '',
  audioFile: null,
  audioName: '',
  audioDuration: null,
  collaborators: [],
  featSearch: '',
  featResults: [],
  tags: [],
  tagInput: '',
  credits: [],
  creditName: '',
  creditRole: '',
})

export default function Upload() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const coverInputRef = useRef(null)
  const audioRefs = useRef({})

  const [step, setStep] = useState(1)
  const [projectType, setProjectType] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [isPresave, setIsPresave] = useState(false)
  const [presaveDate, setPresaveDate] = useState('')
  const [tracks, setTracks] = useState([emptyTrack()])
  const [dragOver, setDragOver] = useState(null)
  const [dragItem, setDragItem] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [error, setError] = useState('')

  const updateTrack = (id, field, value) =>
    setTracks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleAudioChange = (trackId, e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!ACCEPTED_AUDIO.includes(file.type)) return setError('Formato no soportado.')
    if (file.size > MAX_SIZE) return setError('El archivo supera los 50MB.')
    setError('')
    const url = URL.createObjectURL(file)
    const tempAudio = new Audio(url)
    tempAudio.addEventListener('loadedmetadata', () =>
      updateTrack(trackId, 'audioDuration', Math.floor(tempAudio.duration))
    )
    updateTrack(trackId, 'audioFile', file)
    updateTrack(trackId, 'audioName', file.name)
  }

  const handleFeatSearch = async (trackId, query) => {
    updateTrack(trackId, 'featSearch', query)
    if (query.trim().length < 2) { updateTrack(trackId, 'featResults', []); return }
    const results = await searchArtists(query)
    updateTrack(trackId, 'featResults', results)
  }

  const addCollaborator = (trackId, artist) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t
      if (t.collaborators.find(c => c.user_id === artist.user_id)) return t
      return { ...t, collaborators: [...t.collaborators, artist], featSearch: '', featResults: [] }
    }))
  }

  const removeCollaborator = (trackId, userId) =>
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, collaborators: t.collaborators.filter(c => c.user_id !== userId) } : t
    ))

  const addCredit = (trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track.creditName.trim() || !track.creditRole) return
    const credit = { name: track.creditName.trim(), role: track.creditRole }
    updateTrack(trackId, 'credits', [...track.credits, credit])
    updateTrack(trackId, 'creditName', '')
    updateTrack(trackId, 'creditRole', '')
  }

  const removeCredit = (trackId, index) => {
    const track = tracks.find(t => t.id === trackId)
    updateTrack(trackId, 'credits', track.credits.filter((_, i) => i !== index))
  }

  const handleAddTag = (trackId, e) => {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const track = tracks.find(t => t.id === trackId)
    const tag = track.tagInput.trim().replace(/^#/, '').toLowerCase()
    if (tag && !track.tags.includes(tag) && track.tags.length < 5)
      updateTrack(trackId, 'tags', [...track.tags, tag])
    updateTrack(trackId, 'tagInput', '')
  }

  const handleDragStart = (index) => setDragItem(index)
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOver(index) }
  const handleDrop = (index) => {
    if (dragItem === null) return
    const newTracks = [...tracks]
    const dragged = newTracks.splice(dragItem, 1)[0]
    newTracks.splice(index, 0, dragged)
    setTracks(newTracks)
    setDragItem(null)
    setDragOver(null)
  }

  const formatDuration = (secs) => {
    if (!secs) return '--:--'
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
  }

  const validateStep2 = () => {
    if (!coverFile) return 'Debes subir una portada.'
    if (!projectTitle.trim()) return 'El nombre del proyecto es obligatorio.'
    if (isPresave && !presaveDate) return 'Selecciona la fecha de presave.'
    return null
  }

  const validateTracks = () => {
    for (const t of tracks) {
      if (!t.title.trim()) return `El track "${t.title || 'sin título'}" necesita un título.`
      if (!t.genre) return `El track "${t.title}" necesita un género.`
      if (!t.audioFile) return `El track "${t.title || 'sin título'}" necesita un archivo de audio.`
    }
    return null
  }

  const handleSubmit = async () => {
    const trackError = validateTracks()
    if (trackError) return setError(trackError)
    setUploading(true)
    setError('')
    try {
      let albumId = null
      if (projectType !== 'single') {
        const album = await createAlbum({
          title: projectTitle,
          type: projectType,
          releaseDate: releaseDate || null,
          presaveDate: isPresave && presaveDate ? presaveDate : null,
          description: projectDescription,
          coverFile,
        })
        albumId = album.id
      }

      for (let i = 0; i < tracks.length; i++) {
        setCurrentTrack(i + 1)
        setUploadProgress(Math.round((i / tracks.length) * 100))
        const t = tracks[i]
        const finalGenre = t.genre === 'Otro' ? t.customGenre : t.genre
        const collabNames = t.collaborators.map(c => c.artist_name || c.name)
        await createSong({
          title: t.title,
          genre: finalGenre,
          description: t.description,
          coverFile,
          audioFile: t.audioFile,
          albumId,
          duration: t.audioDuration,
          tags: t.tags,
          collaborators: t.collaborators.map(c => ({ user_id: c.user_id, name: c.artist_name || c.name })),
          credits: t.credits,
          trackNumber: i + 1,
          displayArtist: collabNames.length > 0 ? null : null,
          collaboratorNames: collabNames,
        })
      }

      setUploadProgress(100)
      setTimeout(() => navigate('/profile'), 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const PROJECT_TYPES = [
    { type: 'single', icon: '🎵', title: 'Single', desc: '1 canción', detail: 'Una canción independiente. Ideal para lanzamientos rápidos.' },
    { type: 'ep', icon: '📀', title: 'EP', desc: '2 – 6 canciones', detail: 'Un proyecto corto. Perfecta para mostrar tu estilo.' },
    { type: 'album', icon: '💿', title: 'Álbum', desc: '7+ canciones', detail: 'Tu proyecto completo. Cuéntalo todo.' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-1">Publicar música</h1>
          <p className="text-gray-400 text-sm">Comparte tu música con el mundo.</p>
        </div>

        {step > 1 && (
          <div className="flex items-center gap-2 mb-8">
            {['Tipo', 'Proyecto', 'Canciones'].map((label, i) => {
              const s = i + 1
              if (projectType === 'single' && s === 3) label = 'Canción'
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 ${s <= step ? 'text-purple-700' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      s < step ? 'bg-purple-700 text-white' :
                      s === step ? 'bg-purple-100 text-purple-700 border-2 border-purple-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {s < step ? '✓' : s}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{label}</span>
                  </div>
                  {s < 3 && <div className={`h-px w-6 sm:w-10 ${s < step ? 'bg-purple-700' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm mb-2">¿Qué vas a publicar hoy?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PROJECT_TYPES.map(({ type, icon, title, desc, detail }) => (
                <button key={type} onClick={() => { setProjectType(type); setStep(2) }}
                  className="bg-white border-2 border-gray-100 hover:border-purple-400 hover:shadow-md rounded-2xl p-6 text-left transition-all group">
                  <div className="text-4xl mb-3">{icon}</div>
                  <p className="text-lg font-bold text-black group-hover:text-purple-700 transition">{title}</p>
                  <p className="text-xs font-semibold text-purple-500 mb-2">{desc}</p>
                  <p className="text-xs text-gray-400">{detail}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-5">
              <h2 className="text-base font-bold text-black">
                Info del {projectType === 'single' ? 'single' : projectType === 'ep' ? 'EP' : 'álbum'}
              </h2>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="space-y-2 shrink-0">
                  <label className="text-sm font-medium text-gray-700">Portada *</label>
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
                        <span className="text-xs font-medium">Portada</span>
                      </div>
                    )}
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Nombre del {projectType === 'single' ? 'single' : projectType === 'ep' ? 'EP' : 'álbum'} *
                    </label>
                    <input placeholder={`Nombre de tu ${projectType === 'ep' ? 'EP' : projectType}`}
                      value={projectTitle} onChange={e => setProjectTitle(e.target.value)} maxLength={100}
                      className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fecha de lanzamiento</label>
                    <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)}
                      className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea placeholder="Cuéntanos sobre este proyecto..." value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)} maxLength={500} rows={2}
                  className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none" />
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                <input type="checkbox" checked={isPresave} onChange={e => setIsPresave(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-black">Activar presave 🔖</p>
                  <p className="text-xs text-gray-400 mt-0.5">Los oyentes pueden guardar el proyecto antes de que salga y recibirán una notificación cuando se publique.</p>
                </div>
              </label>

              {isPresave && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fecha y hora de lanzamiento *</label>
                  <input type="datetime-local" value={presaveDate} onChange={e => setPresaveDate(e.target.value)}
                    className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                  <p className="text-xs text-gray-400">El proyecto se publicará automáticamente en esta fecha.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition text-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>
              <button onClick={() => {
                const err = validateStep2()
                if (err) return setError(err)
                setError('')
                setStep(3)
              }} className="flex-1 h-11 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 transition text-sm flex items-center justify-center gap-2">
                Continuar
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-black">
                {projectType === 'single' ? 'Tu canción' : `Canciones del ${projectType === 'ep' ? 'EP' : 'álbum'}`}
              </h2>
              {projectType !== 'single' && (
                <button onClick={() => setTracks(prev => [...prev, emptyTrack()])}
                  className="text-sm text-purple-600 font-semibold hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar canción
                </button>
              )}
            </div>

            <div className="space-y-4">
              {tracks.map((track, index) => (
                <div key={track.id}
                  draggable={projectType !== 'single'}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => { setDragItem(null); setDragOver(null) }}
                  className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                    dragOver === index ? 'border-purple-400 shadow-lg scale-[1.01]' : 'border-gray-100'
                  }`}>

                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      {projectType !== 'single' && (
                        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition shrink-0">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm8-12a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                          </svg>
                        </div>
                      )}
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input placeholder="Título de la canción *" value={track.title}
                          onChange={e => updateTrack(track.id, 'title', e.target.value)} maxLength={100}
                          className="w-full text-black font-semibold text-sm bg-transparent border-b border-gray-200 focus:border-purple-500 focus:outline-none pb-1 transition" />
                      </div>
                      {projectType !== 'single' && tracks.length > 1 && (
                        <button onClick={() => setTracks(prev => prev.filter(t => t.id !== track.id))}
                          className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition shrink-0">
                          <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Género *</label>
                        <select value={track.genre} onChange={e => updateTrack(track.id, 'genre', e.target.value)}
                          className="w-full bg-white text-black border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                          <option value="">Selecciona</option>
                          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        {track.genre === 'Otro' && (
                          <input placeholder="Género personalizado" value={track.customGenre}
                            onChange={e => updateTrack(track.id, 'customGenre', e.target.value)}
                            className="w-full mt-1 bg-white text-black border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Audio *</label>
                        <div onClick={() => audioRefs.current[track.id]?.click()}
                          className={`cursor-pointer rounded-xl border-2 border-dashed transition p-2 text-center ${
                            track.audioFile ? 'border-purple-200 bg-purple-50' : 'border-gray-200 hover:border-purple-400 bg-gray-50'
                          }`}>
                          {track.audioFile ? (
                            <div>
                              <p className="text-xs font-medium text-purple-700 truncate">{track.audioName}</p>
                              <p className="text-xs text-gray-400">{formatDuration(track.audioDuration)}</p>
                            </div>
                          ) : (
                            <div className="text-gray-400">
                              <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                              <p className="text-xs">Subir audio</p>
                            </div>
                          )}
                          <input type="file" accept="audio/*" className="hidden"
                            ref={el => audioRefs.current[track.id] = el}
                            onChange={e => handleAudioChange(track.id, e)} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500">Artistas principales (feat.)</label>
                      <div className="relative">
                        <input placeholder="Buscar artista en SoundSeekers..."
                          value={track.featSearch}
                          onChange={e => handleFeatSearch(track.id, e.target.value)}
                          className="w-full bg-white text-black border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                        {track.featResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                            {track.featResults.map(artist => (
                              <button key={artist.user_id} type="button"
                                onClick={() => addCollaborator(track.id, artist)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left">
                                {artist.avatar_url ? (
                                  <img src={artist.avatar_url} alt={artist.artist_name}
                                    className="w-7 h-7 rounded-full object-cover shrink-0" />
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
                      {track.collaborators.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {track.collaborators.map(c => (
                            <span key={c.user_id} className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
                              {c.artist_name || c.name}
                              <button type="button" onClick={() => removeCollaborator(track.id, c.user_id)}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {track.collaborators.length > 0 && (
                        <p className="text-xs text-gray-400">
                          Se mostrará como: <span className="font-medium text-gray-600">
                            Artista Principal{track.collaborators.map(c => `, ${c.artist_name || c.name}`).join('')}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500">Créditos</label>
                      {track.credits.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {track.credits.map((credit, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                              <div>
                                <span className="text-sm font-medium text-black">{credit.name}</span>
                                <span className="text-xs text-gray-400 ml-2">· {credit.role}</span>
                              </div>
                              <button type="button" onClick={() => removeCredit(track.id, i)}
                                className="text-gray-300 hover:text-red-400 transition">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input placeholder="Nombre" value={track.creditName}
                          onChange={e => updateTrack(track.id, 'creditName', e.target.value)}
                          className="flex-1 bg-white text-black border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                        <select value={track.creditRole}
                          onChange={e => updateTrack(track.id, 'creditRole', e.target.value)}
                          className="w-40 bg-white text-black border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                          <option value="">Rol</option>
                          {CREDIT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button type="button" onClick={() => addCredit(track.id)}
                          disabled={!track.creditName.trim() || !track.creditRole}
                          className="px-3 py-2 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition disabled:opacity-40">
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Etiquetas <span className="text-gray-300">(máx. 5)</span></label>
                      <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-gray-200 bg-white min-h-[40px]">
                        {track.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            #{tag}
                            <button type="button" onClick={() => updateTrack(track.id, 'tags', track.tags.filter(t => t !== tag))}>
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                        {track.tags.length < 5 && (
                          <input value={track.tagInput}
                            onChange={e => updateTrack(track.id, 'tagInput', e.target.value)}
                            onKeyDown={e => handleAddTag(track.id, e)}
                            placeholder={track.tags.length === 0 ? '#urbano, #acústico...' : ''}
                            className="flex-1 min-w-[80px] text-xs text-black focus:outline-none bg-transparent" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {projectType !== 'single' && (
              <button onClick={() => setTracks(prev => [...prev, emptyTrack()])}
                className="w-full h-12 border-2 border-dashed border-gray-200 hover:border-purple-400 text-gray-400 hover:text-purple-600 rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar canción
              </button>
            )}

            {uploading && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-black">Subiendo track {currentTrack} de {tracks.length}...</p>
                  <p className="text-sm text-purple-600 font-medium">{uploadProgress}%</p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition text-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>
              <button onClick={handleSubmit} disabled={uploading}
                className="flex-1 h-11 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 active:bg-purple-900 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Publicando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {projectType === 'single' ? 'Publicar single' : `Publicar ${projectType === 'ep' ? 'EP' : 'álbum'}`}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}