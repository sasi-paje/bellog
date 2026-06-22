import { SharedTable, AppIcon } from '../../../shared/components'
import { VehicleListItem } from '../../../features/vehicles'

const TEXT_COLOR = '#2A2A2A'

const renderText = (value: string | number | null | undefined) => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
    {value !== undefined && value !== null && value !== '' ? String(value) : '-'}
  </span>
)

const renderStatus = (row: VehicleListItem) => (
  <span
    className="font-bold text-[14px] whitespace-nowrap"
    style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
  >
    {row.is_active ? 'Ativo' : 'Inativo'}
  </span>
)

interface VehicleTableProps {
  data?: VehicleListItem[]
  onRowClick?: (vehicle: VehicleListItem) => void
}

export const VehicleTable = ({ data = [], onRowClick }: VehicleTableProps) => (
  <SharedTable<VehicleListItem>
    columns={[
      { key: 'plate', label: 'Placa', render: (row) => renderText(row.plate) },
      { key: 'code', label: 'Frota', render: (row) => renderText(row.code) },
      {
        key: 'max_capacity',
        label: 'Carga Máxima (kg)',
        render: (row) => renderText(row.max_capacity || row.nominal_capacity || null),
      },
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
    emptyMessage="Nenhum veículo encontrado."
  />
)
