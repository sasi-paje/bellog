// Feature Whats New - conteúdo das novidades (fonte: tabela ref_whats_new)
//
// Substitui o array estático: publicar uma novidade é inserir uma linha em
// ref_whats_new (sem deploy). A leitura é filtrada por ambiente (is_test) e por
// registros ativos, ordenada da mais recente para a mais antiga.
//
// O "visto" por usuário/tela continua em whats-new.service.ts.
import { supabase, IS_TEST } from '../../../lib/supabase'
import type { WhatsNewItem } from '../../../shared/components/WhatsNewPanel'
import { WHATS_NEW_FALLBACK } from '../../../shared/components/WhatsNewPanel'

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
  pages: row.pages && row.pages.length > 0 ? row.pages : ['all'],
})

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
  /** Novidades do ambiente atual (mais recentes primeiro). Cacheado em memória. */
  fetchWhatsNew(): Promise<WhatsNewItem[]> {
    if (!cache) cache = load()
    return cache
  },

  /** Descarta o cache (ex.: após publicar uma novidade em runtime). */
  invalidate(): void {
    cache = null
  },
}
