interface ExportColumn {
  key: string
  label: string
}

interface ExportPayload {
  invoices: any[]
  columns: ExportColumn[]
  fileName: string
}

function formatCell(invoice: any, column: ExportColumn): string {
  switch (column.key) {
    case 'invoice_number':
      return invoice.invoice_number || ''
    case 'supplier_name':
      return invoice.supplier_trade_name || invoice.supplier_name || ''
    case 'destination_name':
      return invoice.destination_trade_name || invoice.destination_name || ''
    case 'tripNumber':
    case 'trip_number':
      return invoice.tripNumber || invoice.trip_number || ''
    case 'attempt_number':
      return String(invoice.attempt_number ?? '')
    case 'volume':
    case 'box_quantity':
      return String(invoice.box_quantity ?? invoice.volume ?? '')
    case 'weight':
    case 'net_weight':
      return invoice.net_weight ? `${invoice.net_weight.toFixed(1)} kg` : ''
    case 'gross_weight':
      return invoice.gross_weight ? `${invoice.gross_weight.toFixed(1)} kg` : ''
    case 'value':
    case 'invoice_amount':
      return invoice.invoice_amount ? formatCurrency(invoice.invoice_amount) : ''
    case 'status':
      return invoice.computed_status || getStatusText(invoice)
    case 'issue_date':
    case 'invoice_issue_date':
      return formatDate(invoice.invoice_issue_date || invoice.issue_date)
    default:
      const value = invoice[column.key]
      return value?.toString() ?? ''
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
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

function getStatusText(invoice: any): string {
  if (!invoice.is_active) return 'Cancelada'
  if (invoice.route_code || invoice.route_id) return 'Em Trânsito'
  return 'Pendente'
}

function* generateRows(invoices: any[], columns: ExportColumn[]): Generator<string[]> {
  for (const invoice of invoices) {
    const row = columns.map(col => {
      const value = formatCell(invoice, col)
      if (typeof value === 'string') {
        return value.replace(/;/g, ',').replace(/\n/g, ' ')
      }
      return value
    })
    yield row
  }
}

function chunkArray<T>(array: Iterable<T>, chunkSize: number): T[][] {
  const chunks: T[][] = []
  let chunk: T[] = []

  for (const item of array) {
    chunk.push(item)
    if (chunk.length === chunkSize) {
      chunks.push(chunk)
      chunk = []
    }
  }

  if (chunk.length > 0) {
    chunks.push(chunk)
  }

  return chunks
}

self.onmessage = async ({ data }: MessageEvent) => {
  const { type, payload } = data

  if (type === 'EXPORT_CSV') {
    try {
      const { invoices, columns, fileName } = payload as ExportPayload

      if (!invoices || invoices.length === 0) {
        self.postMessage({ type: 'ERROR', error: 'No data to export' })
        return
      }

      let csvContent = '\uFEFF'

      const headers = columns.map(col => col.label)
      csvContent += headers.join(';') + '\n'

      self.postMessage({ type: 'PROGRESS', progress: 0 })

      const rowsGenerator = generateRows(invoices, columns)
      let processed = 0
      const chunkSize = 500

      for (const chunk of chunkArray(rowsGenerator, chunkSize)) {
        for (const row of chunk) {
          csvContent += row.join(';') + '\n'
        }

        processed += chunk.length
        const progress = Math.round((processed / invoices.length) * 100)
        self.postMessage({ type: 'PROGRESS', progress })
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })

      self.postMessage({
        type: 'COMPLETE',
        blob,
        fileName: fileName || `notas_export_${new Date().toISOString().split('T')[0]}.csv`,
      })
    } catch (error) {
      self.postMessage({ type: 'ERROR', error: (error as Error).message })
    }
  }
}

export {}
