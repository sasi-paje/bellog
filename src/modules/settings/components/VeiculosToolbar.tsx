import { useState } from 'react'
import { AppIcon, ToolbarButton } from '../../../shared/components'

interface VeiculosToolbarProps {
  onSearch?: (term: string) => void
  onAddNew?: () => void
  onBack?: () => void
  initialSearch?: string
}

export const VeiculosToolbar = ({
  onSearch,
  onAddNew,
  onBack,
  initialSearch = '',
}: VeiculosToolbarProps) => {
  const [searchValue, setSearchValue] = useState(initialSearch)

  const handleSearch = () => onSearch?.(searchValue)

  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2">
      <div className="flex items-center gap-2">
        <div className="relative w-[360px]">
          <input
            type="text"
            placeholder="Busque por placa..."
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
      </div>

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
