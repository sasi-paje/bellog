import { useState } from 'react'
import { PageToolbar } from '../../../shared/components'

interface NotesToolbarProps {
  onSearch?: (term: string) => void
  searchValue?: string
  onToggleCancelled?: (show: boolean) => void
  showCancelled?: boolean
  onAddNew?: () => void
  onImport?: () => void
  onExport?: () => void
  onExportSelected?: () => void
  loading?: boolean
  isSelectionMode?: boolean
  selectedCount?: number
}

export const NotesToolbar = ({
  onSearch,
  searchValue = '',
  onToggleCancelled,
  showCancelled = false,
  onAddNew,
  onImport,
  onExport,
  onExportSelected,
  loading = false,
  isSelectionMode = false,
  selectedCount = 0,
}: NotesToolbarProps) => {
  const [localSearch, setLocalSearch] = useState(searchValue)

  const handleSearch = (value: string) => {
    setLocalSearch(value)
    onSearch?.(value)
  }

  return (
    <PageToolbar
      search={{
        placeholder: 'Busque uma nota...',
        value: localSearch,
        onChange: setLocalSearch,
        onSearch: handleSearch,
        width: '360px',
      }}
      filters={
        onToggleCancelled
          ? [{ isActive: showCancelled, onClick: () => onToggleCancelled?.(!showCancelled) }]
          : []
      }
      actions={[
        ...(onImport
          ? [{ label: 'Importar', icon: 'download', variant: 'default' as const, onClick: onImport, disabled: isSelectionMode }]
          : []),
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
            : [])),
        { label: 'Adicionar Novo', icon: 'add_circle', variant: 'primary' as const, onClick: onAddNew || (() => {}), disabled: isSelectionMode },
      ]}
    />
  )
}
