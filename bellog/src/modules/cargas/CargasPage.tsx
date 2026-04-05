import { useState } from 'react'
import { PageHeader, Pagination, Drawer, TabId, FormInput } from '../../shared/components'
import { CargasTable } from './components/CargasTable'
import { CargasToolbar } from './components/CargasToolbar'
import { cargasData, CargaMock } from './data/cargas.mock'

interface CargasPageProps {
  data?: typeof cargasData
  userName?: string
  userRole?: string
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

const TABS = [
  { id: 'dados-carga' as TabId, label: 'Dados da Carga' },
  { id: 'rotas' as TabId, label: 'Rotas' },
  { id: 'historico' as TabId, label: 'Histórico' },
]

export const CargasPage = ({
  data = cargasData,
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  isSidebarOpen = true,
  onToggleSidebar,
}: CargasPageProps) => {
  const [selectedCarga, setSelectedCarga] = useState<CargaMock | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('dados-carga')

  const handleRowClick = (carga: CargaMock) => {
    setSelectedCarga(carga)
    setIsDrawerOpen(true)
    setActiveTab('dados-carga')
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedCarga(null)
  }

  const renderTabContent = () => {
    if (!selectedCarga) return null

    switch (activeTab) {
      case 'dados-carga':
        return (
          <div className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Número da Carga"
                value={selectedCarga.numeroCarga}
                readOnly
              />
              <FormInput
                label="Status"
                value={selectedCarga.status}
                readOnly
              />
              <FormInput
                label="Data de Saída"
                value={selectedCarga.dataSaida}
                readOnly
              />
              <FormInput
                label="Hora de Saída"
                value={selectedCarga.horaSaida}
                readOnly
              />
              <FormInput
                label="Responsável"
                value={selectedCarga.responsavel}
                readOnly
              />
              <FormInput
                label="Total de Rotas"
                value={selectedCarga.rotas.toString()}
                readOnly
              />
              <FormInput
                label="Total de Notas"
                value={selectedCarga.notas.toString()}
                readOnly
              />
            </div>
          </div>
        )
      case 'rotas':
        return (
          <div className="flex flex-col gap-2 p-4">
            <p className="text-[14px] text-[#6b7280]">Rotas vinculadas a esta carga.</p>
          </div>
        )
      case 'historico':
        return (
          <div className="flex flex-col gap-2 p-4">
            <p className="text-[14px] text-[#6b7280]">Nenhum histórico disponível.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Cargas"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userRole={userRole}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Toolbar */}
        <CargasToolbar />

        {/* Table with overflow horizontal */}
        <div className="flex flex-1 flex-col w-full min-w-0 overflow-x-auto">
          <CargasTable data={data} onRowClick={handleRowClick} />
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-end shrink-0 w-full">
          <Pagination />
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={selectedCarga ? `Carga ${selectedCarga.numeroCarga}` : 'Detalhes da Carga'}
        icon="local_shipping"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {renderTabContent()}
      </Drawer>
    </>
  )
}
