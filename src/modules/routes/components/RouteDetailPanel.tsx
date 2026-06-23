import { AppIcon, SecondaryButton } from '../../../shared/components'

type TabName = 'dados-rota' | 'notas-fiscais' | 'historico'

interface RouteDetailPanelProps {
  routeData: {
    numeroRota: string
    saida: string
    areaRota: string
    placa: string
    responsavel: string
    motorista: string
    cargaMaxima: number
    cargaUtilizada: number
    statusEntrega: string
    status: string
  }
  activeTab: TabName
  onTabChange: (tab: TabName) => void
}

const TABS: { id: TabName; label: string }[] = [
  { id: 'dados-rota', label: 'Dados de Rota' },
  { id: 'notas-fiscais', label: 'Notas Fiscais' },
  { id: 'historico', label: 'Histórico' },
]

const SECONDARY = '#e67c26'
const TEXT = '#2a2a2a'

export const RouteDetailPanel = ({
  routeData,
  activeTab,
  onTabChange,
}: RouteDetailPanelProps) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dados-rota':
        return (
          <div className="flex flex-col gap-4">
            {/* Dados da Rota */}
            <div>
              <h3
                className="font-semibold text-[14px] mb-3"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
              >
                Dados da Rota
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Número da Rota</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.numeroRota}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Saída</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.saida}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Área da Rota</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.areaRota}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Status de Entrega</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.statusEntrega}
                  </span>
                </div>
              </div>
            </div>

            {/* Dados do Veículo */}
            <div>
              <h3
                className="font-semibold text-[14px] mb-3"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
              >
                Dados do Veículo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Placa</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.placa}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Carga Máxima</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.cargaMaxima} kg
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Carga Utilizada</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.cargaUtilizada} kg
                  </span>
                </div>
              </div>
            </div>

            {/* Dados do Responsável */}
            <div>
              <h3
                className="font-semibold text-[14px] mb-3"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}
              >
                Dados do Responsável
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Responsável</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.responsavel}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#6b7280]">Motorista</span>
                  <span className="text-[14px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: TEXT }}>
                    {routeData.motorista}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'notas-fiscais':
        return (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] text-[#6b7280]">Nenhuma nota fiscal vinculada.</p>
          </div>
        )

      case 'historico':
        return (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] text-[#6b7280]">Nenhum histórico disponível.</p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e0e0e0] mb-4 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-[14px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[#e67c26] text-[#e67c26]'
                : 'text-[#6b7280] hover:text-[#2a2a2a]'
            }`}
            style={{
              fontFamily: 'Inter, sans-serif',
              color: activeTab === tab.id ? SECONDARY : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #e67c26' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#e0e0e0] shrink-0">
        <SecondaryButton label="Inativar" />
        <SecondaryButton label="Editar" />
      </div>
    </div>
  )
}