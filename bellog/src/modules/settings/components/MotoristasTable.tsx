import { AppIcon } from '../../../shared/components'
import { DriverWithAddress } from '../../../services/driver.service'

interface MotoristasTableProps {
  data?: DriverWithAddress[]
  onRowClick?: (driver: DriverWithAddress) => void
}

// Column layout: Nome, CPF/CNPJ, Email, Telefone, Status, Actions
const TABLE_GRID = 'grid grid-cols-[2fr_1.5fr_2fr_1.2fr_0.8fr_64px]'
const BG_HEADER = '#F0F4F9'
const BG_OTHER = '#F0F4F9'
const WHITE = '#FFFFFF'
const TEXT = '#2A2A2A'

// Mask functions
const maskCPFCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  let formatted = ''

  if (digits.length <= 11) {
    // CPF mask
    if (digits.length > 0) formatted = digits.slice(0, 3)
    if (digits.length > 3) formatted += '.' + digits.slice(3, 6)
    if (digits.length > 6) formatted += '.' + digits.slice(6, 9)
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11)
  } else {
    // CNPJ mask
    if (digits.length > 0) formatted = digits.slice(0, 2)
    if (digits.length > 2) formatted += '.' + digits.slice(2, 5)
    if (digits.length > 5) formatted += '.' + digits.slice(5, 8)
    if (digits.length > 8) formatted += '/' + digits.slice(8, 12)
    if (digits.length > 12) formatted += '-' + digits.slice(12, 14)
  }
  return formatted
}

const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  let formatted = ''
  if (digits.length > 0) {
    if (digits.length <= 2) {
      formatted = '(' + digits
    } else if (digits.length <= 6) {
      formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2)
    } else if (digits.length <= 10) {
      formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6)
    } else {
      formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7)
    }
  }
  return formatted
}

interface TableRowProps {
  data: DriverWithAddress
  index: number
  onClick?: () => void
}

const TableRow = ({ data, index, onClick }: TableRowProps) => {
  const rowBg = index % 2 === 0 ? WHITE : BG_OTHER

  return (
    <div
      className={`${TABLE_GRID} h-[40px] w-full items-center cursor-pointer hover:opacity-80`}
      style={{ backgroundColor: rowBg }}
      onClick={onClick}
    >
      {/* Nome do Motorista */}
      <div className="flex h-full min-w-0 items-center px-[12px]">
        <span
          className="truncate font-medium text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.name || '-'}
        </span>
      </div>

      {/* CPF/CNPJ */}
      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.tax_id ? maskCPFCNPJ(data.tax_id) : '-'}
        </span>
      </div>

      {/* Email */}
      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.email || '-'}
        </span>
      </div>

      {/* Telefone */}
      <div className="flex h-full items-center px-[12px]">
        <span
          className="font-medium text-[14px] whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
        >
          {data.phone ? maskPhone(data.phone) : '-'}
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
    {/* Nome do Motorista */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Nome do Motorista
      </span>
    </div>

    {/* CPF/CNPJ */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        CPF/CNPJ
      </span>
    </div>

    {/* Email */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Email
      </span>
    </div>

    {/* Telefone */}
    <div className="flex h-full items-center px-[12px]">
      <span
        className="font-medium text-[12px] whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
      >
        Telefone
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

export const MotoristasTable: React.FC<MotoristasTableProps> = ({ data = [], onRowClick }) => {
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
