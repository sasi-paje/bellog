import { SharedTable, TableColumn, AppIcon } from '../../../shared/components'
import { VehicleListItem } from '../../../features/vehicles'

const TEXT_COLOR = '#2A2A2A'

const renderText = (value: string | number | undefined, suffix = '') => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
    {value != null && value !== '' ? `${value}${suffix}` : '-'}
  </span>
)

const renderStatus = (row: VehicleListItem) => (
  <div className="flex justify-center">
    <span
      className="font-bold text-[14px] whitespace-nowrap"
      style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
    >
      {row.is_active ? 'Ativo' : 'Inativo'}
    </span>
  </div>
)

const vehicleColumns: TableColumn<VehicleListItem>[] = [
  { key: 'plate', label: 'Placa', width: '16%', render: (row) => renderText(row.plate) },
  {
    key: 'max_capacity',
    label: 'Carga Máxima (kg)',
    width: '16%',
    render: (row) => renderText(row.max_capacity || row.nominal_capacity || undefined, ' kg'),
  },
  { key: 'responsible_name', label: 'Nome do Responsável', width: '26%', render: (row) => renderText(row.responsible_name) },
  { key: 'responsible_type', label: 'Tipo do Responsável', width: '22%', render: (row) => renderText(row.responsible_type) },
  { key: 'status', label: 'Status', width: '10%', align: 'center', render: renderStatus },
  {
    key: 'actions',
    label: 'Ações',
    width: '10%',
    align: 'center',
    render: (row) => (
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            // row click handled by onRowClick on the table row
          }}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F0F4F9] transition-colors"
        >
          <AppIcon name="edit" size={18} color={TEXT_COLOR} />
        </button>
      </div>
    ),
  },
]

interface VehicleTableProps {
  data: VehicleListItem[]
  loading?: boolean
  onRowClick?: (vehicle: VehicleListItem) => void
}

export const VehicleTable = ({ data, loading, onRowClick }: VehicleTableProps) => (
  <SharedTable<VehicleListItem>
    columns={vehicleColumns}
    data={data}
    onRowClick={onRowClick}
    loading={loading}
    emptyMessage="Nenhum veículo encontrado."
  />
)
