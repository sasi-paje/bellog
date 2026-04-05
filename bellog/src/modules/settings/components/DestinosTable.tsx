import { AppIcon } from '../../../shared/components'
import { CompanyWithAddress } from '../../../services/company.service'

interface DestinosTableProps {
  data?: CompanyWithAddress[]
  onRowClick?: (company: CompanyWithAddress) => void
}

// Column layout matching Figma - 8 columns with fixed Actions at end
// Using grid with flex-1 for proportional columns and fixed for Actions
const TABLE_GRID = 'grid grid-cols-[2fr_1.5fr_1fr_1.2fr_0.8fr_0.8fr_64px]'
const BG_HEADER = '#F0F4F9'
const BG_OTHER = '#F0F4F9'
const WHITE = '#FFFFFF'
const TEXT = '#2A2A2A'

interface TableRowProps {
  data: CompanyWithAddress
  index: number
  onClick?: () => void
}

const TableRow = ({ data, index, onClick }: TableRowProps) => {
  const rowBg = index % 2 === 0 ? WHITE : BG_OTHER
  const address = data.addresses?.[0]

  return (
    <div
      className={`${TABLE_GRID} h-[40px] w-full items-center cursor-pointer hover:opacity-80`}
      style={{ backgroundColor: rowBg }}
      onClick={onClick}
    >
      {/* Razão Social */}
      <div className="flex h-full min-w-0 items-center px-[12px]">
        <span
          className="truncate font-medium text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.legal_name || '-'}
        </span>
      </div>

      {/* Nome de Exibição */}
      <div className="flex h-full min-w-0 items-center px-[12px]">
        <span
          className="truncate font-medium text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.trade_name || '-'}
        </span>
      </div>

      {/* Rua */}
      <div className="flex h-full min-w-0 items-center px-[12px]">
        <span
          className="truncate font-medium text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {address?.street || '-'}
        </span>
      </div>

      {/* CEP */}
      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {address?.zip_code || '-'}
        </span>
      </div>

      {/* Bairro */}
      <div className="flex h-full items-center px-[12px]">
        <span
          className="truncate font-medium text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {address?.district || '-'}
        </span>
      </div>

      {/* Número */}
      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-normal text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {address?.street_number || '-'}
        </span>
      </div>

      {/* Status */}
      <div className="flex h-full items-center justify-center px-[12px]">
        <span
          className={`font-bold text-[14px] whitespace-nowrap ${data.is_active ? 'text-green-600' : 'text-red-500'}`}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {data.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex h-full items-center justify-center px-[12px] w-[64px]">
        <div className="flex items-center justify-center w-[20px] h-[20px]">
          <AppIcon name="edit" size={20} color={TEXT} />
        </div>
      </div>
    </div>
  )
}

const TableHeader = () => (
  <div
    className={`${TABLE_GRID} h-[32px] w-full items-center rounded-[6px]`}
    style={{ backgroundColor: BG_HEADER }}
  >
    {/* Razão Social */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Razão Social
      </span>
    </div>

    {/* Nome de Exibição */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Nome de Exibição
      </span>
    </div>

    {/* Rua */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Rua
      </span>
    </div>

    {/* CEP */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        CEP
      </span>
    </div>

    {/* Bairro */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Bairro
      </span>
    </div>

    {/* Número */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Número
      </span>
    </div>

    {/* Status */}
    <div className="flex h-full items-center justify-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Status
      </span>
    </div>

    {/* Actions */}
    <div className="flex h-full items-center justify-center px-[12px] w-[64px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Ações
      </span>
    </div>
  </div>
)

export const DestinosTable: React.FC<DestinosTableProps> = ({ data = [], onRowClick }) => {
  return (
    <div className="flex w-full flex-col items-start gap-0">
      <TableHeader />

      <div className="flex w-full flex-col items-start">
        {data.map((row, index) => (
          <TableRow
            key={row.id}
            data={row}
            index={index}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
