// Feature Whats New - persistência do "visto" por usuário
import { supabase, IS_TEST } from '../../../lib/supabase'

/**
 * Rastreio de "O que há de novo?" por usuário (não por dispositivo).
 * O elo com o usuário é o email (+ is_test), igual ao login — master_system_user
 * não tem id_auth_user. Guarda o id da última novidade vista.
 */
export const whatsNewService = {
  /** Lê o id da última novidade vista pelo usuário. null se não houver/erro. */
  async getSeenId(email: string): Promise<string | null> {
    const emailLower = (email || '').trim().toLowerCase()
    if (!emailLower) return null

    const { data, error } = await supabase
      .from('master_system_user')
      .select('last_whatsnew_seen')
      .eq('email', emailLower)
      .eq('is_test', IS_TEST)
      .maybeSingle<{ last_whatsnew_seen: string | null }>()

    if (error) {
      console.warn('[whatsNewService] getSeenId falhou:', error.message)
      return null
    }
    return data?.last_whatsnew_seen ?? null
  },

  /** Marca a novidade informada como vista pelo usuário. */
  async setSeenId(email: string, id: string): Promise<void> {
    const emailLower = (email || '').trim().toLowerCase()
    if (!emailLower || !id) return

    const { error } = await supabase
      .from('master_system_user')
      .update({ last_whatsnew_seen: id })
      .eq('email', emailLower)
      .eq('is_test', IS_TEST)

    if (error) {
      console.warn('[whatsNewService] setSeenId falhou:', error.message)
    }
  },
}
