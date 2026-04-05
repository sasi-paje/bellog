import { SharedTable, TableColumn, StatusBadge, ActionButtons } from '../../../shared/components'
import { InvoiceListItem } from '../../../services/fiscal-invoice.service'
import { NoteStatus } from '../../../shared/components'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const getInvoiceStatus = (data: InvoiceListItem): NoteStatus => {
  if (!data.is_active) return 'Cancelada'
  if (data.route_number) return 'Em Trânsito'
  return 'Pendente'
}

const renderText = (value: string | number | undefined, suffix = '') => (
  <span className="font-normal text-[14px]">
    {value != null ? value : '-'}{suffix}
  </span>
)

const notesColumns: TableColumn<InvoiceListItem>[] = [
  { key: 'invoice_number', label: 'Número Nota', width: '120px' },
  { key: 'supplier_name', label: 'Fornecedor', width: '180px', render: (row) => renderText(row.supplier_name) },
  { key: 'destination_name', label: 'Destino', width: '160px', render: (row) => renderText(row.destination_name) },
  { key: 'route_number', label: 'Nº Viagem', width: '100px', align: 'center' },
  { key: 'volume', label: 'Caixas', width: '100px', align: 'right' },
  { key: 'weight', label: 'Peso líquido', width: '140px', align: 'right', render: (row) => renderText(row.weight?.toFixed(1), ' kg') },
  { key: 'weight_bruto', label: 'Peso bruto', width: '140px', align: 'right', render: (row) => renderText(row.weight?.toFixed(1), ' kg') },
  { key: 'value', label: 'Valor da nota', width: '140px', align: 'right', render: (row) => renderText(formatCurrency(row.value || 0)) },
  { key: 'status', label: 'Status', width: '180px', align: 'center', render: (row) => <StatusBadge status={getInvoiceStatus(row)} /> },
  { key: 'actions', label: 'Ações', width: '80px', align: 'center', render: () => <ActionButtons onEdit={() => {}} /> },
]

interface NotesTableProps {
  data: InvoiceListItem[]
  loading?: boolean
  onRowClick?: (note: InvoiceListItem) => void
}

export const NotesTable = ({ data, loading, onRowClick }: NotesTableProps) => (
  <SharedTable<InvoiceListItem>
    columns={notesColumns}
    data={data}
    onRowClick={onRowClick}
    loading={loading}
    emptyMessage="Nenhuma nota encontrada"
  />
)
