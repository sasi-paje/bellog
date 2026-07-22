import { useEffect, useState } from 'react'
import type { WhatsNewItem } from '../shared/components/WhatsNewPanel'
import { filterVisible } from '../shared/components/WhatsNewPanel'
import { whatsNewContentService } from '../features/whats-new/api/whats-new-content.service'

/**
 * Novidades da tela informada (mais recentes primeiro), vindas de `ref_whats_new`.
 * Carrega de forma assíncrona; retorna [] até a busca concluir. O conteúdo é
 * cacheado no serviço, então trocar de tela não refaz a consulta.
 */
export function useWhatsNew(page?: string): WhatsNewItem[] {
  const [items, setItems] = useState<WhatsNewItem[]>([])

  useEffect(() => {
    let cancelled = false
    whatsNewContentService.fetchWhatsNew().then((all) => {
      if (!cancelled) setItems(filterVisible(all, page))
    })
    return () => {
      cancelled = true
    }
  }, [page])

  return items
}
