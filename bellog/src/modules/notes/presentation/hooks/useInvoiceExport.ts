import { useState, useCallback, useRef, useEffect } from 'react'
import { InvoiceViewModel } from '../domain/entities/Invoice'

interface ExportColumn {
  key: string
  label: string
}

const DEFAULT_COLUMNS: ExportColumn[] = [
  { key: 'invoice_number', label: 'N° Nota' },
  { key: 'supplier_name', label: 'Fornecedor' },
  { key: 'destination_name', label: 'Destino' },
  { key: 'tripNumber', label: 'Nº Viagem' },
  { key: 'attempt_number', label: 'Nº Tentativa' },
  { key: 'box_quantity', label: 'Caixas' },
  { key: 'net_weight', label: 'Peso Líquido' },
  { key: 'gross_weight', label: 'Peso Bruto' },
  { key: 'invoice_amount', label: 'Valor' },
  { key: 'computed_status', label: 'Status' },
  { key: 'invoice_issue_date', label: 'Data Emissão' },
]

export function useInvoiceExport() {
  const [progress, setProgress] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const exportToCSV = useCallback(async (
    invoices: InvoiceViewModel[],
    columns: ExportColumn[] = DEFAULT_COLUMNS,
    fileName?: string
  ) => {
    if (invoices.length === 0) {
      setError('Nenhuma nota para exportar')
      return false
    }

    setIsExporting(true)
    setProgress(0)
    setError(null)

    try {
      workerRef.current = new Worker(
        new URL('../workers/exportWorker.ts', import.meta.url),
        { type: 'module' }
      )

      return new Promise<boolean>((resolve) => {
        if (!workerRef.current) {
          setError('Falha ao criar worker de exportação')
          setIsExporting(false)
          resolve(false)
          return
        }

        workerRef.current.onmessage = ({ data }) => {
          switch (data.type) {
            case 'PROGRESS':
              setProgress(data.progress)
              break
            case 'COMPLETE':
              const url = URL.createObjectURL(data.blob)
              const link = document.createElement('a')
              link.href = url
              link.download = data.fileName
              link.click()
              URL.revokeObjectURL(url)
              setIsExporting(false)
              setProgress(100)
              resolve(true)
              break
            case 'ERROR':
              setError(data.error)
              setIsExporting(false)
              resolve(false)
              break
          }
        }

        workerRef.current.onerror = (err) => {
          setError('Erro no worker de exportação')
          setIsExporting(false)
          resolve(false)
        }

        workerRef.current.postMessage({
          type: 'EXPORT_CSV',
          payload: {
            invoices: invoices.map(inv => ({
              ...inv,
              supplier_name: inv.supplier_trade_name,
              destination_name: inv.destination_trade_name,
              box_quantity: inv.box_quantity,
              net_weight: inv.net_weight,
              gross_weight: inv.gross_weight,
              invoice_amount: inv.invoice_amount,
              computed_status: inv.computed_status,
              tripNumber: inv.tripNumber,
            })),
            columns,
            fileName: fileName ?? `notas_export_${new Date().toISOString().split('T')[0]}.csv`,
          },
        })
      })
    } catch (err) {
      setError((err as Error).message)
      setIsExporting(false)
      return false
    }
  }, [])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  return {
    exportToCSV,
    progress,
    isExporting,
    error,
  }
}
