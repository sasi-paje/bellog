import { useState, useEffect, useRef } from 'react'
import { AppIcon, FormDropdown, ToolbarButton } from '../../../shared/components'
import { ReasonType, ReasonCategory } from '../../../hooks/useMotivos'

export interface RecusasFilterData {
  ordenar: 'categoria' | 'tipo' | ''
  tipoEntrega: string
  categoria: string
}

export const EMPTY_RECUSAS_FILTERS: RecusasFilterData = {
  ordenar: 'categoria',
  tipoEntrega: '',
  categoria: '',
}

interface RecusasToolbarProps {
  onSearch?: (term: string) => void
  onAddNew?: () => void
  onBack?: () => void
  onFilter?: (filters: RecusasFilterData) => void
  initialSearch?: string
  reasonTypes: ReasonType[]
  reasonCategories: ReasonCategory[]
}

const PRIMARY_DARK = '#0f3255'
const ORANGE = '#e67c26'

export const RecusasToolbar = ({
  onSearch,
  onAddNew,
  onBack,
  onFilter,
  initialSearch = '',
  reasonTypes,
  reasonCategories,
}: RecusasToolbarProps) => {
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<RecusasFilterData>(EMPTY_RECUSAS_FILTERS)
  const filterWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showFilters) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilters(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilters])

  const handleSearch = () => onSearch?.(searchValue)

  const set = (field: keyof RecusasFilterData) => (value: string) =>
    setFilters(prev => ({ ...prev, [field]: value }))

  const handleClearFilters = () => {
    setFilters(EMPTY_RECUSAS_FILTERS)
    onFilter?.(EMPTY_RECUSAS_FILTERS)
  }

  const handleApplyFilters = () => {
    onFilter?.(filters)
    setShowFilters(false)
  }

  const tipoOptions = [
    { value: '', label: 'Selecione o tipo' },
    ...reasonTypes.map(t => ({ value: String(t.id), label: t.name ?? t.description ?? String(t.id) })),
  ]

  const categoriaOptions = [
    { value: '', label: 'Selecione a categoria' },
    ...reasonCategories.map(c => ({ value: String(c.id), label: c.name ?? String(c.id) })),
  ]

  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2">
      {/* Left: Search + Filter */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-[360px]">
          <input
            type="text"
            placeholder="Busque por motivo..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full h-[40px] px-3 pr-12 border border-[#bdbdbd] rounded-[5px] bg-[#f9f9f9] text-[14px] font-normal"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="absolute right-0 top-0 h-full px-3 bg-[#e67c26] rounded-br-[4px] rounded-tr-[4px] flex items-center justify-center"
          >
            <AppIcon name="search" size={20} color="white" />
          </button>
        </div>

        {/* Filter Button + Popup */}
        <div className="relative" ref={filterWrapperRef}>
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className="w-[40px] h-[40px] border border-[#e67c26] rounded-[5px] flex items-center justify-center bg-white"
            aria-label="Filtros avançados"
          >
            <AppIcon name="filter_alt" size={20} color={ORANGE} />
          </button>

          {showFilters && (
            <div
              className="absolute top-full left-0 mt-2 z-[9999] flex flex-col bg-white border border-[#bdbdbd] rounded-[5px] shadow-lg"
              style={{ width: 'min(560px, calc(100vw - 32px))' }}
            >
              {/* Ordenação */}
              <div className="p-4">
                <span
                  className="font-semibold text-[14px] mb-2 block"
                  style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
                >
                  Ordenação
                </span>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => set('ordenar')(filters.ordenar === 'categoria' ? '' : 'categoria')}
                    className="flex-1 flex items-center justify-center rounded-l-[4px] font-bold text-[12px] h-[38px]"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      backgroundColor: filters.ordenar === 'categoria' ? '#FFF9F4' : 'white',
                      color: filters.ordenar === 'categoria' ? ORANGE : '#999999',
                      border: `1px solid ${filters.ordenar === 'categoria' ? ORANGE : '#cccccc'}`,
                    }}
                  >
                    Categoria
                  </button>
                  <button
                    type="button"
                    onClick={() => set('ordenar')(filters.ordenar === 'tipo' ? '' : 'tipo')}
                    className="flex-1 flex items-center justify-center rounded-r-[4px] font-bold text-[12px] h-[38px]"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      backgroundColor: filters.ordenar === 'tipo' ? '#FFF9F4' : 'white',
                      color: filters.ordenar === 'tipo' ? ORANGE : '#999999',
                      border: `1px solid ${filters.ordenar === 'tipo' ? ORANGE : '#cccccc'}`,
                    }}
                  >
                    Tipo de Entrega
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="flex flex-col gap-[16px] px-4 pb-4">
                <FormDropdown
                  label="Tipo da Entrega"
                  value={filters.tipoEntrega}
                  options={tipoOptions}
                  onChange={set('tipoEntrega')}
                />
                <FormDropdown
                  label="Categoria"
                  value={filters.categoria}
                  options={categoriaOptions}
                  onChange={set('categoria')}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-between px-4 pb-4">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex items-center justify-center rounded-[4px] border border-[#e67c26] bg-white w-[150px] h-[45px]"
                >
                  <span
                    className="font-bold text-[13px]"
                    style={{ fontFamily: 'Inter, sans-serif', color: ORANGE }}
                  >
                    Limpar Filtro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
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
      </div>

      {/* Right: Voltar + Adicionar Novo */}
      <div className="flex items-center gap-4">
        <ToolbarButton
          label="Voltar para Configurações"
          variant="secondary"
          onClick={onBack}
        />
        <ToolbarButton
          label="Adicionar Novo"
          icon="add_box"
          variant="primary"
          onClick={onAddNew}
        />
      </div>
    </div>
  )
}
