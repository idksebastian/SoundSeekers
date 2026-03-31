import { supabase } from '../lib/supabase'

function traducirError(mensaje) {
  if (mensaje.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (mensaje.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.'
  if (mensaje.includes('User already registered')) return 'Este correo ya está registrado.'
  if (mensaje.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (mensaje.includes('Unable to validate email')) return 'El correo ingresado no es válido.'
  if (mensaje.includes('Email rate limit exceeded')) return 'Demasiados intentos. Espera unos minutos.'
  if (mensaje.includes('Network request failed')) return 'Error de conexión. Verifica tu internet.'
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

export async function registerUser(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  })

  if (error) throw new Error(traducirError(error.message))
  if (data?.user?.identities?.length === 0) {
    throw new Error('Este correo ya está registrado. Inicia sesión o usa otro correo.')
  }

  return data
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(traducirError(error.message))
  return data
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(traducirError(error.message))
}