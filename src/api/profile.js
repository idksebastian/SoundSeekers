import { supabase } from '../lib/supabase'

export async function getProfile() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return session.user
}

export async function updateProfile({ name, avatarFile }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  let avatar_url = session.user.user_metadata?.avatar_url

  if (avatarFile) {
    const ext = avatarFile.name.split('.').pop()
    const path = `${session.user.id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('covers')
      .upload(path, avatarFile, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    avatar_url = data.publicUrl
  }

  const { data, error } = await supabase.auth.updateUser({
    data: { name, avatar_url }
  })
  if (error) throw error
  return data
}