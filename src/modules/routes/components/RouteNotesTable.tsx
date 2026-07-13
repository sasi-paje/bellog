import { AppIcon } from '../../../shared/components'
import { formatWeight as formatWeightShared } from '../../../shared/utils/format'

interface InvoiceData {
  id: string
  invoice_number: string
  serie?: string
  value?: number
  weight?: number
  gross_weight?: number
  volume?: number
  supplier_name?: string
  destination_name?: string
  is_active?: boolean
  status?: string
  status_description?: string
  canhoto?: string
  nfd_status?: string
  motivo?: string
  motivo_id?: string
  receipt_image_path?: string | null
  nfd_image_path?: string | null
}

interface RouteNotesTableProps {
  data: InvoiceData[]
  onRowClick?: (note: InvoiceData) => void
}

const BORDER_HEADER = '#7d9dd3'
const BORDER_ROW = '#828282'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const ORANGE = '#e67c26'

const headerStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '12px',
  fontStyle: 'normal' as const,
  fontWeight: 500,
  lineHeight: 'normal',
}

const dataColumnStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '12px',
  fontStyle: 'normal' as const,
  fontWeight: 500,
  lineHeight: 'normal',
  color: TEXT_LIGHT75,
}

const secondaryColumnStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '12px',
  fontStyle: 'normal' as const,
  fontWeight: 500,
  lineHeight: 'normal',
  color: TEXT_LIGHT25,
}

const statusActiveStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '12px',
  fontStyle: 'normal' as const,
  fontWeight: 700,
  lineHeight: 'normal',
  color: TEXT_LIGHT75,
}

const formatWeight = (weight?: number): string => {
  if (!weight) return '-'
  return formatWeightShared(weight)
}

const formatValue = (value?: number): string => {
  if (!value) return '-'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const normalizeStatus = (status?: string): string => {
  return status?.toLowerCase().replace(/\s+/g, ' ').trim() || ''
}

const isEntregaTotal = (status?: string): boolean => normalizeStatus(status).includes('total')
const isEntregaParcial = (status?: string): boolean => normalizeStatus(status).includes('parcial')
const isEntregaAbortada = (status?: string): boolean => normalizeStatus(status).includes('abortada')
const isEntregaNegada = (status?: string): boolean => normalizeStatus(status).includes('negada')

const formatCanhoto = (data: InvoiceData): string => {
  const status = data.status
  const hasReceipt = !!data.receipt_image_path
  if (!status || normalizeStatus(status) === '') return 'Aguardando'
  if (isEntregaTotal(status)) return hasReceipt ? 'Entregue' : 'Pendente'
  if (isEntregaParcial(status)) return hasReceipt ? 'Entregue' : 'Pendente'
  if (isEntregaAbortada(status)) return 'N/A'
  if (isEntregaNegada(status)) return 'N/A'
  return 'Aguardando'
}

const formatNfd = (data: InvoiceData): string => {
  const status = data.status
  const hasNfd = !!data.nfd_image_path
  if (!status || normalizeStatus(status) === '') return 'Aguardando'
  if (isEntregaTotal(status)) return 'N/A'
  if (isEntregaParcial(status)) return hasNfd ? 'Entregue' : 'Pendente'
  if (isEntregaAbortada(status)) return 'N/A'
  if (isEntregaNegada(status)) return 'N/A'
  return 'Aguardando'
}

const formatStatus = (data: InvoiceData): string => {
  const status = data.status
  if (!status || normalizeStatus(status) === '') return 'Aguardando'
  return status
}

const formatMotivo = (data: InvoiceData): string => {
  const status = data.status
  const normalizedStatus = normalizeStatus(status)
  if (!status || normalizedStatus === '' || normalizedStatus === 'aguardando') return 'Aguardando'
  if (isEntregaTotal(status) || isEntregaParcial(status)) return '-'
  if (isEntregaAbortada(status) || isEntregaNegada(status)) return data.motivo || '-'
  return '-'
}

const COLUMNS = [
  { key: 'supplier_name', label: 'Fornecedor', width: '14%', align: 'left' as const },
  { key: 'destination_name', label: 'Destino', width: '14%', align: 'left' as const },
  { key: 'invoice_number', label: 'N° NF', width: '7%', align: 'center' as const },
  { key: 'volume', label: 'N° Caixas', width: '7%', align: 'center' as const },
  { key: 'weight', label: 'Peso Líquido', width: '9%', align: 'right' as const },
  { key: 'gross_weight', label: 'Peso Bruto', width: '9%', align: 'right' as const },
  { key: 'value', label: 'Valor NF', width: '9%', align: 'right' as const },
  { key: 'canhoto', label: 'Canhoto', width: '8%', align: 'center' as const },
  { key: 'nfd_status', label: 'NFD', width: '6%', align: 'center' as const },
  { key: 'status', label: 'Status', width: '9%', align: 'center' as const },
  { key: 'motivo', label: 'Motivo', width: '10%', align: 'left' as const },
  { key: 'actions', label: '', width: '4%', align: 'center' as const },
]

const getAlignClass = (align: 'left' | 'center' | 'right') => {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

const getCellValue = (col: typeof COLUMNS[number], item: InvoiceData): string => {
  switch (col.key) {
    case 'supplier_name': return item.supplier_name || '-'
    case 'destination_name': return item.destination_name || '-'
    case 'invoice_number': return item.invoice_number || '-'
    case 'volume': return String(item.volume ?? '-')
    case 'weight': return formatWeight(item.weight)
    case 'gross_weight': return formatWeight(item.gross_weight)
    case 'value': return formatValue(item.value)
    case 'canhoto': return formatCanhoto(item)
    case 'nfd_status': return formatNfd(item)
    case 'status': return formatStatus(item)
    case 'motivo': return formatMotivo(item)
    default: return '-'
  }
}

const getCellStyle = (colKey: string, value: string) => {
  const isPrimary = ['supplier_name', 'destination_name', 'invoice_number', 'volume', 'weight', 'gross_weight', 'value'].includes(colKey)
  const isSecondary = ['canhoto', 'nfd_status', 'status', 'motivo'].includes(colKey)
  const isNeutral = value === 'N/A' || value === 'Aguardando' || value === '-'
  const isStatusActive = colKey === 'status' && value !== 'Aguardando'

  if (isPrimary) return dataColumnStyle
  if (isStatusActive) return statusActiveStyle
  if (isSecondary) return isNeutral ? secondaryColumnStyle : dataColumnStyle
  return secondaryColumnStyle
}

export const RouteNotesTable = ({ data, onRowClick }: RouteNotesTableProps) => {
  const hasData = data && data.length > 0

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {COLUMNS.map(col => <col key={col.key} style={{ width: col.width }} />)}
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER_HEADER}`, height: '32px' }}>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={`px-3 ${getAlignClass(col.align)} truncate`}
                style={{ ...headerStyle, color: TEXT_LIGHT75 }}
                title={col.label}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!hasData ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="h-[100px] text-center text-[14px]"
                style={{ color: TEXT_LIGHT25, fontFamily: 'Inter, sans-serif' }}
              >
                Nenhuma nota fiscal vinculada a esta rota.
              </td>
            </tr>
          ) : (
            data.map(item => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'cursor-pointer hover:bg-[#f5f5f5]' : ''}
                style={{ borderBottom: `1px solid ${BORDER_ROW}`, height: '54px' }}
              >
                {COLUMNS.map(col => {
                  if (col.key === 'actions') {
                    return (
                      <td key={col.key} className="px-3 text-center">
                        <div className="flex items-center justify-center">
                          <AppIcon name="open_in_new" size={20} color={ORANGE} />
                        </div>
                      </td>
                    )
                  }

                  const value = getCellValue(col, item)
                  const cellStyle = getCellStyle(col.key, value)

                  return (
                    <td
                      key={col.key}
                      className={`px-3 ${getAlignClass(col.align)} truncate`}
                      style={cellStyle}
                      title={value}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
