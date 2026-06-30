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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // ✅ FIX: si la sesión inicial es de tipo recovery (alguien abrió
      // /reset-password con el link del correo y este efecto corrió antes
      // de que el SDK terminara de procesar el evento), no la tratamos
      // como un login real. Esto evita que AuthContext popule `user` con
      // una sesión que solo debería existir para cambiar la contraseña.
      const hash = window.location.hash
      const isRecoveryFlow = hash.includes('type=recovery')
      if (session?.user && !isRecoveryFlow) {
        setUser(session.user)
        ensureProfile(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // ✅ FIX CRÍTICO: el evento PASSWORD_RECOVERY trae una sesión
        // válida (así Supabase permite hacer updateUser para cambiar la
        // contraseña), pero antes este listener no distinguía el evento
        // y simplemente hacía setUser(session.user) para CUALQUIER
        // sesión. Eso era exactamente lo que causaba el "auto-login":
        // ResetPassword.jsx nunca llegaba a mostrarse porque el resto de
        // la app (rutas, Navbar, redirects basados en `user`) ya te
        // trataba como logueado normalmente.
        //
        // Ahora: si el evento es PASSWORD_RECOVERY, ignoramos la sesión
        // por completo a nivel de AuthContext. El componente
        // ResetPassword.jsx tiene su PROPIO listener de
        // onAuthStateChange y maneja ese evento de forma aislada para
        // mostrar el formulario — sin que el resto de la app se entere
        // de que existe una sesión activa.
        if (event === 'PASSWORD_RECOVERY') return

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