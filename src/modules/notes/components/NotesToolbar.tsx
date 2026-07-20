import { useEffect, useRef, useState } from 'react'
import { PageToolbar } from '../../../shared/components'
import { MultiSelect } from '../../assign-notes/components/MultiSelect'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface NotesFilterValues {
  invoiceNumberStart: string
  invoiceNumberEnd: string
  supplierGroupIds: string[]
  supplierIds: string[]
  destinationIds: string[]
  tripNumber: string
  attemptMin: string
  attemptMax: string
  boxMin: string
  boxMax: string
  grossWeightMin: string
  grossWeightMax: string
}

export const emptyNotesFilter = (): NotesFilterValues => ({
  invoiceNumberStart: '',
  invoiceNumberEnd: '',
  supplierGroupIds: [],
  supplierIds: [],
  destinationIds: [],
  tripNumber: '',
  attemptMin: '',
  attemptMax: '',
  boxMin: '',
  boxMax: '',
  grossWeightMin: '',
  grossWeightMax: '',
})

interface SelectOption {
  value: string
  label: string
}

interface NotesToolbarProps {
  onSearch?: (term: string) => void
  searchValue?: string
  supplierGroups?: SelectOption[]
  suppliers?: SelectOption[]
  destinations?: SelectOption[]
  appliedFilters?: NotesFilterValues
  onApplyFilters?: (f: NotesFilterValues) => void
  onClearFilters?: () => void
  onAddNew?: () => void
  onImport?: () => void
  onExport?: () => void
  onExportSelected?: () => void
  loading?: boolean
  isSelectionMode?: boolean
  selectedCount?: number
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const LABEL = 'block font-semibold text-[13px] mb-[6px]'
const LABEL_STYLE = { fontFamily: 'Inter, sans-serif', color: '#0f3255' }

const INPUT =
  'h-[36px] px-3 rounded-[4px] border border-[#bdbdbd] text-[13px] text-[#2a2a2a] ' +
  'placeholder:text-[#bdbdbd] focus:outline-none focus:border-[#e67c26] bg-white w-full ' +
  'disabled:bg-[#f5f5f5] disabled:cursor-not-allowed'

// ─────────────────────────────────────────────────────────────────────────────

const isFilterActive = (f: NotesFilterValues): boolean =>
  f.invoiceNumberStart !== '' ||
  f.invoiceNumberEnd !== '' ||
  f.supplierGroupIds.length > 0 ||
  f.supplierIds.length > 0 ||
  f.destinationIds.length > 0 ||
  f.tripNumber !== '' ||
  f.attemptMin !== '' ||
  f.attemptMax !== '' ||
  f.boxMin !== '' ||
  f.boxMax !== '' ||
  f.grossWeightMin !== '' ||
  f.grossWeightMax !== ''

export const NotesToolbar = ({
  onSearch,
  searchValue = '',
  supplierGroups = [],
  suppliers = [],
  destinations = [],
  appliedFilters,
  onApplyFilters,
  onClearFilters,
  onAddNew,
  onImport,
  onExport,
  onExportSelected,
  loading = false,
  isSelectionMode = false,
  selectedCount = 0,
  pageSize,
  onPageSizeChange,
}: NotesToolbarProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, setPending] = useState<NotesFilterValues>(appliedFilters ?? emptyNotesFilter())
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sync pending com applied ao abrir
  useEffect(() => {
    if (isOpen) {
      setPending(appliedFilters ?? emptyNotesFilter())
    }
  }, [isOpen])

  // Fechar ao clicar fora ou pressionar Escape
  // Os dropdowns MultiSelect usam portal (renderizam em document.body), por isso
  // verificamos se o clique está dentro de qualquer elemento marcado com data-notes-filter-portal.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    const onMouse = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      // Ignora cliques dentro de portais dos MultiSelect deste filtro
      const portals = document.querySelectorAll('[data-notes-filter-portal]')
      for (const portal of portals) {
        if (portal.contains(target)) return
      }
      setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const set = (field: keyof NotesFilterValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setPending(prev => ({ ...prev, [field]: e.target.value }))

  const handleApply = () => {
    onApplyFilters?.(pending)
    setIsOpen(false)
  }

  const handleClear = () => {
    const empty = emptyNotesFilter()
    setPending(empty)
    onClearFilters?.()
    setIsOpen(false)
  }

  const active = isOpen || isFilterActive(appliedFilters ?? emptyNotesFilter())

  const exportActions: Array<{
    label: string
    icon?: 'upload'
    variant: 'default'
    onClick: () => void
    disabled?: boolean
  }> = []
  if (isSelectionMode && onExportSelected) {
    exportActions.push({
      label: selectedCount > 0 ? `Exportar Selecionados (${selectedCount})` : 'Exportar Selecionados',
      icon: 'upload',
      variant: 'default',
      onClick: onExportSelected,
      disabled: selectedCount === 0 || loading,
    })
  } else if (!isSelectionMode && onExport) {
    exportActions.push({
      label: 'Exportar',
      icon: 'upload',
      variant: 'default',
      onClick: onExport,
      disabled: loading,
    })
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <PageToolbar
        search={{
          placeholder: 'Busque uma nota...',
          value: searchValue,
          onChange: (v) => onSearch?.(v),
          onSearch: (v) => onSearch?.(v),
          width: '360px',
        }}
        filters={[{ isActive: active, onClick: () => setIsOpen(p => !p) }]}
        pageSize={
          pageSize != null && onPageSizeChange
            ? { value: pageSize, options: [20, 50, 100], onChange: onPageSizeChange }
            : undefined
        }
        actions={[
          ...(onImport
            ? [{ label: 'Importar', icon: 'download' as const, variant: 'default' as const, onClick: onImport, disabled: isSelectionMode || loading }]
            : []),
          ...exportActions,
          { label: 'Adicionar Novo', icon: 'add_circle' as const, variant: 'primary' as const, onClick: onAddNew || (() => {}), disabled: isSelectionMode || loading },
        ]}
        loading={loading}
      />

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 z-50 flex flex-col bg-white border border-[#bdbdbd] rounded-[5px] shadow-lg"
          style={{ width: '480px' }}
        >
          <div
            className="flex flex-col gap-4 p-4 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {/* Nº Nota */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Nº Nota</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    placeholder="Inicial"
                    value={pending.invoiceNumberStart}
                    onChange={set('invoiceNumberStart')}
                    className={INPUT}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Final"
                    value={pending.invoiceNumberEnd}
                    onChange={set('invoiceNumberEnd')}
                    className={INPUT}
                  />
                </div>
              </div>
            </div>

            {/* Grupo Fornecedor */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Grupo Fornecedor</span>
              <MultiSelect
                options={supplierGroups}
                value={pending.supplierGroupIds}
                onChange={(v) => setPending(prev => ({ ...prev, supplierGroupIds: v }))}
                placeholder={supplierGroups.length === 0 ? 'Carregando...' : 'Selecione o grupo...'}
                disabled={supplierGroups.length === 0}
                portalProps={{ 'data-notes-filter-portal': '' } as React.HTMLAttributes<HTMLDivElement>}
              />
            </div>

            {/* Fornecedor */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Fornecedor</span>
              <MultiSelect
                options={suppliers}
                value={pending.supplierIds}
                onChange={(v) => setPending(prev => ({ ...prev, supplierIds: v }))}
                placeholder={suppliers.length === 0 ? 'Carregando...' : 'Selecione o fornecedor...'}
                disabled={suppliers.length === 0}
                portalProps={{ 'data-notes-filter-portal': '' } as React.HTMLAttributes<HTMLDivElement>}
              />
            </div>

            {/* Destino */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Destino</span>
              <MultiSelect
                options={destinations}
                value={pending.destinationIds}
                onChange={(v) => setPending(prev => ({ ...prev, destinationIds: v }))}
                placeholder={destinations.length === 0 ? 'Carregando...' : 'Selecione o destino...'}
                disabled={destinations.length === 0}
                portalProps={{ 'data-notes-filter-portal': '' } as React.HTMLAttributes<HTMLDivElement>}
              />
            </div>

            {/* Nº Viagem */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Nº Viagem</span>
              <input
                type="text"
                placeholder="Ex: 1234"
                value={pending.tripNumber}
                onChange={set('tripNumber')}
                className={INPUT}
              />
            </div>

            {/* Nº Tentativa */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Nº Tentativa</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Mínima"
                    value={pending.attemptMin}
                    onChange={set('attemptMin')}
                    className={INPUT}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Máxima"
                    value={pending.attemptMax}
                    onChange={set('attemptMax')}
                    className={INPUT}
                  />
                </div>
              </div>
            </div>

            {/* Caixas */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Caixas</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Mínimo"
                    value={pending.boxMin}
                    onChange={set('boxMin')}
                    className={INPUT}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Máximo"
                    value={pending.boxMax}
                    onChange={set('boxMax')}
                    className={INPUT}
                  />
                </div>
              </div>
            </div>

            {/* Peso Bruto */}
            <div>
              <span className={LABEL} style={LABEL_STYLE}>Peso Bruto (kg)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="Ex: 1,5"
                    value={pending.grossWeightMin}
                    onChange={set('grossWeightMin')}
                    className={INPUT}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Ex: 100"
                    value={pending.grossWeightMax}
                    onChange={set('grossWeightMax')}
                    className={INPUT}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer — padrão Cargos */}
          <div className="flex justify-between p-4 border-t border-[#e0e0e0]">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center rounded-[4px] border border-[#e67c26] bg-white w-[150px] h-[45px]"
            >
              <span
                className="font-bold text-[13px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}
              >
                Limpar Filtro
              </span>
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center justify-center rounded-[4px] bg-[#e67c26] w-[150px] h-[45px]"
            >
              <span
                className="font-bold text-[13px]"
                style={{ fontFamily: 'Inter, sans-serif', color: 'white' }}
              >
                Filtrar
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
