import { useState, useEffect, useRef } from 'react'
import type { FilterOption } from '../services/assign-notes.service'

function getTodayDateOnly(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface FilterValues {
  // funcional — conectado a currentFilterDate na página
  date: string
  // campo legado
  vehicle: string
  // Da Indústria
  grupoCliente: string
  razaoSocial: string
  // Do Destino
  grupoDestino: string
  nomeDestino: string
  cidade: string
  bairro: string
  // Da Nota
  tempoNaCasa: string
  reentrega: string
  minWeight: string
  maxWeight: string
}

interface FilterPopoverProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterValues) => void
  initialDate?: string
  supplierGroups?: FilterOption[]
  destinationGroups?: FilterOption[]
  cities?: FilterOption[]
  neighborhoodsByCity?: Record<string, FilterOption[]>
  allNeighborhoods?: FilterOption[]
  isLoadingOptions?: boolean
}

const emptyFilters = (date = ''): FilterValues => ({
  date,
  vehicle: '',
  grupoCliente: '',
  razaoSocial: '',
  grupoDestino: '',
  nomeDestino: '',
  cidade: '',
  bairro: '',
  tempoNaCasa: '',
  reentrega: '',
  minWeight: '',
  maxWeight: '',
})

// ── estilos ────────────────────────────────────────────────────────────────────

const INPUT =
  'h-[36px] px-3 rounded-[4px] border border-[#bdbdbd] text-[13px] text-[#2a2a2a] ' +
  'placeholder:text-[#bdbdbd] focus:outline-none focus:border-[#4077d9] bg-white w-full ' +
  'disabled:bg-[#f5f5f5] disabled:cursor-not-allowed'

const LABEL = 'block font-medium text-[12px] text-[#4c4c4c] mb-[6px]'
const SECTION_TITLE = 'font-bold text-[13px] text-[#0f3255] mb-3'
const DIVIDER = 'border-t border-[#e0e0e0] my-4'

// ─────────────────────────────────────────────────────────────────────────────

export const FilterPopover = ({
  isOpen,
  onClose,
  onApply,
  initialDate,
  supplierGroups = [],
  destinationGroups = [],
  cities = [],
  neighborhoodsByCity = {},
  allNeighborhoods = [],
  isLoadingOptions = false,
}: FilterPopoverProps) => {
  const [filters, setFilters] = useState<FilterValues>(
    emptyFilters(initialDate || getTodayDateOnly())
  )
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync the date when the parent changes the selected date — do NOT clear other fields
  useEffect(() => {
    setFilters(prev => ({ ...prev, date: initialDate || getTodayDateOnly() }))
  }, [initialDate])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const setField =
    (field: keyof FilterValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value
      setFilters(prev => {
        const next = { ...prev, [field]: value }
        // Ao trocar cidade, limpar bairro se não pertencer à nova cidade
        if (field === 'cidade') {
          const validBairros = value ? (neighborhoodsByCity[value] || []).map(o => o.value) : []
          if (value && !validBairros.includes(prev.bairro)) {
            next.bairro = ''
          }
        }
        return next
      })
    }

  const handleApply = () => {
    onApply(filters)
  }

  const handleClear = () => {
    const cleared = emptyFilters(initialDate || getTodayDateOnly())
    setFilters(cleared)
    onApply(cleared)
  }

  // Bairros disponíveis: se cidade selecionada → apenas os desta cidade; senão → todos
  const availableNeighborhoods = filters.cidade
    ? (neighborhoodsByCity[filters.cidade] || [])
    : allNeighborhoods

  const loadingPlaceholder = isLoadingOptions ? 'Carregando...' : undefined

  return (
    <div
      ref={containerRef}
      className="absolute top-full right-0 mt-2 z-50 bg-white border border-[#e0e0e0] rounded-[8px] shadow-md w-[380px]"
    >
      <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-4 pt-4 pb-2">

        {/* ── Da Indústria ─────────────────────────────────────────────── */}
        <p className={SECTION_TITLE}>Da Indústria</p>

        <div className="flex flex-col gap-3 mb-1">
          <div>
            <label className={LABEL}>Grupo Cliente</label>
            <select
              value={filters.grupoCliente}
              onChange={setField('grupoCliente')}
              disabled={isLoadingOptions}
              className={INPUT}
            >
              <option value="">{loadingPlaceholder ?? 'Selecione grupo de Cliente'}</option>
              {supplierGroups.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Nome de Exibição</label>
            <input
              type="text"
              placeholder="Insira o nome de exibição"
              value={filters.razaoSocial}
              onChange={setField('razaoSocial')}
              className={INPUT}
            />
          </div>
        </div>

        <hr className={DIVIDER} />

        {/* ── Do Destino ───────────────────────────────────────────────── */}
        <p className={SECTION_TITLE}>Do Destino</p>

        <div className="flex flex-col gap-3 mb-1">
          <div>
            <label className={LABEL}>Grupo do Destino</label>
            <select
              value={filters.grupoDestino}
              onChange={setField('grupoDestino')}
              disabled={isLoadingOptions}
              className={INPUT}
            >
              <option value="">{loadingPlaceholder ?? 'Selecione grupo de Destino'}</option>
              {destinationGroups.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Nome destino</label>
            <input
              type="text"
              placeholder="Insira o nome do destino"
              value={filters.nomeDestino}
              onChange={setField('nomeDestino')}
              className={INPUT}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={LABEL}>Cidade</label>
              <select
                value={filters.cidade}
                onChange={setField('cidade')}
                disabled={isLoadingOptions}
                className={INPUT}
              >
                <option value="">{loadingPlaceholder ?? 'Selecione a cidade'}</option>
                {cities.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className={LABEL}>Bairro</label>
              <select
                value={filters.bairro}
                onChange={setField('bairro')}
                disabled={isLoadingOptions || availableNeighborhoods.length === 0}
                className={INPUT}
              >
                <option value="">
                  {isLoadingOptions
                    ? 'Carregando...'
                    : availableNeighborhoods.length === 0 && filters.cidade
                      ? 'Sem bairros'
                      : 'Selecione o bairro'}
                </option>
                {availableNeighborhoods.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className={DIVIDER} />

        {/* ── Da Nota ──────────────────────────────────────────────────── */}
        <p className={SECTION_TITLE}>Da Nota</p>

        <div className="flex flex-col gap-3 mb-1">
          <div>
            <label className={LABEL}>Tempo na casa</label>
            <input
              type="number"
              min="0"
              placeholder="Insira o número de dias que a nota está na Bellog"
              value={filters.tempoNaCasa}
              onChange={setField('tempoNaCasa')}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>Reentrega</label>
            <input
              type="number"
              min="0"
              placeholder="Insira a quantidade de reentrega"
              value={filters.reentrega}
              onChange={setField('reentrega')}
              className={INPUT}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={LABEL}>Peso Mínimo</label>
              <input
                type="text"
                placeholder="Insira o Peso Mínimo"
                value={filters.minWeight}
                onChange={setField('minWeight')}
                className={INPUT}
              />
            </div>
            <div className="flex-1">
              <label className={LABEL}>Peso Máximo</label>
              <input
                type="text"
                placeholder="Insira o Peso Máximo"
                value={filters.maxWeight}
                onChange={setField('maxWeight')}
                className={INPUT}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#e0e0e0]">
        <button
          type="button"
          onClick={handleClear}
          className="h-[36px] px-4 rounded-[4px] border border-[#e67c26] text-[#e67c26] font-bold text-[13px] bg-white hover:bg-[#fff9f4] transition-colors"
        >
          Limpar Filtros
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="h-[36px] px-4 rounded-[4px] bg-[#e67c26] text-white font-bold text-[13px] hover:bg-[#d06c1e] transition-colors"
        >
          Filtrar
        </button>
      </div>
    </div>
  )
}

export default FilterPopover
