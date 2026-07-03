import { useState, useRef, useEffect } from 'react'

// ✅ Lista única de géneros "conocidos" — fuente de verdad compartida
// entre Upload y EditSong. Si en el futuro se agrega un género oficial
// nuevo, solo hay que tocarlo aquí.
export const KNOWN_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'Reggaeton', 'Electrónica', 'Jazz',
  'Champeta', 'Vallenato', 'Salsa', 'Rap', 'Folk', 'Indie','Trap', 'R&B', 'Metal', 'Punk', 'Country', 'Blues', 'Disco',
  'Funk', 'Soul', 'Gospel', 'Techno', 'House', 'Trance', 'Dubstep',
  'Ambient', 'Classical', 'Opera', 'World Music', 'Latin', 'Reggae', 'K-Pop', 'J-Pop', 'Cumbia', 'Bachata', 'Merengue', 'Flamenco', 'Samba',
  'Tango', 'Bolero', 'Mariachi', 'Ska', 'Grunge', 'New Wave', 'Post-Punk',
  'Synthpop', 'Industrial', 'Garage Rock', 'Shoegaze', 'Dream Pop', 'Lo-Fi', 'Chillwave', 'Electro Swing', 'Trip Hop', 'Drum and Bass', 'Breakbeat', 'Hardcore', 'Noise Rock', 'Post-Rock', 'Math Rock', 'Progressive Rock', 'Psychedelic Rock', 'Folk Rock', 'Country Rock', 'Southern Rock', 'Glam Rock', 'Art Rock', 'Experimental Rock', 'Avant-Garde Jazz', 'Free Jazz', 'Bebop', 'Swing', 'Cool Jazz', 'Hard Bop', 'Modal Jazz', 'Fusion Jazz', 'Afrobeat', 
]

// ✅ Opción 4: en vez de un <select> con "Otro" + input condicional,
// este campo funciona como buscador. El usuario escribe, filtra entre
// los géneros existentes, y si no encuentra coincidencia puede usar su
// propio texto como género nuevo directamente — sin un paso separado.
export default function GenreCombobox({ value, onChange, placeholder = 'Busca o escribe un género' }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Mantener sincronizado si el valor cambia desde afuera (ej. al cargar
  // una canción existente en EditSong)
  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? KNOWN_GENRES.filter(g => g.toLowerCase().includes(q))
    : KNOWN_GENRES
  const exactMatch = KNOWN_GENRES.some(g => g.toLowerCase() === q)

  const selectGenre = (g) => {
    setQuery(g)
    onChange(g)
    setOpen(false)
  }

  const handleInputChange = (e) => {
    const v = e.target.value
    setQuery(v)
    onChange(v) // ✅ el valor libre se guarda en tiempo real, por si el usuario no elige de la lista y solo escribe su propio género
    setOpen(true)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-white text-black border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map(g => (
            <button key={g} type="button" onClick={() => selectGenre(g)}
              className="w-full text-left px-3 py-2 text-sm text-black hover:bg-purple-50 transition">
              {g}
            </button>
          ))}
          {q && !exactMatch && (
            <button type="button" onClick={() => selectGenre(query.trim())}
              className="w-full text-left px-3 py-2 text-sm text-purple-700 font-medium hover:bg-purple-50 transition border-t border-gray-100 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Usar "{query.trim()}" como nuevo género
            </button>
          )}
          {filtered.length === 0 && !q && (
            <p className="px-3 py-2 text-xs text-gray-400">Empieza a escribir para buscar</p>
          )}
        </div>
      )}
    </div>
  )
}