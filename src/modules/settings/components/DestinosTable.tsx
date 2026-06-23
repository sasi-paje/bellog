import { SharedTable, AppIcon } from '../../../shared/components'
import { CompanyWithAddress } from '../../../features/companies'

const TEXT_COLOR = '#2A2A2A'

const maskZipCode = (value: string | undefined): string => {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value || '-'
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
}

const renderText = (value: string | undefined) => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
    {value || '-'}
  </span>
)

const renderStatus = (row: CompanyWithAddress) => (
  <span
    className="font-bold text-[14px] whitespace-nowrap"
    style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
  >
    {row.is_active ? 'Ativo' : 'Inativo'}
  </span>
)

interface DestinosTableProps {
  data?: CompanyWithAddress[]
  onRowClick?: (company: CompanyWithAddress) => void
}

export const DestinosTable: React.FC<DestinosTableProps> = ({ data = [], onRowClick }) => {
  const getAddress = (row: CompanyWithAddress) => row.addresses?.[0]

  return (
    <SharedTable<CompanyWithAddress>
      columns={[
        { key: 'legal_name', label: 'Razão Social', render: (row) => renderText(row.legal_name) },
        { key: 'trade_name', label: 'Nome de Exibição', render: (row) => renderText(row.trade_name || row.legal_name) },
        { key: 'company_group', label: 'Grupo', render: (row) => renderText(row.company_group?.name) },
        { key: 'zip_code', label: 'CEP', render: (row) => renderText(maskZipCode(getAddress(row)?.zip_code)) },
        { key: 'street', label: 'Rua', render: (row) => renderText(getAddress(row)?.street) },
        { key: 'district', label: 'Bairro', render: (row) => renderText(getAddress(row)?.district) },
        { key: 'street_number', label: 'Número', render: (row) => renderText(getAddress(row)?.street_number) },
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
      emptyMessage="Nenhum destino encontrado."
    />
  )
}