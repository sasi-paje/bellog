import { useState, useEffect, useRef } from 'react'
import { AppIcon, ToolbarButton } from '../../../shared/components'

export interface VehicleFilterData {
  max_capacity: string
  responsible_name: string
  responsible_type: string
}

export const EMPTY_VEHICLE_FILTERS: VehicleFilterData = {
  max_capacity: '',
  responsible_name: '',
  responsible_type: '',
}

interface VehicleToolbarProps {
  onAddNew?: () => void
  onSearch?: (term: string) => void
  onFilter?: (filters: VehicleFilterData) => void
  searchValue?: string
}

const PRIMARY_DARK = '#0f3255'
const ORANGE = '#e67c26'

export const VehicleToolbar = ({
  onAddNew,
  onSearch,
  onFilter,
  searchValue = '',
}: VehicleToolbarProps) => {
  const [localSearch, setLocalSearch] = useState(searchValue)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<VehicleFilterData>(EMPTY_VEHICLE_FILTERS)
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

  const handleSearch = () => onSearch?.(localSearch)

  const handleClearFilters = () => {
    setFilters(EMPTY_VEHICLE_FILTERS)
    onFilter?.(EMPTY_VEHICLE_FILTERS)
  }

  const handleApplyFilters = () => {
    onFilter?.({
      max_capacity: filters.max_capacity.trim(),
      responsible_name: filters.responsible_name.trim(),
      responsible_type: filters.responsible_type.trim(),
    })
    setShowFilters(false)
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2">
      <div className="flex items-center gap-2">
        <div className="relative w-[360px]">
          <input
            type="text"
            placeholder="Busque por placa..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
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
              style={{ width: 'min(400px, calc(100vw - 32px))' }}
            >
              <div className="flex flex-col gap-[14px] p-4">
                <span
                  className="font-semibold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
                >
                  Filtros
                </span>

                <div className="flex flex-col gap-[8px] w-full">
                  <label
                    className="font-semibold text-[14px]"
                    style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
                  >
                    Carga Máxima (kg)
                  </label>
                  <input
                    type="number"
                    value={filters.max_capacity}
                    placeholder="Ex: 1500"
                    onChange={(e) => setFilters(prev => ({ ...prev, max_capacity: e.target.value }))}
                    className="h-[45px] w-full px-[16px] border border-[#0f3255] rounded-[5px] bg-white text-[14px] font-normal placeholder:text-[#919191] focus:outline-none focus:ring-1 focus:ring-[#0f3255]"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#2A2A2A' }}
                  />
                </div>

                <div className="flex flex-col gap-[8px] w-full">
                  <label
                    className="font-semibold text-[14px]"
                    style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
                  >
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={filters.responsible_name}
                    placeholder="Ex: João Silva"
                    onChange={(e) => setFilters(prev => ({ ...prev, responsible_name: e.target.value }))}
                    className="h-[45px] w-full px-[16px] border border-[#0f3255] rounded-[5px] bg-white text-[14px] font-normal placeholder:text-[#919191] focus:outline-none focus:ring-1 focus:ring-[#0f3255]"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#2A2A2A' }}
                  />
                </div>

                <div className="flex flex-col gap-[8px] w-full">
                  <label
                    className="font-semibold text-[14px]"
                    style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
                  >
                    Tipo do Responsável
                  </label>
                  <input
                    type="text"
                    value={filters.responsible_type}
                    placeholder="Ex: Motorista"
                    onChange={(e) => setFilters(prev => ({ ...prev, responsible_type: e.target.value }))}
                    className="h-[45px] w-full px-[16px] border border-[#0f3255] rounded-[5px] bg-white text-[14px] font-normal placeholder:text-[#919191] focus:outline-none focus:ring-1 focus:ring-[#0f3255]"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#2A2A2A' }}
                  />
                </div>
              </div>

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

      <div className="flex items-center gap-4">
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
