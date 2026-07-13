import { SharedTable, TableColumn } from '../../../shared/components'
import { InvoiceListItem } from '../../../features/notes'
import { formatWeight } from '../../../shared/utils/format'

const NEUTRAL_LIGHT75 = '#2A2A2A'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const renderText = (value: string | number | undefined | null, suffix = '') => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: NEUTRAL_LIGHT75 }}>
    {value != null && value !== '' ? value : '-'}{suffix}
  </span>
)

const getStatusText = (row: InvoiceListItem): string => {
  // Nota inativa: exibe "Inativa" sobrepondo o status real (igual às Rotas)
  if (!row.is_active) return 'Inativa'
  if (row.delivery_status_description) return row.delivery_status_description
  if (row.route_number || row.route_code) return 'Em andamento'
  return 'Aguardando'
}

const getStatusColor = (row: InvoiceListItem): string => {
  // Mesma cor de inativo usada na tabela de Rotas (INACTIVE_COLOR)
  if (!row.is_active) return '#2A2A2A'
  if (row.delivery_status_description || row.route_number || row.route_code) return '#4C4C4C'
  return '#919191'
}

const renderStatus = (row: InvoiceListItem) => {
  const status = getStatusText(row)
  const color = getStatusColor(row)

  return (
    <span className="whitespace-nowrap font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color }}>
      {status}
    </span>
  )
}

// FIX: Use correct field names that match InvoiceListItem (not InvoiceViewModel)
const notesColumns: TableColumn<InvoiceListItem>[] = [
  { key: 'supplier_group_name', label: 'Grupo Fornecedor', render: (row) => renderText(row.supplier_group_name) },
  { key: 'supplier_name', label: 'Fornecedor', render: (row) => renderText(row.supplier_name) },
  { key: 'tripNumber', label: 'Nº Viagem', render: (row) => renderText(row.tripNumber) },
  { key: 'invoice_number', label: 'NF', render: (row) => renderText(row.invoice_number) },
  { key: 'destination_name', label: 'Destino', render: (row) => renderText(row.destination_name) },
  { key: 'city', label: 'Cidade', render: (row) => renderText(row.city) },
  { key: 'attempt_number', label: 'Nº Tentativas', render: (row) => renderText(row.attempt_number) },
  { key: 'volume', label: 'Caixas', render: (row) => renderText(row.volume) },
  { key: 'weight', label: 'Peso Líquido', render: (row) => renderText(row.weight ? formatWeight(row.weight) : null) },
  { key: 'gross_weight', label: 'Peso Bruto', render: (row) => renderText(row.gross_weight ? formatWeight(row.gross_weight) : null) },
  { key: 'value', label: 'Valor da Nota', render: (row) => renderText(row.value != null ? formatCurrency(row.value) : null) },
  { key: 'status', label: 'Status', render: renderStatus },
]

interface NotesTableProps {
  data: InvoiceListItem[]
  loading?: boolean
  onRowClick?: (note: InvoiceListItem) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectRow?: (id: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

export const NotesTable = ({ data, loading, onRowClick, selectable, selectedIds, onSelectRow, onSelectAll }: NotesTableProps) => (
  <SharedTable<InvoiceListItem>
    columns={notesColumns}
    data={data}
    onRowClick={onRowClick}
    loading={loading}
    emptyMessage="Nenhuma nota encontrada"
    selectable={selectable}
    selectedIds={selectedIds}
    onSelectRow={onSelectRow}
    onSelectAll={onSelectAll}
  />
)
