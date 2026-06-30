import { createClient } from '@supabase/supabase-js'

// ✅ FIX CRÍTICO: capturamos si la URL actual es un link de recovery
// AQUÍ, de forma síncrona, en el momento en que este módulo se evalúa
// (que ocurre antes de que React monte ningún componente). Esto es
// necesario porque el SDK de Supabase procesa el hash/query de recovery
// y luego LO BORRA de la URL (history.replaceState) como parte de su
// limpieza interna. Si leyéramos window.location.hash más tarde, dentro
// de un useEffect de AuthContext o ResetPassword, el hash ya podría
// haber sido consumido — causando que la sesión de recovery se trate
// como un login real (Player/ChatBot se activan) y que ResetPassword
// nunca pueda confirmar el estado "ready" (muestra "enlace inválido").
let _recoveryFlag = (() => {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash
  const search = window.location.search
  return (
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    (window.location.pathname === '/reset-password' && search.includes('code='))
  )
})()

// Mientras esto sea true, AuthContext ignora cualquier sesión (sin
// importar el nombre del evento que la traiga).
export function isRecoveryUrl() {
  return _recoveryFlag
}

// Se debe llamar una vez que el flujo de recovery termina (ya sea
// porque el usuario completó el cambio de contraseña, o porque
// abandonó /reset-password sin completarlo). Si no se limpia, cualquier
// login normal posterior en la misma sesión de la SPA (sin recargar la
// página) seguiría siendo ignorado por error.
export function clearRecoveryFlag() {
  _recoveryFlag = false
}

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