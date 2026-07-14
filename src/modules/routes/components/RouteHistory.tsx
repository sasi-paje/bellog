import { ExternalLink } from 'lucide-react'

interface OccurrenceDetail {
  id: string
  titulo: string
  local: string
  notas: string[]
  observacao: string
  anexos: { id: string; nome: string; tipo: 'imagem' | 'documento' }[]
}

interface HistoricoItem {
  id: string
  tipo: 'rota-criada' | 'em-rota' | 'em-andamento' | 'entrega-parcial' | 'entrega-total' | 'entrega-negada' | 'entrega-abortada' | 'rota-finalizada'
  titulo: string
  subtitulo?: string
  data: string
  hora: string
  local?: string
  hasDetail: boolean
  detail?: OccurrenceDetail
}

interface RouteHistoryProps {
  data: HistoricoItem[]
  onItemClick: (item: HistoricoItem) => void
}

const TEXT_DARK = '#000000'
const TEXT_LIGHT25 = '#919191'
const SECONDARY_LIGHTER = '#E5D7BC'
const ACCENT_ORANGE = '#e67c26'

interface TimelineItemProps {
  item: HistoricoItem
  isFirst: boolean
  isLast: boolean
  onClick: () => void
}

// Espaçamento vertical uniforme entre eventos (px). Também é o quanto a linha
// inferior "vaza" além do card para atravessar o gap e alcançar o próximo card.
const ITEM_GAP = 16

const TimelineItem = ({ item, isFirst, isLast, onClick }: TimelineItemProps) => {
  const isMostRecent = isLast

  return (
    <div className="grid grid-cols-[24px_1fr] gap-4 w-full items-stretch">
      {/* Timeline — a coluna tem exatamente a altura do card (items-stretch, sem
          margem no card), então top-1/2 = centro vertical do card. */}
      <div className="relative">
        {!isFirst && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px]"
            style={{
              backgroundColor: SECONDARY_LIGHTER,
              height: 'calc(50% - 6px)',
            }}
          />
        )}

        {!isLast && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[2px]"
            style={{
              backgroundColor: SECONDARY_LIGHTER,
              top: 'calc(50% + 6px)',
              height: `calc(50% + ${ITEM_GAP}px - 6px)`,
            }}
          />
        )}

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-10"
          style={{
            width: '12px',
            height: '12px',
            backgroundColor: isMostRecent ? ACCENT_ORANGE : SECONDARY_LIGHTER,
          }}
        />
      </div>

      {/* Card — sem marginBottom; o espaçamento vem do gap do container. */}
      <div
        className={`border border-[#919191] rounded-[6px] p-3 w-full ${
          item.hasDetail ? 'cursor-pointer hover:bg-gray-50' : ''
        }`}
        onClick={item.hasDetail ? onClick : undefined}
      >
        <div className="flex flex-col gap-2">
          {item.subtitulo && item.local ? (
            <div className="flex flex-wrap items-center gap-1">
              <span
                className="font-bold text-[16px]"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}
              >
                {item.titulo}
              </span>
              <span
                className="font-normal text-[16px]"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}
              >
                {item.subtitulo}
              </span>
              <span
                className="font-bold text-[16px]"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}
              >
                {' '}{item.local}
              </span>
            </div>
          ) : (
            <span
              className="font-bold text-[16px]"
              style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}
            >
              {item.titulo}
            </span>
          )}

          <div className="flex items-center justify-between gap-3">
            <span
              className="font-medium text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
            >
              {item.data} {item.hora}
            </span>

            {item.hasDetail && (
              <div className="shrink-0">
                <ExternalLink size={20} color={ACCENT_ORANGE} aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const RouteHistory = ({ data, onItemClick }: RouteHistoryProps) => {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p
          className="text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
        >
          Nenhum histórico disponível.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          isFirst={index === 0}
          isLast={index === data.length - 1}
          onClick={() => onItemClick(item)}
        />
      ))}
    </div>
  )
}
