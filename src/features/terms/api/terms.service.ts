// Feature Terms - aceite do Termo de Uso por usuário
import { supabase, IS_TEST } from '../../../lib/supabase'

/**
 * Rastreio do aceite do Termo de Uso por usuário (email+is_test, elo do
 * master_system_user com o Auth). terms_accepted_at NULL = ainda não aceitou.
 */
export const termsService = {
  /** Retorna a data ISO do aceite, ou null se ainda não aceitou / erro. */
  async getAcceptedAt(email: string): Promise<string | null> {
    const emailLower = (email || '').trim().toLowerCase()
    if (!emailLower) return null

    const { data, error } = await supabase
      .from('master_system_user')
      .select('terms_accepted_at')
      .eq('email', emailLower)
      .eq('is_test', IS_TEST)
      .maybeSingle<{ terms_accepted_at: string | null }>()

    if (error) {
      console.warn('[termsService] getAcceptedAt falhou:', error.message)
      return null
    }
    return data?.terms_accepted_at ?? null
  },

  /** Marca o Termo de Uso como aceito agora. */
  async accept(email: string): Promise<void> {
    const emailLower = (email || '').trim().toLowerCase()
    if (!emailLower) return

    const { error } = await supabase
      .from('master_system_user')
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq('email', emailLower)
      .eq('is_test', IS_TEST)

    if (error) {
      console.warn('[termsService] accept falhou:', error.message)
      throw new Error(error.message)
    }
  },
}
