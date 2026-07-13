import { useState, useEffect, useRef } from 'react'
import { AppIcon, Toast, MultiSelectDropdown } from '../../../shared/components'
import { fiscalInvoiceService } from '../../../features/notes'

interface RouteData {
  id: string
  route_code?: string
  departure_date?: string
  area_description?: string
  vehicle_plate?: string
  responsible_names?: string[]
  driver_names?: string[]
  assistant?: string[]
  destinations?: string[]
  vehicle_max_capacity?: number
  current_load?: number
  delivery_status_description?: string
  starts_at?: string
  ends_at?: string
  status_description?: string
}

interface Option {
  value: string
  label: string
  color?: string
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExported?: () => void
  routes: RouteData[]
  title?: string
}

const PRIMARY_DARK = '#0f3255'
const TEXT_LIGHT25 = '#919191'
const ORANGE_ACCENT = '#e67c26'

// Available columns for export
const COLUMN_OPTIONS: Option[] = [
  { value: 'route_code', label: 'Número da rota' },
  { value: 'departure_date', label: 'Saída' },
  { value: 'area_description', label: 'Área da Rota' },
  { value: 'vehicle_plate', label: 'Placa' },
  { value: 'responsible_names', label: 'Responsável' },
  { value: 'driver_names', label: 'Motorista' },
  { value: 'assistant', label: 'Ajudantes' },
  { value: 'destinations', label: 'Destino' },
  { value: 'vehicle_max_capacity', label: 'Carga Máxima' },
  { value: 'current_load', label: 'Carga Real' },
  { value: 'utilizacao', label: 'Utilização' },
  { value: 'delivery_status_description', label: 'Status de Entrega' },
  { value: 'starts_at', label: 'Início da Rota' },
  { value: 'ends_at', label: 'Fim da Rota' },
  { value: 'status_description', label: 'Status' },
]

export const ExportModal = ({ isOpen, onClose, onExported, routes, title = 'Selecionar Colunas para exportar' }: ExportModalProps) => {
  const [selectedColumns, setSelectedColumns] = useState<Option[]>(COLUMN_OPTIONS)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
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

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return ''
    // Safe format for DATE-only fields (yyyy-mm-dd) to avoid timezone issues
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

  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success')

  const exportToCSV = async () => {
    try {
      if (!routes || routes.length === 0) {
        showToastMessage('Nenhuma rota disponível para exportar', 'warning')
        return
      }

      if (selectedColumns.length === 0) {
        showToastMessage('Selecione pelo menos uma coluna para exportar', 'warning')
        return
      }

      const selectedKeys = selectedColumns.map(col => col.value)
      const headers = selectedColumns.map(col => col.label)
      const csvRows: string[][] = []

      // Busca as notas de cada rota para montar uma linha por nota. O
      // destination_name já vem como nome de exibição (trade_name ?? legal_name).
      // N+1 query aceitável: exportação é uma ação pontual sobre uma seleção
      // limitada de rotas.
      const notesByRoute = await Promise.all(
        routes.map(async (route) => {
          try {
            return await fiscalInvoiceService.getByRouteId(route.id)
          } catch (err) {
            console.error('[ExportModal] Erro ao buscar notas da rota', route.id, err)
            return []
          }
        })
      )

      // Monta o valor de uma coluna para o par (rota, nota). Apenas a coluna
      // "destinations" depende da nota; as demais repetem os dados da rota.
      // Força o valor a ser interpretado como TEXTO na planilha (Excel, Google
      // Sheets, LibreOffice) via fórmula ="valor". Sem isso, "001" vira o
      // número 1 e os zeros à esquerda são perdidos. Aspas internas são
      // duplicadas conforme a sintaxe de string de fórmula.
      const asSpreadsheetText = (value: string): string =>
        value ? `="${value.replace(/"/g, '""')}"` : ''

      const buildValue = (key: string, route: RouteData, note: { destination_name?: string } | null): string => {
        switch (key) {
          case 'route_code':
            // Número da rota exportado exatamente como no sistema (com zeros à esquerda)
            return asSpreadsheetText(route.route_code || '')
          case 'departure_date':
            return formatDate(route.departure_date)
          case 'area_description':
            return route.area_description || ''
          case 'vehicle_plate':
            return route.vehicle_plate || ''
          case 'responsible_names':
            return route.responsible_names?.join(', ') || ''
          case 'driver_names':
            return route.driver_names?.join(', ') || ''
          case 'assistant':
            return route.assistant?.join(', ') || ''
          case 'destinations':
            return note?.destination_name || ''
          case 'vehicle_max_capacity':
            return route.vehicle_max_capacity ? `${route.vehicle_max_capacity} kg` : ''
          case 'current_load':
            return route.current_load ? `${route.current_load} kg` : ''
          case 'utilizacao':
            if (route.vehicle_max_capacity && route.current_load) {
              const pct = Math.round((route.current_load / route.vehicle_max_capacity) * 100)
              return `${pct}%`
            }
            return ''
          case 'delivery_status_description':
            return route.delivery_status_description || ''
          case 'starts_at':
            return route.starts_at ? formatDate(route.starts_at) : ''
          case 'ends_at':
            return route.ends_at ? formatDate(route.ends_at) : ''
          case 'status_description':
            return route.status_description || ''
          default:
            return ''
        }
      }

      routes.forEach((route, index) => {
        const notes = notesByRoute[index] || []
        // Rota sem notas: emite uma linha com o destino vazio para não perder a rota.
        const rowNotes: ({ destination_name?: string } | null)[] = notes.length > 0 ? notes : [null]
        for (const note of rowNotes) {
          csvRows.push(selectedKeys.map((key) => buildValue(key, route, note)))
        }
      })

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
      link.download = `rotas_export_${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const routeCount = routes.length
      const lineCount = csvRows.length
      showToastMessage(
        `Exportação concluída! ${routeCount} rota${routeCount !== 1 ? 's' : ''} em ${lineCount} linha${lineCount !== 1 ? 's' : ''} (uma por nota) exportadas com sucesso`,
        'success'
      )

      setTimeout(() => {
        // Após exportar com sucesso, encerra o fluxo de exportação
        if (onExported) onExported()
        else onClose()
      }, 1500)
    } catch (error) {
      console.error('[ExportModal] Export error:', error)
      showToastMessage('Erro ao exportar os dados. Tente novamente.', 'error')
    }
  }

  const handleExport = () => {
    exportToCSV()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-[5px] shadow-xl flex flex-col"
        style={{ width: '590px', padding: '24px' }}
      >
        {/* Título */}
        <div className="mb-4 flex items-center justify-between">
          <span className="font-bold text-[18px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
            {title}
          </span>
          <span className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
            {routes?.length || 0} rota{(routes?.length || 0) !== 1 ? 's' : ''} para exportar
          </span>
        </div>

        {/* Linha divisória */}
        <div className="border-b border-[#e0e0e0] mb-4" />

        {/* Campo de Colunas */}
        <div className="mb-4">
          <MultiSelectDropdown
            label="Colunas"
            options={COLUMN_OPTIONS}
            selectedOptions={selectedColumns}
            onChange={setSelectedColumns}
          />
        </div>

        {/* Linha divisória acima do footer */}
        <div className="border-t border-[#e0e0e0] mb-4" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Voltar button */}
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

          {/* Exportar button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedColumns.length === 0 || !routes || routes.length === 0}
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

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <Toast message={toastMessage} type="success" />
        </div>
      )}
    </div>
  )
}

export default ExportModal