import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isRecoveryUrl } from '../lib/supabase'

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // ✅ isRecoveryUrl() ahora lee un flag capturado de forma síncrona
      // al cargar lib/supabase.js, no window.location en este momento
      // (que para entonces el SDK ya pudo haber limpiado el hash).
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
        // ✅ FIX: blindamos por el flag de recovery capturado, sin
        // importar qué nombre de evento llegue (PASSWORD_RECOVERY,
        // SIGNED_IN, INITIAL_SESSION, etc.) ni si el hash ya fue
        // borrado de la URL para este punto.
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