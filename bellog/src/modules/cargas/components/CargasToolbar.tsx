import { AppIcon } from '../../../shared/components'

interface CargasToolbarProps {
  onImport?: () => void
  onAddNew?: () => void
}

export const CargasToolbar = ({
  onImport,
  onAddNew,
}: CargasToolbarProps) => {
  return (
    <div className="flex items-center justify-between shrink-0">
      {/* Left: Search + Filter */}
      <div className="flex gap-2 items-center">
        {/* Search Input */}
        <div className="bg-[#f9f9f9] border border-[#bdbdbd] border-solid flex items-center h-10 rounded-[5px] w-[300px]">
          <div className="flex flex-1 items-center h-full px-3">
            <span className="text-[14px] text-[#bdbdbd]">Busque uma Carga ou ID...</span>
          </div>
          <div className="bg-[#e67c26] flex items-center justify-center h-full px-2 rounded-tr-[4px] rounded-br-[4px]">
            <AppIcon name="search" size={20} className="w-5 h-5" />
          </div>
        </div>

        {/* Filter Button */}
        <button
          type="button"
          className="bg-white border border-[#4077d9] border-solid flex items-center justify-center h-10 px-2 rounded-[5px] w-10"
        >
          <AppIcon name="filter_list" size={20} className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex gap-3 items-center">
        {/* Import Button */}
        <button
          type="button"
          onClick={onImport}
          className="bg-white border border-[#4077d9] border-solid flex items-center gap-2 h-[45px] px-3 rounded-[4px]"
        >
          <AppIcon name="download" size={20} />
          <span className="font-bold text-[14px] text-[#4077d9] whitespace-nowrap">Importar</span>
        </button>

        {/* Adicionar Novo */}
        <button
          type="button"
          onClick={onAddNew}
          className="bg-[#4077d9] flex items-center gap-2 h-[45px] px-3 rounded-[4px]"
        >
          <AppIcon name="add_circle" size={20} />
          <span className="font-bold text-[14px] text-white whitespace-nowrap">Adicionar Novo</span>
        </button>
      </div>
    </div>
  )
}
