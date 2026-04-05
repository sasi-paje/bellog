import { AppIcon } from '../../../shared/components'

interface VehicleToolbarProps {
  onBack?: () => void
}

export const VehicleToolbar = ({ onBack }: VehicleToolbarProps) => (
  <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between shrink-0 w-full">
    {/* Search + Filter Group */}
    <div className="flex gap-2 items-center shrink-0">
      {/* Search Bar */}
      <div className="flex flex-col h-10 shrink-0 md:flex-1 md:max-w-[526px]">
        <div className="bg-[#f9f9f9] border border-[#bdbdbd] border-solid flex items-center justify-center overflow-clip rounded-[5px] w-full h-full">
          <div className="flex flex-1 h-full items-center justify-center min-h-px min-w-px relative">
            <div className="bg-white border border-[#bdbdbd] border-solid flex flex-1 h-full items-center justify-center px-2 min-h-px min-w-px relative">
              <div className="flex flex-1 flex-col font-normal justify-center text-[14px] text-[#bdbdbd] min-h-px min-w-px">
                <span className="leading-6">Busque por uma Placa...</span>
              </div>
            </div>
            <div className="bg-[#e67c26] flex h-full items-center justify-center px-2 py-0.5 shrink-0 rounded-tr-[4px] rounded-br-[4px] relative">
              <div className="flex items-center justify-center w-6 h-6 relative">
                <AppIcon name="search" size={20} className="absolute w-full h-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filter Button */}
      <div className="flex items-center self-stretch">
        <div className="bg-white border border-[#4077d9] border-solid flex h-full items-center justify-center px-2 py-0.5 rounded-[5px] shrink-0 w-10">
          <div className="flex items-center justify-center w-6 h-6 relative">
            <div className="flex items-start overflow-clip w-6 h-6 relative">
              <AppIcon name="search" size={20} className="absolute w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Action Buttons */}
    <div className="flex gap-4 items-center shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="bg-white border-0 border-[#4077d9] border-solid flex h-[45px] items-center justify-center px-3 py-0.5 rounded-[4px] shrink-0 cursor-pointer"
      >
        <div className="flex items-center justify-center shrink-0">
          <span className="font-bold text-[14px] text-[#4077d9] text-center whitespace-nowrap leading-5">Voltar para Configurações</span>
        </div>
      </button>
      <div className="bg-[#4077d9] flex h-[45px] items-center justify-center px-3 py-0.5 rounded-[4px] shrink-0 md:w-[150px]">
        <div className="flex gap-2 items-center justify-center shrink-0 relative">
          <div className="overflow-clip w-6 h-6 shrink-0 relative">
            <AppIcon name="add_circle" size={16} className="absolute inset-[12.5%] w-[75%] h-[75%]" />
          </div>
          <span className="font-bold text-[14px] text-white text-center whitespace-nowrap leading-5 shrink-0 hidden md:inline">Adicionar Novo</span>
          <span className="font-bold text-[14px] text-white text-center whitespace-nowrap leading-5 shrink-0 md:hidden">Novo</span>
        </div>
      </div>
    </div>
  </div>
)
