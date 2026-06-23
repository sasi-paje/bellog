import { SharedTable, AppIcon } from '../../../shared/components'
import { DriverWithAddress } from '../../../features/drivers'

const TEXT_COLOR = '#2A2A2A'
const ACTIVE_COLOR = '#22C55E'
const INACTIVE_COLOR = '#EF4444'

// Mask functions
const maskCPFCNPJ = (value: string | undefined): string => {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '').slice(0, 14)
  let formatted = ''

  if (digits.length <= 11) {
    if (digits.length > 0) formatted = digits.slice(0, 3)
    if (digits.length > 3) formatted += '.' + digits.slice(3, 6)
    if (digits.length > 6) formatted += '.' + digits.slice(6, 9)
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11)
  } else {
    if (digits.length > 0) formatted = digits.slice(0, 2)
    if (digits.length > 2) formatted += '.' + digits.slice(2, 5)
    if (digits.length > 5) formatted += '.' + digits.slice(5, 8)
    if (digits.length > 8) formatted += '/' + digits.slice(8, 12)
    if (digits.length > 12) formatted += '-' + digits.slice(12, 14)
  }
  return formatted || '-'
}

const maskPhone = (value: string | undefined): string => {
  if (!value) return '-'
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
  return formatted || '-'
}

const renderText = (value: string | undefined) => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
    {value || '-'}
  </span>
)

const renderStatus = (row: DriverWithAddress) => (
  <span
    className="font-bold text-[14px] whitespace-nowrap"
    style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
  >
    {row.is_active ? 'Ativo' : 'Inativo'}
  </span>
)

interface MotoristasTableProps {
  data?: DriverWithAddress[]
  onRowClick?: (driver: DriverWithAddress) => void
}

export const MotoristasTable: React.FC<MotoristasTableProps> = ({ data = [], onRowClick }) => (
  <SharedTable<DriverWithAddress>
    columns={[
      { key: 'name', label: 'Nome do Motorista', render: (row) => renderText(row.name) },
      { key: 'tax_id', label: 'CPF/CNPJ', render: (row) => renderText(maskCPFCNPJ(row.tax_id)) },
      { key: 'email', label: 'Email', render: (row) => renderText(row.email) },
      { key: 'phone', label: 'Telefone', render: (row) => renderText(maskPhone(row.phone)) },
      { key: 'status', label: 'Status', render: renderStatus },
      {
        key: 'actions',
        label: 'Ações',
        width: '64px',
        align: 'center',
        render: (row) => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRowClick?.(row)
              }}
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F0F4F9] transition-colors"
            >
              <AppIcon name="edit" size={18} color={TEXT_COLOR} />
            </button>
          </div>
        ),
      },
    ]}
    data={data}
    onRowClick={onRowClick}
    emptyMessage="Nenhum motorista encontrado."
  />
)