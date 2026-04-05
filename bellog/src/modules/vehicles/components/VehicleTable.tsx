import { SharedTable, TableColumn, StatusBadge, ActionButtons } from '../../../shared/components'
import { VehicleListItem } from '../../../services/vehicle.service'

const renderText = (value: string | number | undefined, suffix = '') => (
  <span className="font-normal text-[14px]">
    {value != null ? value : '-'}{suffix}
  </span>
)

const renderStatus = (row: VehicleListItem) => (
  <StatusBadge status={row.is_active ? 'Ativo' : 'Inativo'} />
)

const vehicleColumns: TableColumn<VehicleListItem>[] = [
  { key: 'plate', label: 'Placa', width: '120px' },
  { key: 'model', label: 'Modelo', width: '200px' },
  { key: 'max_capacity', label: 'Carga Máxima', width: '140px', align: 'right', render: (row) => renderText(row.max_capacity, ' kg') },
  { key: 'responsible_name', label: 'Nome do Responsável', width: '180px' },
  { key: 'responsible_type', label: 'Tipo do Responsável', width: '160px' },
  { key: 'status', label: 'Status', width: '120px', align: 'center', render: renderStatus },
  { key: 'actions', label: 'Ações', width: '80px', align: 'center', render: () => <ActionButtons onEdit={() => {}} /> },
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
    emptyMessage="Nenhum veículo encontrado"
  />
)
