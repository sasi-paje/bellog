import { useState, useEffect, useRef } from 'react'
import { Toast, MultiSelectDropdown } from '../../../shared/components'
import { InvoiceListItem } from '../../../features/notes'

interface Option {
  value: string
  label: string
  color?: string
}

interface ExportNotesModalProps {
  isOpen: boolean
  onClose: () => void
  onExported?: () => void
  notes: InvoiceListItem[]
  title?: string
}

const PRIMARY_DARK = '#0f3255'
const TEXT_LIGHT25 = '#919191'
const ORANGE_ACCENT = '#e67c26'

// Mesma ordem e colunas da tabela de Notas (NotesTable)
const COLUMN_OPTIONS: Option[] = [
  { value: 'supplier_group_name', label: 'Grupo Fornecedor' },
  { value: 'supplier_name', label: 'Fornecedor' },
  { value: 'tripNumber', label: 'Nº Viagem' },
  { value: 'invoice_number', label: 'NF' },
  { value: 'destination_name', label: 'Destino' },
  { value: 'city', label: 'Cidade' },
  { value: 'attempt_number', label: 'Nº Tentativas' },
  { value: 'volume', label: 'Caixas' },
  { value: 'weight', label: 'Peso Líquido' },
  { value: 'gross_weight', label: 'Peso Bruto' },
  { value: 'value', label: 'Valor da Nota' },
  { value: 'status', label: 'Status' },
]

const getStatusText = (note: InvoiceListItem): string => {
  if (!note.is_active) return 'Cancelada'
  if (note.route_number) return 'Em Trânsito'
  return 'Pendente'
}

export const ExportNotesModal = ({ isOpen, onClose, onExported, notes, title = 'Selecionar Colunas para exportar' }: ExportNotesModalProps) => {
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
            case 'supplier_group_name':
              value = note.supplier_group_name || ''
              break
            case 'supplier_name':
              value = note.supplier_name || ''
              break
            case 'tripNumber':
              value = note.tripNumber || ''
              break
            case 'invoice_number':
              value = note.invoice_number || ''
              break
            case 'destination_name':
              value = note.destination_name || ''
              break
            case 'city':
              value = note.city || ''
              break
            case 'attempt_number':
              value = note.attempt_number?.toString() || ''
              break
            case 'volume':
              value = note.volume?.toString() || ''
              break
            case 'weight':
              // Número puro (1 casa). O ';' + conversão de '.'→',' abaixo faz a
              // planilha (pt-BR) tratar como número, sem a unidade "kg".
              value = note.weight ? note.weight.toFixed(1) : ''
              break
            case 'gross_weight':
              value = note.gross_weight ? note.gross_weight.toFixed(1) : ''
              break
            case 'value':
              // Número puro (2 casas), sem "R$" e sem separador de milhar,
              // para ser interpretado como número na planilha.
              value = note.value ? note.value.toFixed(2) : ''
              break
            case 'status':
              value = getStatusText(note)
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
      link.download = `notas_export_${new Date().toISOString().split('T')[0]}.csv`
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
      console.error('[ExportNotesModal] Export error:', error)
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

export default ExportNotesModal
