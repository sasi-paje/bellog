import { AppIcon } from '../../../shared/components'
import { CargaMock } from '../data/cargas.mock'

interface TableRowProps {
  data: CargaMock
  index: number
  onRowClick: (carga: CargaMock) => void
}

const TABLE_GRID = 'grid grid-cols-[100px_120px_100px_1fr_140px_80px_80px_60px]'
const BG_OTHER = '#F0F4F9'
const WHITE = '#FFFFFF'
const TEXT = '#2A2A2A'

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Em Andamento':
      return '#E67C26'
    case 'Aberta':
      return '#2196F3'
    case 'Finalizada':
      return '#4CAF50'
    default:
      return '#9E9E9E'
  }
}

const TableRow = ({ data, index, onRowClick }: TableRowProps) => {
  const rowBg = index % 2 === 0 ? WHITE : BG_OTHER
  const statusColor = getStatusColor(data.status)

  return (
    <div
      className={`${TABLE_GRID} h-[40px] w-full items-center cursor-pointer hover:brightness-95`}
      style={{ backgroundColor: rowBg }}
      onClick={() => onRowClick(data)}
    >
      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.numeroCarga}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.dataSaida}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.horaSaida}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] truncate"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.responsavel}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="px-2 py-1 rounded-[4px] text-[12px] font-medium whitespace-nowrap"
          style={{
            fontFamily: 'Inter, sans-serif',
            color: WHITE,
            backgroundColor: statusColor,
          }}
        >
          {data.status}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.rotas}
        </span>
      </div>

      <div className="flex h-full items-center px-[12px]">
        <span
          className="text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.notas}
        </span>
      </div>

      <div className="flex h-full items-center justify-center px-[12px]">
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-black/5"
          onClick={(e) => {
            e.stopPropagation()
            onRowClick(data)
          }}
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
        Nº Carga
      </span>
    </div>

    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Data Saída
      </span>
    </div>

    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Hora Saída
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

    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Rotas
      </span>
    </div>

    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Notas
      </span>
    </div>

    <div className="flex h-full items-center justify-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Ações
      </span>
    </div>
  </div>
)

interface CargasTableProps {
  data: CargaMock[]
  onRowClick: (carga: CargaMock) => void
}

export const CargasTable = ({ data, onRowClick }: CargasTableProps) => (
  <div className="flex w-full flex-col items-start gap-0">
    <TableHeader />

    <div className="flex w-full flex-col items-start">
      {data.map((row, index) => (
        <TableRow key={row.id} data={row} index={index} onRowClick={onRowClick} />
      ))}
    </div>
  </div>
)
