import { useState, useEffect, useRef } from 'react'
import { AppIcon, ToolbarButton } from '../../../shared/components'

export interface MotoristasFilterData {
  taxId: string
  email: string
  phone: string
}

export const EMPTY_MOTORISTAS_FILTERS: MotoristasFilterData = {
  taxId: '',
  email: '',
  phone: '',
}

interface MotoristasToolbarProps {
  onSearch?: (term: string) => void
  onAddNew?: () => void
  onBack?: () => void
  onFilter?: (filters: MotoristasFilterData) => void
  initialSearch?: string
}

const PRIMARY_DARK = '#0f3255'
const ORANGE = '#e67c26'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return '(' + d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
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

export const MotoristasToolbar = ({
  onSearch,
  onAddNew,
  onBack,
  onFilter,
  initialSearch = '',
}: MotoristasToolbarProps) => {
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MotoristasFilterData>(EMPTY_MOTORISTAS_FILTERS)
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

  const set = (field: keyof MotoristasFilterData) => (value: string) =>
    setFilters(prev => ({ ...prev, [field]: value }))

  const handleClearFilters = () => {
    setFilters(EMPTY_MOTORISTAS_FILTERS)
    onFilter?.(EMPTY_MOTORISTAS_FILTERS)
  }

  const handleApplyFilters = () => {
    onFilter?.({
      taxId: onlyDigits(filters.taxId),
      email: filters.email,
      phone: onlyDigits(filters.phone),
    })
    setShowFilters(false)
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2">
      {/* Left: Search + Filter */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-[360px]">
          <input
            type="text"
            placeholder="Busque por nome do motorista..."
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
              style={{ width: 'min(400px, calc(100vw - 32px))' }}
            >
              {/* Fields */}
              <div className="flex flex-col gap-[14px] p-4">
                <span
                  className="font-semibold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
                >
                  Filtros
                </span>
                <FilterInput
                  label="CPF/CNPJ"
                  value={filters.taxId}
                  placeholder="Digite o CPF ou CNPJ"
                  inputMode="numeric"
                  onChange={(v) => set('taxId')(formatCpfCnpj(v))}
                />
                <FilterInput
                  label="E-mail"
                  value={filters.email}
                  placeholder="Digite o e-mail"
                  onChange={set('email')}
                />
                <FilterInput
                  label="Telefone"
                  value={filters.phone}
                  placeholder="Digite o telefone"
                  inputMode="tel"
                  onChange={(v) => set('phone')(formatPhone(v))}
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
