import React, { useEffect } from 'react'

export interface WhatsNewItem {
  id: string
  tag: string
  date: string
  title: string
  body: string
  /** Telas em que a novidade aparece. 'all' (ou omitido) = todas as telas. */
  pages?: string[]
}

/**
 * Novidades exibidas no painel "O que há de novo?".
 * Mais recentes no topo. Edite esta lista a cada release.
 * `pages`: chaves de tela (routes, notes, routes-by-notes, assign-notes, users,
 * vehicles, settings...). Use ['all'] ou omita para aparecer em todas.
 */
export const WHATS_NEW: WhatsNewItem[] = [
  {
    id: '2026-07-19-central-novidades',
    tag: 'Novo',
    date: '19/07/2026',
    title: 'Central de novidades',
    body: 'Sempre que uma nova funcionalidade ou correção for publicada, você será avisado por aqui automaticamente.',
    pages: ['all'],
  },
  {
    id: '2026-07-15-filtro-avancado',
    tag: 'Novo',
    date: '15/07/2026',
    title: 'Filtro avançado de rotas',
    body: 'Agora é possível combinar múltiplos critérios — área, motorista e status de entrega — em uma única busca.',
    pages: ['routes'],
  },
  {
    id: '2026-07-02-registros-por-pagina',
    tag: 'Melhoria',
    date: '02/07/2026',
    title: 'Registros por página',
    body: 'Escolha exibir 20, 50 ou 100 registros por página diretamente na barra de ferramentas.',
    pages: ['routes', 'notes', 'routes-by-notes'],
  },
  {
    id: '2026-06-24-rotas-inativas',
    tag: 'Melhoria',
    date: '24/06/2026',
    title: 'Exibir rotas inativas',
    body: 'Um novo controle permite alternar a visibilidade de rotas desativadas na listagem.',
    pages: ['routes'],
  },
  {
    id: '2026-06-10-export-pdf',
    tag: 'Correção',
    date: '10/06/2026',
    title: 'Exportação para PDF',
    body: 'Corrigido o corte de colunas ao exportar a listagem de rotas em modo paisagem.',
    pages: ['routes'],
  },
]

/** true se a novidade deve aparecer na tela informada. */
export function whatsNewMatchesPage(item: WhatsNewItem, page?: string): boolean {
  if (!item.pages || item.pages.includes('all')) return true
  return page != null && item.pages.includes(page)
}

/** Novidades visíveis para a tela (mais recentes primeiro). */
export function visibleWhatsNew(page?: string): WhatsNewItem[] {
  return WHATS_NEW.filter((i) => whatsNewMatchesPage(i, page))
}

interface WhatsNewPanelProps {
  isOpen: boolean
  onClose: () => void
  /** Tela atual — filtra as novidades para mostrar só as dela (+ globais). */
  page?: string
  items?: WhatsNewItem[]
}

const InfoIcon = ({ size = 22, color = '#e8791a' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
)

export const WhatsNewPanel: React.FC<WhatsNewPanelProps> = ({ isOpen, onClose, page, items }) => {
  const list = items ?? visibleWhatsNew(page)
  // Fecha com ESC e trava o scroll do body enquanto aberto
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="O que há de novo?"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(16,19,42,0.45)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel lateral direito */}
      <div
        className="wn-panel-anim relative flex h-full w-[440px] max-w-[92vw] flex-col bg-white"
        style={{ boxShadow: '-8px 0 30px rgba(16,19,42,0.25)' }}
      >
        <style>{`.wn-panel-anim { animation: wn-slide-in 0.25s ease-out; }
          @keyframes wn-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @media (prefers-reduced-motion: reduce) { .wn-panel-anim { animation: none !important; } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e6e9f0] px-[26px] py-[22px]">
          <div className="flex items-center gap-[10px]">
            <InfoIcon size={22} color="#e8791a" />
            <h2 className="m-0 text-[19px] font-extrabold text-[#1f2333]">O que há de novo?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex rounded p-1 text-[#6b7080] transition-colors hover:bg-[#f1f3f8]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de novidades */}
        <div className="flex-1 overflow-y-auto px-[26px] pb-[26px] pt-[8px]">
          {list.length === 0 ? (
            <p className="pt-6 text-[13px] text-[#6b7080]">Nenhuma novidade por enquanto.</p>
          ) : (
            list.map((item) => (
              <div key={item.id} className="border-b border-[#eef0f5] py-[20px] last:border-b-0">
                <div className="mb-[8px] flex items-center gap-[10px]">
                  <span className="inline-flex items-center rounded-full bg-[#fdece0] px-[10px] py-[3px] text-[12px] font-bold text-[#c9661a]">
                    {item.tag}
                  </span>
                  <span className="text-[12px] text-[#9aa0b0]">{item.date}</span>
                </div>
                <h3 className="m-0 mb-[6px] text-[15px] font-bold text-[#1f2333]">{item.title}</h3>
                <p className="m-0 text-[13px] leading-[1.55] text-[#6b7080]">{item.body}</p>
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-[#e6e9f0] px-[26px] py-[16px]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-[42px] items-center gap-[8px] rounded-[8px] bg-[#e8791a] px-[18px] text-[14px] font-semibold text-white transition-colors hover:bg-[#c9661a]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default WhatsNewPanel
