import { Link } from 'react-router-dom'

export default function NavbarPublic() {
  return (
    <nav className="bg-white text-black px-4 sm:px-6 py-3 flex justify-between items-center border-b border-gray-200 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <img src="/logo-soundseekers.png" alt="SoundSeekers" className="h-8 w-auto object-contain" />
      </Link>
      <div className="flex items-center gap-2">
        <Link to="/login"
          className="px-3 sm:px-4 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 transition">
          Iniciar sesión
        </Link>
        <Link to="/register"
          className="px-3 sm:px-4 py-1.5 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition">
          Regístrate
        </Link>
      </div>
    </nav>
  )
}