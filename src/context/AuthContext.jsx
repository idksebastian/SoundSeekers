import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

async function ensureProfile(user) {
  if (!user) return
  await supabase.from('profiles').upsert({
    user_id: user.id,
    name: user.user_metadata?.name ?? user.email,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    artist_name: user.user_metadata?.artist_name ?? null,
    email: user.email  // ✅ siempre sincronizar el email
  }, { onConflict: 'user_id' })
}

// ✅ Detecta si la URL actual corresponde a un flujo de recovery,
// soportando tanto el flujo implicit (hash: #access_token=...&type=recovery)
// como PKCE (query: ?code=xxxx, sin type=recovery garantizado).
// La tercera condición es la red de seguridad real para PKCE: si estamos
// en /reset-password y hay un `code=` en la URL, asumimos recovery aunque
// no venga el `type` explícito.
function isRecoveryUrl() {
  const hash = window.location.hash
  const search = window.location.search
  return (
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    (window.location.pathname === '/reset-password' && search.includes('code='))
  )
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // ✅ FIX: si la sesión inicial es de tipo recovery (alguien abrió
      // una URL con hash/query de recovery y este efecto corrió antes
      // de que el SDK terminara de procesar el evento), no la tratamos
      // como un login real. Esto evita que AuthContext popule `user` con
      // una sesión que solo debería existir para cambiar la contraseña.
      if (session?.user && !isRecoveryUrl()) {
        setUser(session.user)
        ensureProfile(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // ✅ FIX DEFINITIVO: en vez de filtrar evento por evento
        // (PASSWORD_RECOVERY, SIGNED_IN, etc.), blindamos por la URL.
        // Supabase puede emitir distintos nombres de evento al procesar
        // el hash/query de recovery según la versión/flujo —incluyendo
        // 'INITIAL_SESSION', que no estaba cubierto antes y es
        // probablemente el causante de que el auto-login persistiera.
        // Mientras la URL actual sea de recovery, NUNCA adoptamos la
        // sesión en AuthContext, sin importar qué evento llegue.
        if (isRecoveryUrl()) {
          if (event === 'SIGNED_OUT') setUser(null)
          return
        }

        // ✅ Si llega SIGNED_OUT explícito, siempre limpiar de inmediato
        // (cubre el signOut() que hacemos al final de ResetPassword.jsx)
        if (event === 'SIGNED_OUT') {
          setUser(null)
          return
        }

        setUser(session?.user ?? null)
        if (session?.user) ensureProfile(session.user)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)