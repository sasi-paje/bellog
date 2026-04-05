import { AppIcon } from '../../../shared/components'

interface TableRowProps {
  data: {
    plate: string
    maxLoad: number
    responsible: string
    status: string
  }
  index: number
}

const TABLE_GRID = 'grid grid-cols-[120px_120px_minmax(0,1fr)_100px_80px]'
const BG_OTHER = '#F0F4F9'
const WHITE = '#FFFFFF'
const TEXT = '#2A2A2A'

const TableRow = ({ data, index }: TableRowProps) => {
  const rowBg = index % 2 === 0 ? WHITE : BG_OTHER

  return (
    <div
      className={`${TABLE_GRID} h-[40px] w-full items-center`}
      style={{ backgroundColor: rowBg }}
    >
      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.plate}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.maxLoad}
        </span>
      </div>

      <div className="flex h-full min-w-0 items-center px-[12px]">
        <span
          className="truncate font-medium text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.responsible}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-bold text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.status}
        </span>
      </div>

      <div className="flex h-full items-center justify-end px-[12px]">
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-black/5"
        >
          <AppIcon name="edit" size={20} />
        </button>
      </div>
    </div>
  )
}

const TableHeader = () => (
  <div
    className={`${TABLE_GRID} h-[32px] w-full items-center rounded-[6px]`}
    style={{ backgroundColor: BG_OTHER }}
  >
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Placa
      </span>
    </div>

    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Carga Máxima
      </span>
    </div>

    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Responsável
      </span>
    </div>

    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Status
      </span>
    </div>

    <div className="flex h-full items-center justify-end px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Actions
      </span>
    </div>
  </div>
)

interface VehicleTableProps {
  data: Array<{
    plate: string
    maxLoad: number
    responsible: string
    status: string
  }>
}

export const VehicleTable = ({ data }: VehicleTableProps) => (
  <div className="flex w-full flex-col items-start gap-0">
    <TableHeader />

    <div className="flex w-full flex-col items-start">
      {data.map((row, index) => (
        <TableRow key={index} data={row} index={index} />
      ))}
    </div>
  </div>
)
