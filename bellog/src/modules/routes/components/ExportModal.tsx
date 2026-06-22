import { useState, useEffect, useRef } from 'react'
import { AppIcon, Toast, MultiSelectDropdown } from '../../../shared/components'
import { getEnvironment } from '../../../lib/supabase'

interface RouteData {
  id: string
  route_code?: string
  departure_date?: string
  area_description?: string
  vehicle_plate?: string
  responsible_names?: string[]
  driver_names?: string[]
  destinations?: string[]
  vehicle_max_capacity?: number
  current_load?: number
  delivery_status_description?: string
  starts_at?: string
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
  { value: 'destinations', label: 'Destinos' },
  { value: 'vehicle_max_capacity', label: 'Carga Máxima' },
  { value: 'current_load', label: 'Carga Real' },
  { value: 'utilizacao', label: 'Utilização' },
  { value: 'delivery_status_description', label: 'Status de Entrega' },
  { value: 'starts_at', label: 'Início da Rota' },
  { value: 'status_description', label: 'Status' },
]

export const ExportModal = ({ isOpen, onClose, routes, title = 'Selecionar Colunas para exportar' }: ExportModalProps) => {
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

      for (const route of routes) {
        const row: string[] = []

        for (const key of selectedKeys) {
          let value = ''

          switch (key) {
            case 'route_code':
              value = route.route_code || ''
              break
            case 'departure_date':
              value = formatDate(route.departure_date)
              break
            case 'area_description':
              value = route.area_description || ''
              break
            case 'vehicle_plate':
              value = route.vehicle_plate || ''
              break
            case 'responsible_names':
              value = route.responsible_names?.join(', ') || ''
              break
            case 'driver_names':
              value = route.driver_names?.join(', ') || ''
              break
            case 'destinations':
              value = route.destinations?.length?.toString() || '0'
              break
            case 'vehicle_max_capacity':
              value = route.vehicle_max_capacity ? `${route.vehicle_max_capacity} kg` : ''
              break
            case 'current_load':
              value = route.current_load ? `${route.current_load} kg` : ''
              break
            case 'utilizacao':
              if (route.vehicle_max_capacity && route.current_load) {
                const pct = Math.round((route.current_load / route.vehicle_max_capacity) * 100)
                value = `${pct}%`
              }
              break
            case 'delivery_status_description':
              value = route.delivery_status_description || ''
              break
            case 'starts_at':
              value = route.starts_at ? formatDate(route.starts_at) : ''
              break
            case 'status_description':
              value = route.status_description || ''
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
      link.download = `rotas_export_${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const routeCount = routes.length
      const columnCount = selectedColumns.length
      showToastMessage(
        `Exportação concluída! ${routeCount} rota${routeCount !== 1 ? 's' : ''} e ${columnCount} coluna${columnCount !== 1 ? 's' : ''} exportadas com sucesso`,
        'success'
      )

      setTimeout(() => {
        onClose()
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