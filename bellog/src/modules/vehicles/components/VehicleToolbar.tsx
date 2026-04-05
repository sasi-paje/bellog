import { useState } from 'react'
import { AppIcon } from '../../../shared/components'

interface VehicleToolbarProps {
  onImport?: () => void
  onAddNew?: () => void
  onSearch?: (term: string) => void
  searchValue?: string
}

const PRIMARY = '#e67c26'

export const VehicleToolbar = ({
  onImport,
  onAddNew,
  onSearch,
  searchValue = '',
}: VehicleToolbarProps) => {
  const [localSearch, setLocalSearch] = useState(searchValue)

  return (
    <div className="flex items-center justify-between shrink-0 w-full">
      {/* Left: Search */}
      <div className="flex gap-2 items-center">
        {/* Search Input */}
        <div className="bg-white border border-[#bdbdbd] flex items-center h-[40px] rounded-[5px] w-[400px]">
          <div className="flex flex-1 items-center h-full px-[12px]">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onSearch) {
                  onSearch(localSearch)
                }
              }}
              placeholder="Busque por placa..."
              className="flex-1 bg-transparent outline-none text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
            />
          </div>
          <div
            className="flex items-center justify-center w-[40px] h-full cursor-pointer"
            style={{ backgroundColor: PRIMARY }}
            onClick={() => onSearch?.(localSearch)}
          >
            <AppIcon name="search" size={24} className="text-white" />
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex gap-4 items-center">
        {/* Adicionar Novo */}
        <button
          type="button"
          onClick={onAddNew}
          className="flex items-center gap-2 h-[45px] px-3 rounded-[4px]"
          style={{ backgroundColor: PRIMARY }}
        >
          <AppIcon name="add_circle" size={20} className="text-white" />
          <span className="font-bold text-[14px] text-white whitespace-nowrap">Adicionar Novo</span>
        </button>
      </div>
    </div>
  )
}
