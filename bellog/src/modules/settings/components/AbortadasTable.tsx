import { AppIcon } from '../../../shared/components'
import { abortadasData, AbortadaMock } from '../data/abortadas.mock'

interface AbortadasTableProps {
  data?: AbortadaMock[]
}

const TABLE_GRID = 'grid grid-cols-[minmax(0,1fr)_220px_80px]'
const BG_OTHER = '#F0F4F9'
const WHITE = '#FFFFFF'
const TEXT = '#2A2A2A'

interface TableRowProps {
  data: {
    motivo: string
    status: string
  }
  index: number
}

const TableRow = ({ data, index }: TableRowProps) => {
  const rowBg = index % 2 === 0 ? WHITE : BG_OTHER

  return (
    <div
      className={`${TABLE_GRID} h-[40px] w-full items-center`}
      style={{ backgroundColor: rowBg }}
    >
      <div className="flex h-full min-w-0 items-center px-[12px]">
        <span
          className="truncate font-medium text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.motivo}
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
        Motivo
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

export const AbortadasTable: React.FC<AbortadasTableProps> = ({ data = abortadasData }) => (
  <div className="flex w-full flex-col items-start gap-0">
    <TableHeader />

    <div className="flex w-full flex-col items-start">
      {data.map((row, index) => (
        <TableRow key={index} data={row} index={index} />
      ))}
    </div>
  </div>
)
