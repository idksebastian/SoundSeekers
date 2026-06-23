import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    // ✅ Limitar canales Realtime abiertos simultáneamente
    realtime: {
      params: {
        eventsPerSecond: 10,
      }
    },
    // ✅ Cache de requests para evitar refetches innecesarios
    global: {
      headers: {
        'x-client-info': 'soundseekers-web'
      }
    }
  }
)