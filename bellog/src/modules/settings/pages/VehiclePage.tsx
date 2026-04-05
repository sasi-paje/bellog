import { AppIcon, PageHeader, Pagination, PrimaryButton, SecondaryButton, Toggle } from '../../../shared/components'
import { VehicleTable } from '../components/VehicleTable'

interface VehiclePageProps {
  data: Array<{
    plate: string
    maxLoad: number
    responsible: string
    status: string
  }>
  userName?: string
  userRole?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const VehiclePage = ({
  data,
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: VehiclePageProps) => (
  <div className="flex flex-col flex-1 min-h-0">
    {/* Page Header */}
    <PageHeader
      title="Veículos"
      breadcrumb="Configurações"
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={onToggleSidebar || (() => {})}
      userName={userName}
      userRole={userRole}
    />

    {/* Main Content */}
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-auto">
      {/* Toolbar Row */}
      <div className="flex items-center justify-between shrink-0 w-full">
        {/* Left: Search */}
        <div className="flex items-center">
          {/* Search Input */}
          <div className="bg-[#f9f9f9] border border-[#bdbdbd] flex items-center h-10 rounded-[5px] w-[526px]">
            <div className="flex flex-1 items-center h-full px-[8px]">
              <span className="font-normal text-[14px] text-[#bdbdbd]">Busque por um veículo...</span>
            </div>
            <div className="bg-[#e67c26] flex items-center justify-center h-full px-[8px] py-[2px] rounded-br-[4px] rounded-tr-[4px]">
              <AppIcon name="search" size={24} className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex gap-4 items-center">
          {/* Voltar para Configurações */}
          <SecondaryButton
            label="Voltar para Configurações"
            onClick={onBack}
          />

          {/* Adicionar Novo */}
          <PrimaryButton
            label="Adicionar Novo"
            icon="add_box"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Toggle and Pagination Row */}
      <div className="flex items-center justify-between shrink-0 w-full">
        {/* Toggle Exibir Inativos */}
        <Toggle label="Exibir inativos" />

        {/* Pagination */}
        <Pagination />
      </div>

      {/* Table */}
      <div className="flex-1 w-full min-w-0">
        <VehicleTable data={data} />
      </div>
    </div>
  </div>
)
