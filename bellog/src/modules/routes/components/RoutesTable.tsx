import { SharedTable, TableColumn, AppIcon } from '../../../shared/components'

// Accept both mock type and real type
export interface RouteData {
  id: string
  route_number?: string
  numeroRota?: string
  saida?: string
  departure_date?: string
  departure_time?: string
  areaRota?: string
  area_description?: string
  placa?: string
  vehicle_plate?: string
  responsavel?: string
  responsible_names?: string[]
  driver_names?: string[]
  cargaMaxima?: string
  cargaUtilizada?: string
  current_load?: number
  status?: string
  status_description?: string
  statusEntrega?: string
  delivery_status_description?: string
  is_active?: boolean
}

const getStatusColor = (status: string | undefined) => {
  switch (status) {
    case 'Ativo':
    case 'Aberta':
      return 'bg-[#27ae60]'
    case 'Inativo':
    case 'Fechada':
      return 'bg-[#eb5757]'
    default:
      return 'bg-[#bdbdbd]'
  }
}

const getStatusEntregaColor = (status: string | undefined) => {
  switch (status) {
    case 'Entregue':
      return 'text-[#27ae60]'
    case 'Em Andamento':
      return 'text-[#e2b93b]'
    case 'Pendente':
      return 'text-[#4077d9]'
    case 'Cancelada':
      return 'text-[#eb5757]'
    default:
      return 'text-[#2a2a2a]'
  }
}

const renderStatusBadge = (row: RouteData) => {
  const status = row.status || row.status_description || ''
  return (
    <span className={`font-bold text-[12px] text-white px-2 py-1 rounded-full whitespace-nowrap ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

const renderStatusEntrega = (row: RouteData) => {
  const status = row.statusEntrega || row.delivery_status_description || ''
  return (
    <span className={`font-medium text-[14px] whitespace-nowrap ${getStatusEntregaColor(status)}`}>
      {status}
    </span>
  )
}

const renderActions = () => (
  <div className="flex gap-1 items-center justify-center">
    <div className="w-5 h-5 flex items-center relative cursor-pointer hover:bg-[#f0f0f0] rounded">
      <AppIcon name="edit" size={16} className="absolute w-full h-full text-[#4077d9]" />
    </div>
  </div>
)

const renderText = (value: string | undefined, suffix = '') => (
  <span className="font-medium text-[14px] text-[#2a2a2a] whitespace-nowrap">
    {value || '-'} {suffix}
  </span>
)

const routeColumns: TableColumn<RouteData>[] = [
  { key: 'numeroRota', label: 'Número da Rota', render: (row) => renderText(row.numeroRota || row.route_number) },
  { key: 'saida', label: 'Saída', render: (row) => renderText(row.saida || row.departure_date) },
  { key: 'areaRota', label: 'Área da Rota', render: (row) => renderText(row.areaRota || row.area_description) },
  { key: 'placa', label: 'Placa', render: (row) => renderText(row.placa || row.vehicle_plate) },
  { key: 'responsavel', label: 'Responsável', render: (row) => renderText(row.responsavel || row.responsible_names?.join(', ')) },
  { key: 'driver_names', label: 'Motorista', render: (row) => renderText(row.driver_names?.join(', ')) },
  { key: 'cargaMaxima', label: 'Carga Máx.', render: (row) => renderText(row.cargaMaxima, 'kg') },
  { key: 'cargaUtilizada', label: 'Carga Util.', render: (row) => renderText(row.cargaUtilizada || row.current_load?.toString(), 'kg') },
  { key: 'statusEntrega', label: 'Status Entrega', render: renderStatusEntrega },
  { key: 'status', label: 'Status', render: renderStatusBadge },
  { key: 'actions', label: 'Actions', width: '60px', render: renderActions, align: 'center' },
]

// Grid template - columns share width equally (1fr each) except actions
const ROUTES_GRID = 'grid grid-cols-[1fr_1fr_1fr_1fr_1.2fr_1.2fr_1fr_1.2fr_1.2fr_1fr_60px]'

interface RoutesTableProps {
  data: RouteData[]
  onRowClick?: (route: RouteData) => void
  loading?: boolean
}

export const RoutesTable = ({ data, onRowClick, loading }: RoutesTableProps) => (
  <SharedTable<RouteData>
    columns={routeColumns}
    data={data}
    onRowClick={onRowClick}
    loading={loading}
    emptyMessage="Nenhuma rota encontrada."
    minWidth="1200px"
    gridTemplate={ROUTES_GRID}
  />
)

export { RouteData }
