import { useState } from 'react'
import { PageToolbar } from '../../../shared/components'

export interface NoteByRouteData {
  id: string
  route_code: string
  route_number: string
  invoice_number: string
  supplier_name: string
  destination_name: string
  vehicle_plate: string
  driver_name: string
  gross_weight: number
  invoice_value: number
  delivery_status: string
  motivo?: string
  attempt_number?: number
}

interface RoutesByNotesToolbarProps {
  onExport?: () => void
  onExportSelected?: () => void
  isSelectionMode?: boolean
  selectedCount?: number
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

export const RoutesByNotesToolbar = ({
  onExport,
  onExportSelected,
  isSelectionMode = false,
  selectedCount = 0,
  pageSize,
  onPageSizeChange,
}: RoutesByNotesToolbarProps) => {
  return (
    <PageToolbar
      search={undefined}
      filters={[]}
      pageSize={
        pageSize != null && onPageSizeChange
          ? { value: pageSize, options: [20, 50, 100], onChange: onPageSizeChange }
          : undefined
      }
      actions={[
        ...(isSelectionMode && onExportSelected
          ? [{
              label: selectedCount > 0 ? `Exportar Selecionados (${selectedCount})` : 'Exportar Selecionados',
              icon: 'upload',
              variant: 'default' as const,
              onClick: onExportSelected,
              disabled: selectedCount === 0
            }]
          : (!isSelectionMode && onExport
            ? [{ label: 'Exportar', icon: 'upload', variant: 'default' as const, onClick: onExport }]
            : []))
      ]}
    />
  )
}