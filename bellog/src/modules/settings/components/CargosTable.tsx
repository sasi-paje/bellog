import { SharedTable, AppIcon } from '../../../shared/components'
import { RefData } from '../../../hooks/useRefData'

const TEXT_COLOR = '#2A2A2A'

const renderText = (value: string | undefined) => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
    {value || '-'}
  </span>
)

const renderStatus = (row: RefData) => {
  const isActive = row.is_active !== false
  return (
    <span
      className="font-bold text-[14px] whitespace-nowrap"
      style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  )
}

interface CargosTableProps {
  data: RefData[]
  onToggleActive?: (id: string, isActive: boolean) => void
  onEdit?: (data: RefData) => void
  loading?: boolean
}

export const CargosTable = ({ data, onToggleActive, onEdit, loading }: CargosTableProps) => (
  <SharedTable<RefData>
    loading={loading}
    columns={[
      { key: 'description', label: 'Cargo', render: (row) => renderText(row.name ?? row.description ?? undefined), onClick: () => onEdit?.(row) },
      { key: 'status', label: 'Status', render: renderStatus },
      {
        key: 'actions',
        label: 'Ações',
        width: '60px',
        align: 'center',
        render: (row) => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(row)
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
    onRowClick={(row) => onEdit?.(row)}
    emptyMessage="Nenhum cargo encontrado."
  />
)