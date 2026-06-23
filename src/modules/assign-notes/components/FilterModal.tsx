import { useState, useEffect, useRef } from 'react'
import { AppIcon } from '../../../shared/components'

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterValues) => void
}

export interface FilterValues {
  maxWeight: string
  destinations: string[]
  notes: string
  route: string
  startDate: string
  endDate: string
}

export const FilterModal = ({ isOpen, onClose, onApply }: FilterModalProps) => {
  const [filters, setFilters] = useState<FilterValues>({
    maxWeight: '',
    destinations: [],
    notes: '',
    route: '',
    startDate: '',
    endDate: '',
  })

  const containerRef = useRef<HTMLDivElement>(null)

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilters({
        maxWeight: '',
        destinations: [],
        notes: '',
        route: '',
        startDate: '',
        endDate: '',
      })
    }
  }, [isOpen])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Don't close on click outside - inline panel stays open
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleApply = () => {
    console.log('FilterModal handleApply called with:', filters)
    onApply(filters)
    onClose()
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-2 bg-white border border-[#919191] rounded-[8px] p-4 w-[540px] max-h-[400px] overflow-y-auto z-40 shadow-lg"
    >
      {/* Peso Máximo de Veículo */}
      <div className="flex flex-col gap-2 w-full mb-2">
        <label className="font-semibold text-[14px] text-[#161a36]">
          Peso Máximo de Veículo
        </label>
        <input
          type="text"
          placeholder="Buscar por Peso máximo em kilograma"
          value={filters.maxWeight}
          onChange={(e) => setFilters(prev => ({ ...prev, maxWeight: e.target.value }))}
          className="h-[45px] px-4 py-3 rounded-[5px] border border-[#161a36] text-[14px] text-[#161a36] placeholder:text-[#bdbdbd] focus:outline-none focus:border-[#4077d9] bg-white w-full"
        />
      </div>

      {/* Destinos */}
      <div className="flex flex-col gap-2 w-full mb-2">
        <label className="font-semibold text-[14px] text-[#161a36]">
          Destinos
        </label>
        <div className="h-[45px] px-4 py-3 rounded-[5px] border border-[#161a36] bg-white flex items-center justify-between cursor-pointer hover:border-[#4077d9]">
          <span className="text-[14px] text-[#bdbdbd]">
            Selecione um ou mais destinos
          </span>
          <AppIcon name="keyboard_arrow_down" size={24} />
        </div>
      </div>

      {/* Notas */}
      <div className="flex flex-col gap-2 w-full mb-2">
        <label className="font-semibold text-[14px] text-[#161a36]">
          Notas
        </label>
        <input
          type="text"
          placeholder="Buscar por ID de notas"
          value={filters.notes}
          onChange={(e) => setFilters(prev => ({ ...prev, notes: e.target.value }))}
          className="h-[45px] px-4 py-3 rounded-[5px] border border-[#161a36] text-[14px] text-[#161a36] placeholder:text-[#bdbdbd] focus:outline-none focus:border-[#4077d9] bg-white w-full"
        />
      </div>

      {/* Rota */}
      <div className="flex flex-col gap-2 w-full mb-2">
        <label className="font-semibold text-[14px] text-[#161a36]">
          Rota
        </label>
        <input
          type="text"
          placeholder="Buscar por ID de Rotas não iniciadas"
          value={filters.route}
          onChange={(e) => setFilters(prev => ({ ...prev, route: e.target.value }))}
          className="h-[45px] px-4 py-3 rounded-[5px] border border-[#161a36] text-[14px] text-[#161a36] placeholder:text-[#bdbdbd] focus:outline-none focus:border-[#4077d9] bg-white w-full"
        />
      </div>

      {/* Datas */}
      <div className="flex gap-2 w-full mb-4">
        {/* Data Início */}
        <div className="flex-1 flex flex-col gap-2">
          <label className="font-semibold text-[14px] text-[#161a36]">
            Criação da rota inicial
          </label>
          <div className="h-[45px] px-4 py-3 rounded-[5px] border border-[#161a36] bg-white flex items-center justify-between">
            <span className="text-[14px] text-[#bdbdbd]">dd/mm/aaaa</span>
            <AppIcon name="calendar_month" size={24} />
          </div>
        </div>

        {/* Data Fim */}
        <div className="flex-1 flex flex-col gap-2">
          <label className="font-semibold text-[14px] text-[#161a36]">
            Criação da rota final <span className="font-normal">(opcional)</span>
          </label>
          <div className="h-[45px] px-4 py-3 rounded-[5px] border border-[#161a36] bg-white flex items-center justify-between">
            <span className="text-[14px] text-[#bdbdbd]">dd/mm/aaaa</span>
            <AppIcon name="calendar_month" size={24} />
          </div>
        </div>
      </div>

      {/* Botão Filtrar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleApply}
          className="h-[45px] px-2 py-1 rounded-[4px] bg-[#e67c26] text-white font-bold text-[14px] hover:bg-[#d06c1e] transition-colors w-[150px] flex items-center justify-center"
        >
          Filtrar
        </button>
      </div>
    </div>
  )
}