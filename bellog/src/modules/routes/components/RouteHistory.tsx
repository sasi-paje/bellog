import { AppIcon } from '../../../shared/components'
import { HistoricoItem } from '../data/historico.mock'

interface RouteHistoryProps {
  data: HistoricoItem[]
  onItemClick: (item: HistoricoItem) => void
}

const TEXT_DARK = '#000000'
const TEXT_LIGHT25 = '#919191'
const SECONDARY_LIGHTER = '#bdcde8'
const SECONDARY_DEFAULT = '#e67c26'

interface TimelineItemProps {
  item: HistoricoItem
  index: number
  isFirst: boolean
  isLast: boolean
  onClick: () => void
}

const TimelineItem = ({ item, index, isFirst, isLast, onClick }: TimelineItemProps) => {
  const showTopLine = !isFirst
  const showBottomLine = !isLast

  const getItemTitle = () => {
    if (item.subitulo && item.local) {
      return (
        <div className="flex gap-[10px] items-center justify-center text-[16px]">
          <span className="font-bold" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
            {item.titulo}
          </span>
          <span className="font-normal" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
            {item.subitulo}
          </span>
          <span className="font-bold" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
            {item.local}
          </span>
        </div>
      )
    }
    return (
      <span className="font-bold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
        {item.titulo}
      </span>
    )
  }

  return (
    <div className="flex flex-col h-[100px] items-start justify-center relative rounded-[6px] shrink-0 w-full">
      <div className="flex flex-[1_0_0] gap-[16px] items-center justify-center w-full">
        {/* Timeline connector */}
        <div className="flex flex-col h-full items-center justify-end overflow-clip pb-px relative shrink-0 w-[20px]">
          {showTopLine && <div className="bg-[#bdcde8] flex-1 mb-[-1px] w-[2px]" />}
          {showTopLine && (
            <div
              className="mb-[-1px] relative shrink-0 w-[13px] h-[13px] rounded-full"
              style={{ backgroundColor: SECONDARY_DEFAULT }}
            />
          )}
          {showBottomLine && <div className="bg-[#bdcde8] flex-1 mt-[-1px] w-[2px]" />}
        </div>

        {/* Content card */}
        <div
          className={`flex flex-[1_0_0] flex-col items-center justify-center py-[16px] relative ${
            item.hasDetail ? 'cursor-pointer' : ''
          }`}
          onClick={item.hasDetail ? onClick : undefined}
        >
          <div
            className={`border border-[#919191] border-solid flex items-center justify-between p-[12px] rounded-[6px] w-full ${
              item.hasDetail ? 'hover:bg-gray-50' : ''
            }`}
          >
            <div className="flex flex-col gap-[8px] items-start">
              {getItemTitle()}
              <span
                className="font-medium text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
              >
                {item.data} {item.hora}
              </span>
            </div>
            {item.hasDetail && (
              <div className="flex items-center justify-center w-[24px] h-[24px]">
                <AppIcon name="open_in_new" size={20} color={TEXT_LIGHT25} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Primeiro item da timeline (círculo no topo, linhaabaixo)
const FirstTimelineItem = ({ item, onClick }: { item: HistoricoItem; onClick: () => void }) => {
  return (
    <div className="flex flex-col h-[100px] items-start justify-center relative rounded-[6px] shrink-0 w-full">
      <div className="flex flex-[1_0_0] gap-[16px] items-center justify-center w-full">
        {/* Timeline connector */}
        <div className="flex flex-col h-full items-center justify-end overflow-clip pb-px relative shrink-0 w-[20px]">
          <div
            className="mb-[-1px] relative shrink-0 w-[13px] h-[13px] rounded-full"
            style={{ backgroundColor: SECONDARY_DEFAULT }}
          />
          <div className="bg-[#bdcde8] h-[45px] mb-[-1px] w-[2px]" />
        </div>

        {/* Content card */}
        <div className="flex flex-[1_0_0] flex-col items-center justify-center py-[16px] relative">
          <div className="border border-[#919191] border-solid flex flex-col gap-[8px] items-start p-[12px] rounded-[6px] w-full">
            <span className="font-bold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
              {item.titulo}
            </span>
            <span
              className="font-medium text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
            >
              {item.data} {item.hora}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Último item da timeline (linha acima, círculo final)
const LastTimelineItem = ({ item, onClick }: { item: HistoricoItem; onClick: () => void }) => {
  return (
    <div className="flex h-[100px] items-center relative shrink-0 w-full">
      <div className="flex flex-[1_0_0] gap-[16px] h-full items-start min-h-px min-w-px relative">
        {/* Timeline connector */}
        <div className="flex flex-col h-full items-center justify-center overflow-clip pb-px relative shrink-0 w-[20px]">
          <div className="bg-[#bdcde8] h-[45px] mb-[-1px] shrink-0 w-[2px]" />
          <div
            className="mb-[-1px] relative shrink-0 w-[13px] h-[13px] rounded-full"
            style={{ backgroundColor: '#4CAF50' }}
          />
        </div>

        {/* Content card */}
        <div
          className={`flex flex-[1_0_0] flex-col items-center justify-center py-[16px] relative ${
            item.hasDetail ? 'cursor-pointer' : ''
          }`}
          onClick={item.hasDetail ? onClick : undefined}
        >
          <div
            className={`border border-[#919191] border-solid flex items-center justify-between p-[12px] rounded-[6px] w-full ${
              item.hasDetail ? 'hover:bg-gray-50' : ''
            }`}
          >
            <div className="flex flex-col gap-[8px] items-start">
              <span className="font-bold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
                {item.titulo}
              </span>
              <span
                className="font-medium text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
              >
                {item.data} {item.hora}
              </span>
            </div>
            {item.hasDetail && (
              <div className="flex items-center justify-center w-[24px] h-[24px]">
                <AppIcon name="open_in_new" size={20} color={TEXT_LIGHT25} />
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
        <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
          Nenhum histórico disponível.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {data.map((item, index) => {
        if (index === 0) {
          return <FirstTimelineItem key={item.id} item={item} onClick={() => onItemClick(item)} />
        }
        if (index === data.length - 1) {
          return <LastTimelineItem key={item.id} item={item} onClick={() => onItemClick(item)} />
        }
        return (
          <TimelineItem
            key={item.id}
            item={item}
            index={index}
            isFirst={index === 0}
            isLast={index === data.length - 1}
            onClick={() => onItemClick(item)}
          />
        )
      })}
    </div>
  )
}
