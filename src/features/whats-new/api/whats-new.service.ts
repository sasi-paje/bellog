// Feature Whats New - persistência do "visto" por usuário e por tela
import { supabase, IS_TEST } from '../../../lib/supabase'

/**
 * Rastreio de "O que há de novo?" por usuário (email+is_test) e por tela.
 * last_whatsnew_seen guarda um JSON { [pageKey]: lastSeenId }. Assim cada tela
 * tem seu próprio controle de "visto". Valores legados (string simples) são
 * tratados como mapa vazio.
 */
type SeenMap = Record<string, string>

const parseSeen = (raw: string | null): SeenMap => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as SeenMap) : {}
  } catch {
    return {} // valor legado (string) → ignora
  }
}

export const whatsNewService = {
  /** Lê o mapa { tela: idVisto } do usuário. {} se não houver/erro. */
  async getSeenMap(email: string): Promise<SeenMap> {
    const emailLower = (email || '').trim().toLowerCase()
    if (!emailLower) return {}

    const { data, error } = await supabase
      .from('master_system_user')
      .select('last_whatsnew_seen')
      .eq('email', emailLower)
      .eq('is_test', IS_TEST)
      .maybeSingle<{ last_whatsnew_seen: string | null }>()

    if (error) {
      console.warn('[whatsNewService] getSeenMap falhou:', error.message)
      return {}
    }
    return parseSeen(data?.last_whatsnew_seen ?? null)
  },

  /** Marca a novidade da tela como vista (mescla no mapa e salva). */
  async setSeen(email: string, page: string, id: string): Promise<void> {
    const emailLower = (email || '').trim().toLowerCase()
    if (!emailLower || !page || !id) return

    const current = await this.getSeenMap(emailLower)
    const next = { ...current, [page]: id }

    const { error } = await supabase
      .from('master_system_user')
      .update({ last_whatsnew_seen: JSON.stringify(next) })
      .eq('email', emailLower)
      .eq('is_test', IS_TEST)

    if (error) {
      console.warn('[whatsNewService] setSeen falhou:', error.message)
    }
  },
}
