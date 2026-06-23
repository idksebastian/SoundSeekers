import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

async function ensureProfile(user) {
  if (!user) return
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('profiles').upsert({
      user_id: user.id,
      name: user.user_metadata?.name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      artist_name: user.user_metadata?.artist_name ?? null
    })
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) ensureProfile(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => {
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