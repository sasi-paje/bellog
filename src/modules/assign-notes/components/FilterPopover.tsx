import { useState, useEffect, useRef } from 'react'
import type { FilterOption } from '../services/assign-notes.service'
import { MultiSelect } from './MultiSelect'

function getTodayDateOnly(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseBrazilianDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null

  const raw = String(value).trim()
  if (!raw) return null

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null

  return Number(parsed.toFixed(2))
}

function formatBrazilianDecimal(value: string): string {
  const parsed = parseBrazilianDecimal(value)
  if (parsed === null) return ''
  return parsed.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export interface FilterValues {
  // referência interna dos filtros; independente da data da rota
  date: string
  // campo legado
  vehicle: string
  // Da Indústria — grupoCliente filtra pelo grupo do fornecedor (papel SUPPLIER)
  grupoCliente: string[]
  razaoSocial: string
  // Do Destino
  grupoDestino: string[]
  nomeDestino: string
  cidade: string[]
  bairro: string[]
  // Da Nota
  minDiasNaCasa: string    // mínimo de dias no sistema (numérico)
  maxDiasNaCasa: string    // máximo de dias no sistema (numérico)
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

export const emptyFilters = (date = ''): FilterValues => ({
  date,
  vehicle: '',
  grupoCliente: [],
  razaoSocial: '',
  grupoDestino: [],
  nomeDestino: '',
  cidade: [],
  bairro: [],
  minDiasNaCasa: '',
  maxDiasNaCasa: '',
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

  const setTextField =
    (field: keyof FilterValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters(prev => ({ ...prev, [field]: e.target.value }))
    }

  const formatWeightField = (field: 'minWeight' | 'maxWeight') => {
    setFilters(prev => ({ ...prev, [field]: formatBrazilianDecimal(prev[field]) }))
  }

  // Ao selecionar cidade: remover apenas bairros incompatíveis com as cidades restantes
  const handleCidadeChange = (newCidades: string[]) => {
    setFilters(prev => {
      // Sem cidade selecionada → sem restrição de cidade; bairros ficam intactos
      if (newCidades.length === 0) {
        return { ...prev, cidade: [] }
      }
      const validBairros = new Set(
        newCidades.flatMap(c => (neighborhoodsByCity[c] || []).map(n => n.value))
      )
      return {
        ...prev,
        cidade: newCidades,
        bairro: prev.bairro.filter(b => validBairros.has(b)),
      }
    })
  }

  // Ao selecionar bairro: auto-adicionar a cidade correspondente para que o par
  // bairro↔cidade fique sempre sincronizado e o bairro não desapareça ao filtrar
  const handleBairroChange = (newBairros: string[]) => {
    setFilters(prev => {
      const citiesFromBairros = newBairros.flatMap(b => {
        for (const [city, nbs] of Object.entries(neighborhoodsByCity)) {
          if (nbs.some(n => n.value === b)) return [city]
        }
        return []
      })
      const updatedCidade =
        citiesFromBairros.length > 0
          ? [...new Set([...prev.cidade, ...citiesFromBairros])]
          : prev.cidade
      return { ...prev, bairro: newBairros, cidade: updatedCidade }
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

  // Bairros disponíveis: se cidades selecionadas → apenas os dessas cidades; senão → todos
  const availableNeighborhoods: FilterOption[] =
    filters.cidade.length > 0
      ? [...new Set(
          filters.cidade.flatMap(c => (neighborhoodsByCity[c] || []).map(n => n.value))
        )]
          .sort()
          .map(v => ({ value: v, label: v }))
      : allNeighborhoods

  return (
    <div
      ref={containerRef}
      className="absolute top-full right-0 mt-2 z-50 bg-white border border-[#e0e0e0] rounded-[8px] shadow-md w-[380px]"
    >
      <div className="max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden px-4 pt-4 pb-2">

        {/* ── Da Indústria ─────────────────────────────────────────────── */}
        <p className={SECTION_TITLE}>Da Indústria</p>

        <div className="flex flex-col gap-3 mb-1">
          <div>
            <label className={LABEL}>Grupo Cliente</label>
            <MultiSelect
              options={supplierGroups}
              value={filters.grupoCliente}
              onChange={v => setFilters(prev => ({ ...prev, grupoCliente: v }))}
              placeholder={isLoadingOptions ? 'Carregando...' : 'Selecione grupo de Cliente'}
              disabled={isLoadingOptions}
            />
          </div>

          <div>
            <label className={LABEL}>Nome de Exibição</label>
            <input
              type="text"
              placeholder="Insira o nome de exibição"
              value={filters.razaoSocial}
              onChange={setTextField('razaoSocial')}
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
            <MultiSelect
              options={destinationGroups}
              value={filters.grupoDestino}
              onChange={v => setFilters(prev => ({ ...prev, grupoDestino: v }))}
              placeholder={isLoadingOptions ? 'Carregando...' : 'Selecione grupo de Destino'}
              disabled={isLoadingOptions}
            />
          </div>

          <div>
            <label className={LABEL}>Nome destino</label>
            <input
              type="text"
              placeholder="Insira o nome do destino"
              value={filters.nomeDestino}
              onChange={setTextField('nomeDestino')}
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={LABEL}>Cidade</label>
              <MultiSelect
                options={cities}
                value={filters.cidade}
                onChange={handleCidadeChange}
                placeholder={isLoadingOptions ? 'Carregando...' : 'Selecione a cidade'}
                disabled={isLoadingOptions}
              />
            </div>
            <div className="min-w-0">
              <label className={LABEL}>Bairro</label>
              <MultiSelect
                options={availableNeighborhoods}
                value={filters.bairro}
                onChange={handleBairroChange}
                placeholder={
                  isLoadingOptions
                    ? 'Carregando...'
                    : availableNeighborhoods.length === 0 && filters.cidade.length > 0
                      ? 'Sem bairros'
                      : 'Selecione o bairro'
                }
                disabled={isLoadingOptions || (filters.cidade.length > 0 && availableNeighborhoods.length === 0)}
              />
            </div>
          </div>
        </div>

        <hr className={DIVIDER} />

        {/* ── Da Nota ──────────────────────────────────────────────────── */}
        <p className={SECTION_TITLE}>Da Nota</p>

        <div className="flex flex-col gap-3 mb-1">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={LABEL}>Dias mínimo</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 5"
                value={filters.minDiasNaCasa}
                onChange={setTextField('minDiasNaCasa')}
                className={INPUT}
              />
            </div>
            <div className="flex-1">
              <label className={LABEL}>Dias máximo</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 20"
                value={filters.maxDiasNaCasa}
                onChange={setTextField('maxDiasNaCasa')}
                className={INPUT}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Reentrega</label>
            <select
              value={filters.reentrega}
              onChange={(e) => setFilters(prev => ({ ...prev, reentrega: e.target.value }))}
              className={INPUT}
              disabled={isLoadingOptions}
            >
              <option value="">{isLoadingOptions ? 'Carregando...' : 'Selecione'}</option>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={LABEL}>Peso Mínimo</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Insira o Peso Mínimo"
                value={filters.minWeight}
                onChange={setTextField('minWeight')}
                onBlur={() => formatWeightField('minWeight')}
                className={INPUT}
              />
            </div>
            <div className="flex-1">
              <label className={LABEL}>Peso Máximo</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Insira o Peso Máximo"
                value={filters.maxWeight}
                onChange={setTextField('maxWeight')}
                onBlur={() => formatWeightField('maxWeight')}
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
