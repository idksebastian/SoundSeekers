import { useState, useRef, useEffect } from 'react'
import { createSong } from '../api/songs'
import { getMyAlbums, createAlbum } from '../api/albums'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Electrónica', 'Reggaeton', 'Jazz', 'Champeta', 'Vallenato', 'Salsa', 'Rap', 'Folk', 'Indie', 'Otro']
const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/x-m4a']
const MAX_SIZE = 50 * 1024 * 1024

export default function Upload() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const coverInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const audioPlayerRef = useRef(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [customGenre, setCustomGenre] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null)
  const [audioDuration, setAudioDuration] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [albumMode, setAlbumMode] = useState('none')
  const [albums, setAlbums] = useState([])
  const [selectedAlbumId, setSelectedAlbumId] = useState('')
  const [newAlbumTitle, setNewAlbumTitle] = useState('')
  const [newAlbumType, setNewAlbumType] = useState('album')
  const [newAlbumReleaseDate, setNewAlbumReleaseDate] = useState('')
  const [newAlbumPresaveDate, setNewAlbumPresaveDate] = useState('')
  const [newAlbumIsPresave, setNewAlbumIsPresave] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) getMyAlbums().then(setAlbums).catch(() => {})
  }, [user])

  useEffect(() => {
    const audio = audioPlayerRef.current
    if (!audio) return
    const updateProgress = () => setAudioProgress((audio.currentTime / audio.duration) * 100 || 0)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioPreviewUrl])

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleAudioChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!ACCEPTED_AUDIO.includes(file.type)) return setError('Formato no soportado. Usa MP3, WAV, FLAC, OGG, AAC o M4A.')
    if (file.size > MAX_SIZE) return setError('El archivo supera los 50MB.')
    setError('')
    setAudioFile(file)
    const url = URL.createObjectURL(file)
    setAudioPreviewUrl(url)
    setIsPlaying(false)
    setAudioProgress(0)
    const tempAudio = new Audio(url)
    tempAudio.addEventListener('loadedmetadata', () => {
      setAudioDuration(Math.floor(tempAudio.duration))
    })
  }

  const togglePlay = () => {
    const audio = audioPlayerRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleProgressClick = (e) => {
    const audio = audioPlayerRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    audio.currentTime = pct * audio.duration
  }

  const formatDuration = (secs) => {
    if (!secs) return '--:--'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().replace(/^#/, '').toLowerCase()
      if (tag && !tags.includes(tag) && tags.length < 5) {
        setTags(prev => [...prev, tag])
      }
      setTagInput('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!coverFile) return setError('Debes subir una portada.')
    if (!audioFile) return setError('Debes subir un archivo de audio.')
    if (!genre) return setError('Selecciona un género.')

    setUploading(true)
    setError('')

    try {
      let albumId = null

      if (albumMode === 'existing' && selectedAlbumId) {
        albumId = selectedAlbumId
      } else if (albumMode === 'new' && newAlbumTitle.trim()) {
        const album = await createAlbum({
          title: newAlbumTitle,
          type: newAlbumType,
          releaseDate: newAlbumReleaseDate || null,
          presaveDate: newAlbumIsPresave && newAlbumPresaveDate ? newAlbumPresaveDate : null,
          coverFile,
        })
        albumId = album.id
      }

      setUploadProgress(30)
      const finalGenre = genre === 'Otro' ? customGenre : genre

      await createSong({
        title,
        genre: finalGenre,
        description,
        coverFile,
        audioFile,
        albumId,
        duration: audioDuration,
        tags,
      })

      setUploadProgress(100)
      navigate('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-1">Subir canción</h1>
          <p className="text-gray-400">Comparte tu música con el mundo.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-6">
            <h2 className="text-base font-bold text-black">Información básica</h2>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="space-y-2 shrink-0">
                <label className="text-sm font-medium text-gray-700">Portada *</label>
                <div onClick={() => coverInputRef.current?.click()}
                  className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-400 transition overflow-hidden w-full sm:w-40 aspect-square bg-gray-50">
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
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 group-hover:text-purple-500 transition p-4 text-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium">Agregar portada</span>
                    </div>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Título *</label>
                  <input required placeholder="Nombre de tu canción" value={title}
                    onChange={e => setTitle(e.target.value)} maxLength={100}
                    className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Género *</label>
                  <select required value={genre} onChange={e => setGenre(e.target.value)}
                    className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">Selecciona un género</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {genre === 'Otro' && (
                    <input placeholder="Escribe tu género" value={customGenre}
                      onChange={e => setCustomGenre(e.target.value)} maxLength={50}
                      className="w-full mt-2 bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <textarea placeholder="Cuéntanos sobre esta canción..." value={description}
                onChange={e => setDescription(e.target.value)} maxLength={500} rows={3}
                className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none" />
              <p className="text-xs text-gray-400 text-right">{description.length}/500</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Etiquetas <span className="text-gray-400 font-normal">(máx. 5)</span></label>
              <div className={`flex flex-wrap gap-2 p-3 rounded-xl border ${tags.length > 0 ? 'border-gray-300' : 'border-gray-300'} bg-white`}>
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    #{tag}
                    <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                      className="hover:text-purple-900 transition">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                {tags.length < 5 && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? 'Escribe y presiona Enter (#urbano, #acústico...)' : 'Agregar etiqueta...'}
                    className="flex-1 min-w-[120px] text-sm text-black focus:outline-none bg-transparent"
                  />
                )}
              </div>
              <p className="text-xs text-gray-400">Presiona Enter o coma para agregar una etiqueta.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-black">Archivo de audio</h2>

            <div onClick={() => !audioFile && audioInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed transition p-4 sm:p-6 ${
                audioFile ? 'border-purple-200 bg-purple-50' : 'border-gray-200 hover:border-purple-400 cursor-pointer bg-gray-50'
              }`}>
              {audioFile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black truncate">{audioFile.name}</p>
                      <p className="text-xs text-gray-400">
                        {(audioFile.size / (1024 * 1024)).toFixed(1)} MB · {formatDuration(audioDuration)}
                      </p>
                    </div>
                    <button type="button" onClick={() => audioInputRef.current?.click()}
                      className="text-xs text-purple-600 hover:underline shrink-0">
                      Cambiar
                    </button>
                  </div>

                  {audioPreviewUrl && (
                    <div className="space-y-2">
                      <audio ref={audioPlayerRef} src={audioPreviewUrl} />
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={togglePlay}
                          className="w-9 h-9 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition shrink-0">
                          {isPlaying ? (
                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5 3l14 9-14 9V3z"/>
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 h-1.5 bg-purple-200 rounded-full cursor-pointer" onClick={handleProgressClick}>
                          <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{formatDuration(audioDuration)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 text-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-sm font-medium">Seleccionar archivo de audio</p>
                  <p className="text-xs">MP3, WAV, FLAC, OGG, AAC, M4A · máx. 50MB</p>
                </div>
              )}
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-black">Álbum o EP</h2>
            <p className="text-gray-400 text-sm -mt-2">Opcional — asocia esta canción a un proyecto.</p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'none', label: 'Sin álbum' },
                { value: 'existing', label: 'Álbum existente' },
                { value: 'new', label: 'Crear nuevo' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setAlbumMode(opt.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition ${
                    albumMode === opt.value
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {albumMode === 'existing' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Selecciona un álbum</label>
                {albums.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No tienes álbumes creados aún.</p>
                ) : (
                  <select value={selectedAlbumId} onChange={e => setSelectedAlbumId(e.target.value)}
                    className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="">Selecciona...</option>
                    {albums.map(a => (
                      <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {albumMode === 'new' && (
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nombre del proyecto *</label>
                  <input placeholder="Nombre del álbum o EP" value={newAlbumTitle}
                    onChange={e => setNewAlbumTitle(e.target.value)} maxLength={100}
                    className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <div className="flex gap-2">
                    {['album', 'ep', 'single'].map(t => (
                      <button key={t} type="button" onClick={() => setNewAlbumType(t)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition capitalize ${
                          newAlbumType === t
                            ? 'bg-purple-700 text-white border-purple-700'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                        }`}>
                        {t === 'ep' ? 'EP' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fecha de lanzamiento</label>
                  <input type="date" value={newAlbumReleaseDate}
                    onChange={e => setNewAlbumReleaseDate(e.target.value)}
                    className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                  <input type="checkbox" checked={newAlbumIsPresave}
                    onChange={e => setNewAlbumIsPresave(e.target.checked)}
                    className="w-4 h-4 accent-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-black">Activar presave</p>
                    <p className="text-xs text-gray-400">Los oyentes pueden guardar el proyecto antes de que salga.</p>
                  </div>
                </label>

                {newAlbumIsPresave && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fecha de lanzamiento del presave</label>
                    <input type="datetime-local" value={newAlbumPresaveDate}
                      onChange={e => setNewAlbumPresaveDate(e.target.value)}
                      className="w-full bg-white text-black border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                    <p className="text-xs text-gray-400">El proyecto se publicará automáticamente en esta fecha.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {uploading && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-black">Subiendo...</p>
                <p className="text-sm text-purple-600 font-medium">{uploadProgress}%</p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <button type="submit" disabled={uploading}
            className="w-full h-12 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 text-white rounded-xl text-base font-semibold transition flex items-center justify-center gap-2">
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