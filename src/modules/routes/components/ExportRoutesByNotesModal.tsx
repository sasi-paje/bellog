import { useState, useEffect, useRef } from 'react'
import { Toast, MultiSelectDropdown } from '../../../shared/components'
import { NoteByRouteData } from './RoutesByNotesToolbar'

interface Option {
  value: string
  label: string
  color?: string
}

interface ExportRoutesByNotesModalProps {
  isOpen: boolean
  onClose: () => void
  onExported?: () => void
  notes: NoteByRouteData[]
  title?: string
}

const PRIMARY_DARK = '#0f3255'
const TEXT_LIGHT25 = '#919191'
const ORANGE_ACCENT = '#e67c26'

const COLUMN_OPTIONS: Option[] = [
  { value: 'route_code', label: 'N° Rota' },
  { value: 'route_number', label: 'Nº Viagem' },
  { value: 'invoice_number', label: 'N° Nota' },
  { value: 'supplier_name', label: 'Fornecedor' },
  { value: 'destination_name', label: 'Destino' },
  { value: 'vehicle_plate', label: 'Veículo' },
  { value: 'driver_name', label: 'Motorista' },
  { value: 'gross_weight', label: 'Peso Bruto' },
  { value: 'invoice_value', label: 'Valor da Nota' },
  { value: 'delivery_status', label: 'Status de Entrega' },
  { value: 'motivo', label: 'Motivo' },
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const formatDate = (dateStr: string | undefined): string => {
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

const formatWeight = (weight?: number): string => {
  if (!weight) return ''
  return weight.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' kg'
}

export const ExportRoutesByNotesModal = ({ isOpen, onClose, onExported, notes, title = 'Selecionar Colunas para exportar' }: ExportRoutesByNotesModalProps) => {
  const [selectedColumns, setSelectedColumns] = useState<Option[]>(COLUMN_OPTIONS)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success')
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedColumns(COLUMN_OPTIONS)
    }
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [isOpen])

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message)
    setShowToast(true)
    setToastType(type)
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false)
    }, 4000)
  }

  const exportToCSV = async () => {
    try {
      if (!notes || notes.length === 0) {
        showToastMessage('Nenhuma nota disponível para exportar', 'warning')
        return
      }

      if (selectedColumns.length === 0) {
        showToastMessage('Selecione pelo menos uma coluna para exportar', 'warning')
        return
      }

      const selectedKeys = selectedColumns.map(col => col.value)
      const headers = selectedColumns.map(col => col.label)
      const csvRows: string[][] = []

      for (const note of notes) {
        const row: string[] = []

        for (const key of selectedKeys) {
          let value = ''

          switch (key) {
            case 'route_code':
              value = note.route_code || ''
              break
            case 'route_number':
              value = note.route_number || ''
              break
            case 'invoice_number':
              value = note.invoice_number || ''
              break
            case 'supplier_name':
              value = note.supplier_name || ''
              break
            case 'destination_name':
              value = note.destination_name || ''
              break
            case 'vehicle_plate':
              value = note.vehicle_plate || ''
              break
            case 'driver_name':
              value = note.driver_name || ''
              break
            case 'gross_weight':
              value = formatWeight(note.gross_weight)
              break
            case 'invoice_value':
              value = formatCurrency(note.invoice_value)
              break
            case 'delivery_status':
              value = note.delivery_status || ''
              break
            case 'motivo':
              value = note.motivo || ''
              break
            default:
              value = ''
          }

          row.push(value)
        }

        csvRows.push(row)
      }

      if (csvRows.length === 0) {
        showToastMessage('Nenhuma linha para exportar', 'warning')
        return
      }

      const csvContent = '﻿' + [
        headers.join(';'),
        ...csvRows.map(row =>
          row.map(cell => cell.replace(/\./g, ',')).join(';')
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `rotas_por_notas_export_${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const noteCount = notes.length
      const columnCount = selectedColumns.length
      showToastMessage(
        `Exportação concluída! ${noteCount} nota${noteCount !== 1 ? 's' : ''} e ${columnCount} coluna${columnCount !== 1 ? 's' : ''} exportadas com sucesso`,
        'success'
      )

      setTimeout(() => {
        // Após exportar com sucesso, encerra o fluxo de exportação
        if (onExported) onExported()
        else onClose()
      }, 1500)
    } catch (error) {
      console.error('[ExportRoutesByNotesModal] Export error:', error)
      showToastMessage('Erro ao exportar os dados. Tente novamente.', 'error')
    }
  }

  const handleExport = () => {
    exportToCSV()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-white rounded-[5px] shadow-xl flex flex-col"
        style={{ width: '590px', padding: '24px' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-bold text-[18px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
            {title}
          </span>
          <span className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
            {notes?.length || 0} nota{(notes?.length || 0) !== 1 ? 's' : ''} para exportar
          </span>
        </div>

        <div className="border-b border-[#e0e0e0] mb-4" />

        <div className="mb-4">
          <MultiSelectDropdown
            label="Colunas"
            options={COLUMN_OPTIONS}
            selectedOptions={selectedColumns}
            onChange={setSelectedColumns}
          />
        </div>

        <div className="border-t border-[#e0e0e0] mb-4" />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: '120px',
              height: '36px',
              border: `1px solid ${ORANGE_ACCENT}`,
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
          >
            <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_ACCENT }}>
              Voltar
            </span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={selectedColumns.length === 0 || !notes || notes.length === 0}
            className="flex items-center justify-center"
            style={{
              width: '120px',
              height: '36px',
              borderRadius: '4px',
              backgroundColor: selectedColumns.length === 0 ? '#cccccc' : ORANGE_ACCENT,
              border: selectedColumns.length === 0 ? '1px solid #cccccc' : 'none',
              cursor: selectedColumns.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedColumns.length === 0 ? 0.6 : 1,
            }}
          >
            <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: selectedColumns.length === 0 ? '#666666' : 'white' }}>
              Exportar
            </span>
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <Toast message={toastMessage} type={toastType} />
        </div>
      )}
    </div>
  )
}

export default ExportRoutesByNotesModal