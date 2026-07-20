// Feature Whats New - conteúdo das novidades (fonte: tabela ref_whats_new)
//
// Substitui o array estático: publicar uma novidade é inserir uma linha em
// ref_whats_new (sem deploy). A leitura é filtrada por ambiente (is_test) e por
// registros ativos, ordenada da mais recente para a mais antiga.
//
// Cada novidade aparece apenas por uma janela de WHATS_NEW_WINDOW_DAYS dias a
// partir da publicação; depois some do painel (a linha continua no banco).
//
// O "visto" por usuário/tela continua em whats-new.service.ts.
import { supabase, IS_TEST } from '../../../lib/supabase'
import type { WhatsNewItem } from '../../../shared/components/WhatsNewPanel'
import { WHATS_NEW_FALLBACK } from '../../../shared/components/WhatsNewPanel'

/** Por quantos dias corridos uma novidade fica visível (dia da publicação + 6). */
const WHATS_NEW_WINDOW_DAYS = 7

interface WhatsNewRow {
  id: number
  tag: string
  title: string
  body: string
  pages: string[] | null
  published_at: string // 'YYYY-MM-DD'
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' para exibição (sem depender de Date/timezone). */
const formatDate = (iso: string): string => {
  const [y, m, d] = (iso || '').split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

const mapRow = (row: WhatsNewRow): WhatsNewItem => ({
  id: String(row.id),
  tag: row.tag,
  title: row.title,
  body: row.body,
  date: formatDate(row.published_at),
  publishedAt: row.published_at,
  pages: row.pages && row.pages.length > 0 ? row.pages : ['all'],
})

/** Data-limite (YYYY-MM-DD, horário local) da janela de exibição. */
const windowCutoff = (): string => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (WHATS_NEW_WINDOW_DAYS - 1))
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * Mantém só as novidades dentro da janela de exibição. Comparação lexicográfica
 * de datas ISO (YYYY-MM-DD ordena por igual). Itens sem publishedAt (ex.: fallback
 * local) nunca são ocultados. Aplicado a cada leitura para acompanhar a virada do dia.
 */
const withinWindow = (items: WhatsNewItem[]): WhatsNewItem[] => {
  const cutoff = windowCutoff()
  return items.filter((i) => !i.publishedAt || i.publishedAt >= cutoff)
}

// Cache em memória: uma única busca por sessão (reaproveitada entre navegações).
let cache: Promise<WhatsNewItem[]> | null = null

async function load(): Promise<WhatsNewItem[]> {
  const { data, error } = await supabase
    .from('ref_whats_new')
    .select('id, tag, title, body, pages, published_at')
    .eq('is_active', true)
    .eq('is_test', IS_TEST)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    console.warn('[whatsNewContent] leitura falhou, usando fallback local:', error.message)
    return WHATS_NEW_FALLBACK
  }
  if (!data || data.length === 0) return []
  return (data as WhatsNewRow[]).map(mapRow)
}

export const whatsNewContentService = {
  /**
   * Novidades do ambiente atual, dentro da janela de exibição (mais recentes
   * primeiro). A busca é cacheada; a janela de 7 dias é reaplicada a cada chamada.
   */
  async fetchWhatsNew(): Promise<WhatsNewItem[]> {
    if (!cache) cache = load()
    return withinWindow(await cache)
  },

  /** Descarta o cache (ex.: após publicar uma novidade em runtime). */
  invalidate(): void {
    cache = null
  },
}
