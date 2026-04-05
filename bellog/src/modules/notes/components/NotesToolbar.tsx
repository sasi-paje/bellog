import { useState } from 'react'
import { AppIcon } from '../../../shared/components'

interface NotesToolbarProps {
  onImport?: () => void
  onAddNew?: () => void
  onSearch?: (term: string) => void
  searchValue?: string
}

const PRIMARY = '#e67c26'
const SECONDARY = '#4077d9'
const TEXT_COLOR = '#2a2a2a'

export const NotesToolbar = ({
  onImport,
  onAddNew,
  onSearch,
  searchValue = '',
}: NotesToolbarProps) => {
  const [localSearch, setLocalSearch] = useState(searchValue)

  return (
    <div className="flex items-center justify-between shrink-0 w-full">
      {/* Left: Search + Filter */}
      <div className="flex gap-2 items-center">
        {/* Search Input - Figma: h-[40px], w-[526px] */}
        <div className="bg-white border border-[#bdbdbd] flex items-center h-[40px] rounded-[5px] w-[526px]">
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
              placeholder="Busque uma nota..."
              className="flex-1 bg-transparent outline-none text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
            />
          </div>
          {/* Search button - Figma: w-[40px], h-[40px], bg #e67c26 */}
          <div
            className="flex items-center justify-center w-[40px] h-full cursor-pointer"
            style={{ backgroundColor: PRIMARY }}
            onClick={() => onSearch?.(localSearch)}
          >
            <AppIcon name="search" size={24} className="text-white" />
          </div>
        </div>

        {/* Filter Button - Figma: w-[40px], h-[40px] */}
        <button
          type="button"
          className="bg-white border border-[#4077d9] border-solid flex items-center justify-center h-[40px] px-2 rounded-[5px] w-[40px]"
        >
          <AppIcon name="filter_list" size={20} className="text-[#4077d9]" />
        </button>
      </div>

      {/* Right: Actions - Figma: h-[45px], w-[150px] cada */}
      <div className="flex gap-4 items-center">
        {/* Import Button - outline laranja */}
        <button
          type="button"
          onClick={onImport}
          className="bg-white border border-[#e67c26] border-solid flex items-center gap-2 h-[45px] px-3 rounded-[4px]"
        >
          <AppIcon name="download" size={20} color={PRIMARY} />
          <span className="font-bold text-[14px]" style={{ color: PRIMARY }}>Importar</span>
        </button>

        {/* Adicionar Novo - fundo laranja */}
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
