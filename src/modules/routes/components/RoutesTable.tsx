import { SharedTable, TableColumn, AppIcon } from '../../../shared/components'

// Accept both mock type and real type
export interface RouteData {
  id: string
  route_number?: string
  route_code?: string
  numeroRota?: string
  saida?: string
  departure_date?: string
  departure_time?: string
  arrival_date?: string
  arrival_time?: string
  starts_at?: string
  ends_at?: string
  areaRota?: string
  area_description?: string
  placa?: string
  vehicle_plate?: string
  vehicle_max_capacity?: number
  responsavel?: string
  responsible_names?: string[]
  driver_names?: string[]
  cargaMaxima?: string
  cargaUtilizada?: string
  current_load?: number
  max_capacity?: number
  status?: string
  status_description?: string
  statusEntrega?: string
  delivery_status_description?: string
  is_active?: boolean
  destinations?: string[]
}


// Cores neutro padronizadas
const NEUTRAL_LIGHT75 = '#2A2A2A'
const NEUTRAL_LIGHT50 = '#4C4C4C'
const NEUTRAL_LIGHT25 = '#919191'

// Helper para estilo do texto de status
// Concluído/Finalizado → Light75 (#2A2A2A)
// Aberta/Em Andamento → Light50 (#4C4C4C)
// Pendente → Light25 (#919191)
const getStatusStyle = (status: string | undefined): React.CSSProperties => {
  const color = getStatusColor(status)
  return {
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    fontStyle: 'normal',
    fontWeight: 700,
    lineHeight: 'normal',
    color,
  }
}

const getStatusColor = (status: string | undefined): string => {
  if (!status) return NEUTRAL_LIGHT75
  const normalized = status.toLowerCase().trim()
  if (normalized === 'finalizada' || normalized === 'concluído') return NEUTRAL_LIGHT75
  if (normalized === 'aberta' || normalized === 'em andamento') return NEUTRAL_LIGHT50
  if (normalized === 'pendente') return NEUTRAL_LIGHT25
  return NEUTRAL_LIGHT50 // default
}

const renderStatusBadge = (row: RouteData) => {
  const status = row.status_description || row.status || ''

  // Texto puro, sem badge, com estilo correto
  return (
    <span className="whitespace-nowrap" style={getStatusStyle(status)}>
      {status || '-'}
    </span>
  )
}

const renderStatusEntrega = (row: RouteData) => {
  const status = row.delivery_status_description || row.statusEntrega || ''

  // Texto puro, sem badge, com estilo correto
  return (
    <span className="whitespace-nowrap" style={getStatusStyle(status)}>
      {status || '-'}
    </span>
  )
}

const renderActions = () => (
  <div className="flex items-center justify-center">
    <button
      type="button"
      className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F0F4F9] transition-colors"
    >
      <AppIcon name="edit" size={18} color="#4077D9" />
    </button>
  </div>
)

const renderText = (value: string | undefined, suffix = '') => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#2A2A2A' }}>
    {value || '-'} {suffix}
  </span>
)

// Format date to dd/mm/yyyy - USE formatDateOnlyToBR to avoid timezone issues
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-'
  // Use safe format that doesn't rely on new Date() for DATE-only fields
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }
  // Fallback for datetime strings
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

// Format date with time to dd/mm/yyyy HH:mm
const formatDateTime = (dateStr: string | undefined, timeStr: string | undefined): string => {
  const dateStrFormatted = formatDate(dateStr)
  if (!dateStrFormatted || dateStrFormatted === '-') return '-'
  if (timeStr) {
    return `${dateStrFormatted} ${timeStr.substring(0, 5)}`
  }
  return dateStrFormatted
}

// Format datetime to dd/mm/yyyy HH:mm from ISO string
const formatDateTime2 = (dateStr: string | undefined): string => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return dateStr
  }
}

const renderDataSaida = (row: RouteData) => renderText(formatDate(row.departure_date || row.saida))

const renderCargaMaxima = (row: RouteData) => {
  const max = row.vehicle_max_capacity || row.max_capacity || row.cargaMaxima
  return renderText(max ? `${max.toLocaleString('pt-BR')}` : '-', 'kg')
}

const renderCargaReal = (row: RouteData) => {
  const real = row.current_load || row.cargaUtilizada
  if (real === undefined || real === 0) return renderText('-', 'kg')
  const formatted = real.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return renderText(formatted, 'kg')
}

const renderUtilizacao = (row: RouteData) => {
  const max = row.vehicle_max_capacity || row.max_capacity || row.cargaMaxima
  const real = row.current_load || row.cargaUtilizada
  if (!max || real === undefined || real === 0) return renderText('-', '%')
  const pct = Math.round((real / max) * 100)
  return renderText(`${pct}`, '%')
}

const routeColumns: TableColumn<RouteData>[] = [
  { key: 'route_code', label: 'N° Rota', render: (row) => renderText(row.route_code || row.numeroRota || row.route_number) },
  { key: 'departure_date', label: 'Saída', render: renderDataSaida },
  { key: 'area_description', label: 'Área da Rota', render: (row) => renderText(row.area_description || row.areaRota) },
  { key: 'vehicle_plate', label: 'Placa', render: (row) => renderText(row.vehicle_plate || row.placa) },
  { key: 'responsible_names', label: 'Responsável', render: (row) => renderText(row.responsible_names?.join(', ')) },
  { key: 'driver_names', label: 'Motorista', render: (row) => renderText(row.driver_names?.join(', ')) },
  { key: 'destinations', label: 'Destinos', render: (row) => renderText(row.destinations?.length?.toString() || '0') },
  { key: 'max_capacity', label: 'Carga Máxima', render: renderCargaMaxima },
  { key: 'current_load', label: 'Carga Real', render: renderCargaReal },
  { key: 'utilizacao', label: 'Utilização', render: renderUtilizacao },
  { key: 'delivery_status_description', label: 'Status de Entrega', render: renderStatusEntrega },
  { key: 'starts_at', label: 'Início da Rota', render: (row) => renderText(formatDateTime2(row.starts_at)) },
  { key: 'status', label: 'Status', render: renderStatusBadge },
  { key: 'actions', label: 'Ações', width: '60px', render: renderActions, align: 'center' },
]

interface RoutesTableProps {
  data: RouteData[]
  onRowClick?: (route: RouteData) => void
  loading?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectRow?: (id: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

export const RoutesTable = ({ data, onRowClick, loading, selectable, selectedIds, onSelectRow, onSelectAll }: RoutesTableProps) => (
  <SharedTable<RouteData>
    columns={routeColumns}
    data={data}
    onRowClick={onRowClick}
    loading={loading}
    emptyMessage="Nenhuma rota encontrada."
    selectable={selectable}
    selectedIds={selectedIds}
    onSelectRow={onSelectRow}
    onSelectAll={onSelectAll}
  />
)

export { RouteData }
