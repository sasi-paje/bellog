import { useState, useEffect, useRef } from 'react'
import { PageToolbar, FormInput, FormDropdown, MultiSelectDropdown } from '../../../shared/components'
import { routeService } from '../../../features/routes/api/route.service'

const getToday = () => {
  const today = new Date()
  const day = String(today.getDate()).padStart(2, '0')
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const year = today.getFullYear()
  return `${year}-${month}-${day}`
}

export interface FilterOption {
  value: string
  label: string
  color?: string
}

export interface FilterData {
  dataInicio: string
  dataFim: string
  status: FilterOption[]
  statusEntrega: FilterOption[]
  motorista: FilterOption[]
  area: FilterOption[]
  veiculo: FilterOption[]
  responsavel: string
  ordenar: string
  rotaInicio: string
  rotaFim: string
}

interface RoutesToolbarProps {
  onSearch?: (term: string) => void
  onToggleInactive?: (show: boolean) => void
  onExport?: () => void
  onExportSelected?: () => void
  onFilter?: (filters: FilterData) => void
  initialSearch?: string
  showInactive?: boolean
  initialFilters?: FilterData
  isSelectionMode?: boolean
  selectedCount?: number
}

const PRIMARY_DARK = '#0f3255'
const TEXT_LIGHT25 = '#919191'
const ORANGE_ACCENT = '#e67c26'

export const RoutesToolbar = ({
  onSearch,
  onToggleInactive,
  onExport,
  onExportSelected,
  onFilter,
  initialSearch = '',
  showInactive = false,
  initialFilters,
  isSelectionMode = false,
  selectedCount = 0,
}: RoutesToolbarProps) => {
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [showFilters, setShowFilters] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const today = getToday()
  const [filters, setFilters] = useState<FilterData>(initialFilters || {
    dataInicio: today,
    dataFim: today,
    status: [],
    statusEntrega: [],
    motorista: [],
    area: [],
    veiculo: [],
    responsavel: '',
    ordenar: 'recentes',
    rotaInicio: '',
    rotaFim: '',
  })

  const [refData, setRefData] = useState<any>({
    statuses: [],
    deliveryStatuses: [],
    areas: [],
    vehicles: [],
    drivers: [],
  })

  useEffect(() => {
    const loadRefData = async () => {
      try {
        const data = await routeService.getReferenceData()
        const drivers = await routeService.getDrivers()
        const areas = await routeService.getRouteAreaOptions()
        setRefData({
          statuses: data.statuses || [],
          deliveryStatuses: data.deliveryStatuses || [],
          areas: areas || [],
          vehicles: data.vehicles || [],
          drivers: drivers || [],
        })
      } catch (err) {
        console.error('[RoutesToolbar] Error loading ref data:', err)
      }
    }
    loadRefData()
  }, [])

  // Fecha o painel de filtros ao clicar fora dele ou pressionar Esc,
  // preservando os dados preenchidos (apenas oculta o painel; o estado
  // `filters` não é resetado).
  useEffect(() => {
    if (!showFilters) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilters(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showFilters])

  const handleSearch = (value: string) => {
    setSearchValue(value)
    onSearch?.(value)
  }

  const handleStringChange = (field: keyof FilterData, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value as any }))
  }

  const handleMultiSelectChange = (field: keyof FilterData, selected: FilterOption[]) => {
    setFilters(prev => ({ ...prev, [field]: selected }))
  }

  const handleClearFilters = () => {
    const emptyFilters: FilterData = {
      dataInicio: '',
      dataFim: '',
      status: [],
      statusEntrega: [],
      motorista: [],
      area: [],
      veiculo: [],
      responsavel: '',
      ordenar: 'recentes',
      rotaInicio: '',
      rotaFim: '',
    }
    setFilters(emptyFilters)
    onFilter?.(emptyFilters)
  }

  const handleApplyFilters = () => {
    onFilter?.(filters)
    setShowFilters(false)
  }

  // Convert ref data to MultiSelectDropdown options
  const statusOptions = refData.statuses.map((s: any) => ({ value: s.name, label: s.name }))
  const deliveryStatusOptions = refData.deliveryStatuses.map((s: any) => ({ value: s.name, label: s.name }))
  const areaOptions = refData.areas.map((a: any) => ({ value: a.description, label: a.description }))
  const driverOptions = refData.drivers.map((d: any) => ({ value: d.name, label: d.name }))
  const vehicleOptions = refData.vehicles.map((v: any) => ({ value: v.plate, label: v.plate }))

  return (
    <div className="relative" ref={containerRef}>
      <PageToolbar
        search={{
          placeholder: 'Buscar pelo número da Rota',
          value: searchValue,
          onChange: setSearchValue,
          onSearch: handleSearch,
          width: '360px',
        }}
        filters={[
          { isActive: showFilters, onClick: () => setShowFilters(!showFilters) },
        ]}
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

      {/* Filters Panel - Overlay */}
      {showFilters && (
        <div
          className="absolute top-full left-0 mt-2 z-50 flex flex-col bg-white border border-[#bdbdbd] rounded-[5px] shadow-lg"
          style={{ width: '668px' }}
        >
          {/* Ordenação - Top Section */}
          <div className="flex gap-[16px] p-4 pb-[16px]">
            <div className="flex-1">
              <span
                className="font-semibold text-[14px] mb-2 block"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Ordenação
              </span>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => handleStringChange('ordenar', 'recentes')}
                  className="flex-1 flex items-center justify-center rounded-l-[4px] font-bold text-[12px] transition-colors h-[38px] border-r-0"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    backgroundColor: filters.ordenar === 'recentes' ? '#FFF9F4' : 'white',
                    color: filters.ordenar === 'recentes' ? '#E67C26' : '#999999',
                    border: `1px solid ${filters.ordenar === 'recentes' ? '#E67C26' : '#cccccc'}`,
                  }}
                >
                  Mais Recentes Primeiro
                </button>
                <button
                  type="button"
                  onClick={() => handleStringChange('ordenar', 'antigos')}
                  className="flex-1 flex items-center justify-center rounded-r-[4px] font-bold text-[12px] transition-colors h-[38px]"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    backgroundColor: filters.ordenar === 'antigos' ? '#FFF9F4' : 'white',
                    color: filters.ordenar === 'antigos' ? '#E67C26' : '#999999',
                    border: `1px solid ${filters.ordenar === 'antigos' ? '#E67C26' : '#cccccc'}`,
                  }}
                >
                  Mais Antigos Primeiro
                </button>
              </div>
            </div>
          </div>

          {/* Filter Rows */}
          <div className="flex flex-col gap-[16px] p-4">
            {/* Row 1: Número de Rota (Início + Fim) */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                <FormInput
                  label="Número de Rota (Início)"
                  value={filters.rotaInicio}
                  placeholder="Ex: 001"
                  onChange={(value) => handleStringChange('rotaInicio', value)}
                  type="text"
                />
              </div>
              <div className="flex-1">
                <FormInput
                  label="Número de Rota (Fim)"
                  value={filters.rotaFim}
                  placeholder="Ex: 100"
                  onChange={(value) => handleStringChange('rotaFim', value)}
                  type="text"
                />
              </div>
            </div>

            {/* Row 2: Data Saída (Inicio + Final) */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                <FormInput
                  label="Data Saída Início"
                  value={filters.dataInicio}
                  onChange={(value) => handleStringChange('dataInicio', value)}
                  type="date"
                />
              </div>
              <div className="flex-1">
                <FormInput
                  label="Data Saída Final"
                  value={filters.dataFim}
                  onChange={(value) => handleStringChange('dataFim', value)}
                  type="date"
                />
              </div>
            </div>

            {/* Row 2: Status da Rota + Status da Entrega (multi) */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                <MultiSelectDropdown
                  label="Status da Rota"
                  options={statusOptions}
                  selectedOptions={filters.status}
                  onChange={(selected) => handleMultiSelectChange('status', selected)}
                />
              </div>
              <div className="flex-1">
                <MultiSelectDropdown
                  label="Status da Entrega"
                  options={deliveryStatusOptions}
                  selectedOptions={filters.statusEntrega}
                  onChange={(selected) => handleMultiSelectChange('statusEntrega', selected)}
                />
              </div>
            </div>

            {/* Row 3: Área Rota + Motorista (multi) */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                <MultiSelectDropdown
                  label="Área Rota"
                  options={areaOptions}
                  selectedOptions={filters.area}
                  onChange={(selected) => handleMultiSelectChange('area', selected)}
                />
              </div>
              <div className="flex-1">
                <MultiSelectDropdown
                  label="Motorista"
                  options={driverOptions}
                  selectedOptions={filters.motorista}
                  onChange={(selected) => handleMultiSelectChange('motorista', selected)}
                />
              </div>
            </div>

            {/* Row 4: Placa + Responsável (multi + single) */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                <MultiSelectDropdown
                  label="Placa"
                  options={vehicleOptions}
                  selectedOptions={filters.veiculo}
                  onChange={(selected) => handleMultiSelectChange('veiculo', selected)}
                />
              </div>
              <div className="flex-1">
                <FormDropdown
                  label="Responsável"
                  value={filters.responsavel}
                  options={[{ value: '', label: 'Todos' }, ...refData.drivers.map((d: any) => ({ value: d.name, label: d.name }))]}
                  onChange={(value) => handleStringChange('responsavel', value)}
                />
              </div>
            </div>
          </div>

          {/* Footer: Limpar + Filtrar */}
          <div className="flex justify-between p-4">
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center justify-center rounded-[4px] border border-[#e67c26] bg-white w-[150px] h-[45px]"
            >
              <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}>
                Limpar Filtro
              </span>
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="flex items-center justify-center rounded-[4px] bg-[#e67c26] w-[150px] h-[45px]"
            >
              <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: 'white' }}>
                Filtrar
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}