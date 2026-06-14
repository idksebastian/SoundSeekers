import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">

        {/* Icono */}
        <div className="w-24 h-24 rounded-3xl bg-purple-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>

        {/* Texto */}
        <h1 className="text-6xl font-bold text-black mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Esta página no existe</h2>
        <p className="text-gray-400 text-sm mb-8">
          Parece que la canción que buscas no está en nuestro repertorio. Vuelve al inicio y sigue descubriendo música.
        </p>

        {/* Botones */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition"
          >
            Volver atrás
          </button>
          <Link
            to="/home"
            className="px-5 py-2.5 rounded-xl bg-purple-700 text-white font-semibold text-sm hover:bg-purple-800 transition"
          >
            Ir al inicio
          </Link>
        </div>

      </div>
    </div>
  )
}