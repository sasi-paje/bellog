import { useState, useEffect, useRef } from 'react'
import { AppIcon, FormDropdown, ToolbarButton } from '../../../shared/components'

export interface DestinosFilterData {
  groupId: string
  cnpj: string
  zipCode: string
  street: string
  district: string
}

export const EMPTY_DESTINOS_FILTERS: DestinosFilterData = {
  groupId: '',
  cnpj: '',
  zipCode: '',
  street: '',
  district: '',
}

interface DestinosToolbarProps {
  onSearch?: (term: string) => void
  onAddNew?: () => void
  onBack?: () => void
  onFilter?: (filters: DestinosFilterData) => void
  initialSearch?: string
  groups: { id: number; name: string }[]
}

const PRIMARY_DARK = '#0f3255'
const ORANGE = '#e67c26'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8)
  return d.replace(/^(\d{5})(\d)/, '$1-$2')
}

const FilterInput = ({
  label,
  value,
  placeholder,
  onChange,
  inputMode = 'text',
}: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) => (
  <div className="flex flex-col gap-[8px] w-full">
    <label
      className="font-semibold text-[14px]"
      style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
    >
      {label}
    </label>
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-[45px] w-full px-[16px] border border-[#0f3255] rounded-[5px] bg-white text-[14px] font-normal placeholder:text-[#919191] focus:outline-none focus:ring-1 focus:ring-[#0f3255]"
      style={{ fontFamily: 'Inter, sans-serif', color: '#2A2A2A' }}
    />
  </div>
)

export const DestinosToolbar = ({
  onSearch,
  onAddNew,
  onBack,
  onFilter,
  initialSearch = '',
  groups,
}: DestinosToolbarProps) => {
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<DestinosFilterData>(EMPTY_DESTINOS_FILTERS)
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

  const set = (field: keyof DestinosFilterData) => (value: string) =>
    setFilters(prev => ({ ...prev, [field]: value }))

  const handleClearFilters = () => {
    setFilters(EMPTY_DESTINOS_FILTERS)
    onFilter?.(EMPTY_DESTINOS_FILTERS)
  }

  const handleApplyFilters = () => {
    onFilter?.({
      ...filters,
      cnpj: onlyDigits(filters.cnpj),
      zipCode: onlyDigits(filters.zipCode),
    })
    setShowFilters(false)
  }

  const groupOptions = [
    { value: '', label: 'Selecione o grupo' },
    ...groups.map(g => ({ value: String(g.id), label: g.name })),
  ]

  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2">
      {/* Left: Search + Filter */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-[360px]">
          <input
            type="text"
            placeholder="Busque por razão social ou nome de exibição..."
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
              style={{ width: 'min(480px, calc(100vw - 32px))' }}
            >
              {/* Fields */}
              <div className="flex flex-col gap-[14px] p-4">
                <span
                  className="font-semibold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
                >
                  Filtros
                </span>
                <FormDropdown
                  label="Grupo"
                  value={filters.groupId}
                  options={groupOptions}
                  onChange={set('groupId')}
                />
                <FilterInput
                  label="CNPJ"
                  value={filters.cnpj}
                  placeholder="Digite o CNPJ"
                  inputMode="numeric"
                  onChange={(v) => set('cnpj')(formatCnpj(v))}
                />
                <FilterInput
                  label="CEP"
                  value={filters.zipCode}
                  placeholder="Digite o CEP"
                  inputMode="numeric"
                  onChange={(v) => set('zipCode')(formatCep(v))}
                />
                <FilterInput
                  label="Rua"
                  value={filters.street}
                  placeholder="Digite a rua"
                  onChange={set('street')}
                />
                <FilterInput
                  label="Bairro"
                  value={filters.district}
                  placeholder="Digite o bairro"
                  onChange={set('district')}
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
