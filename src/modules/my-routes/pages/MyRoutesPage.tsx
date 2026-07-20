import React, { useEffect, useMemo, useState } from 'react'
import { useMyRoutes } from '../hooks/useMyRoutes'
import { RouteCardFigma, InProgressRouteCardFigma, EmptyInProgressMessageFigma } from '../components/RouteCard'
import { RouteDetail } from '../components/RouteDetail'
import { StartRouteModal } from '../components/StartRouteModal'
import { CompleteRouteModal } from '../components/CompleteRouteModal'
import { Notification } from '../components/Notification'
import { AppIcon } from '../../../shared/components/AppIcon'
import { MobilePageShell } from '../../../shared/components'
import type { MyRouteListItem } from '../types/my-routes.types'

interface MyRoutesPageProps {
  onBack?: () => void
  initialRouteId?: string | null
  onNavigate?: (page: string, routeId?: string) => void
  onArrivalClient?: (routeId: string) => void
  driverId?: string | null
}

interface RouteFilters {
  routeCode: string
  routeName: string
}

const emptyFilters: RouteFilters = {
  routeCode: '',
  routeName: '',
}

const EmptyRouteCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-[58px] w-full items-center justify-center rounded-[6px] border border-[#bdbdbd] bg-white px-[16px] py-[12px]">
    <span className="text-center text-[14px] font-medium leading-[19.6px] text-[#4c4c4c]">
      {children}
    </span>
  </div>
)

const InlineEmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex w-full items-center justify-center px-[16px] py-[10px]">
    <span className="text-center text-[14px] font-medium leading-[19.6px] text-[#919191]">
      {children}
    </span>
  </div>
)

const LoadingRouteCard = () => (
  <EmptyRouteCard>Carregando...</EmptyRouteCard>
)

const normalizeText = (value?: string) => value?.trim().toLowerCase() || ''

const uniqueRoutes = (routes: MyRouteListItem[]) => {
  const seen = new Set<string>()
  return routes.filter(route => {
    if (seen.has(route.id)) return false
    seen.add(route.id)
    return true
  })
}

const filterRoutes = (routes: MyRouteListItem[], filters: RouteFilters) => {
  const code = normalizeText(filters.routeCode)
  const name = normalizeText(filters.routeName)

  return uniqueRoutes(routes).filter(route => {
    const matchesCode = !code || normalizeText(route.route_code).includes(code)
    const matchesName = !name || normalizeText(route.area_description).includes(name)
    return matchesCode && matchesName
  })
}

export const MyRoutesPage: React.FC<MyRoutesPageProps> = ({ initialRouteId, onArrivalClient, driverId }) => {
  const [showOnlyInProgress, setShowOnlyInProgress] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState<RouteFilters>(emptyFilters)
  const [draftFilters, setDraftFilters] = useState<RouteFilters>(emptyFilters)

  const {
    activeTab,
    setActiveTab,
    routesInProgress,
    availableRoutes,
    completedRoutes,
    selectedRoute,
    selectedRouteId,
    isLoading,
    isLoadingDetail,
    error,
    errorDetail,
    isDetailOpen,
    confirmStartData,
    confirmCompleteData,
    successMessage,
    openRouteDetail,
    closeRouteDetail,
    openStartConfirm,
    closeStartConfirm,
    openCompleteConfirm,
    closeCompleteConfirm,
    startRoute,
    completeRoute,
    clearSuccessMessage,
    clearError,
    fetchRoutes,
  } = useMyRoutes(driverId)

  const hasRouteFilters = Boolean(filters.routeCode.trim() || filters.routeName.trim())

  const filteredRoutesInProgress = useMemo(
    () => filterRoutes(routesInProgress, filters),
    [routesInProgress, filters]
  )

  const filteredAvailableRoutes = useMemo(
    () => filterRoutes(availableRoutes, filters),
    [availableRoutes, filters]
  )

  const filteredCompletedRoutes = useMemo(
    () => filterRoutes(completedRoutes, filters),
    [completedRoutes, filters]
  )

  const openFilters = () => {
    setDraftFilters(filters)
    setIsFilterOpen(true)
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setIsFilterOpen(false)
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    setDraftFilters(emptyFilters)
    setShowOnlyInProgress(false)
  }

  useEffect(() => {
    if (initialRouteId) {
      openRouteDetail(initialRouteId)
    }
  }, [initialRouteId, openRouteDetail])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(clearSuccessMessage, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, clearSuccessMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  // Card unificado — mesmo shell para lista e detalhes
  return (
    <MobilePageShell>
      <div className="w-full h-[calc(100dvh-32px)] rounded-2xl bg-white shadow-md flex flex-col overflow-hidden">

        {isDetailOpen ? (
          selectedRoute ? (
            // Detalhes carregados: RouteDetail renderiza apenas conteúdo (sem shell própria)
            <RouteDetail
              route={selectedRoute}
              onBack={closeRouteDetail}
              onStartRoute={() => openStartConfirm(selectedRoute)}
              onCompleteRoute={() => openCompleteConfirm(selectedRoute)}
              onArrivalClient={() => onArrivalClient?.(selectedRoute.id)}
              isLoading={isLoading}
              hasRouteInProgress={routesInProgress.length > 0}
            />
          ) : (
            // Loading / erro — mesma estrutura de abas, sem header
            <>
              <div className="shrink-0 grid grid-cols-2 h-[52px] border-b border-[#eeeeee] bg-white">
                <button type="button" className="relative flex items-center justify-center h-full">
                  <span className="font-medium text-[14px] text-[#161a36]">Dados da Rota</span>
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F47B20]" />
                </button>
                <button type="button" className="relative flex items-center justify-center h-full">
                  <span className="font-medium text-[14px] text-[#919191]">Anexos</span>
                </button>
              </div>

              <main className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
                {isLoadingDetail ? (
                  <div className="flex flex-col gap-[12px] pt-[4px]">
                    <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
                    <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                    <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                    <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-[16px] py-[32px] text-center">
                    <p className="text-[14px] text-state-error-dark">
                      {errorDetail || 'Não foi possível carregar os detalhes da rota.'}
                    </p>
                    {selectedRouteId && (
                      <button
                        type="button"
                        onClick={() => openRouteDetail(selectedRouteId)}
                        className="flex h-[40px] items-center justify-center rounded-[4px] bg-[#e67c26] px-[16px]"
                      >
                        <span className="text-[14px] font-bold text-white">Tentar novamente</span>
                      </button>
                    )}
                  </div>
                )}
              </main>

              <footer
                className="shrink-0 border-t border-[#eeeeee] bg-white px-4 py-3"
                style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
              >
                <button
                  type="button"
                  onClick={closeRouteDetail}
                  className="flex h-[45px] w-full items-center justify-center rounded-[4px] border border-[#e67c26] bg-white"
                >
                  <span className="text-[14px] font-bold text-[#e67c26]">Voltar</span>
                </button>
              </footer>
            </>
          )
        ) : (
          // Lista: mesma estrutura visual do card
          <>
            {/* Título */}
            <div className="shrink-0 px-4 pt-4">
              <h1 className="text-[20px] font-bold text-[#001B44] mb-4">Rotas</h1>
              <div className="border-b mb-4" />
            </div>

            {/* Área de conteúdo */}
            <div className="flex flex-col gap-4 flex-1 min-h-0 px-4">
              {/* Tabs */}
              <div className="flex h-[44px] w-full shrink-0 border-b border-[#eeeeee] bg-white">
                <button
                  type="button"
                  onClick={() => setActiveTab('available')}
                  className={`flex h-full flex-1 items-center justify-center px-[8px] text-[14px] font-medium leading-[24px] text-[#161a36] ${
                    activeTab === 'available' ? 'border-b-2 border-[#e67c26]' : ''
                  }`}
                >
                  Disponíveis
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`flex h-full flex-1 items-center justify-center px-[8px] text-[14px] font-medium leading-[24px] text-[#161a36] ${
                    activeTab === 'completed' ? 'border-b-2 border-[#e67c26]' : ''
                  }`}
                >
                  Finalizadas
                </button>
              </div>

              {/* Filtro e checkbox */}
              <div className="flex shrink-0 items-center justify-between gap-[12px]">
                {activeTab === 'available' ? (
                  <label className="flex min-w-0 flex-1 items-center gap-[8px] text-[13px] font-medium leading-[18px] text-[#4c4c4c]">
                    <input
                      type="checkbox"
                      checked={showOnlyInProgress}
                      onChange={(event) => setShowOnlyInProgress(event.target.checked)}
                      className="h-[16px] w-[16px] shrink-0 accent-[#e67c26]"
                    />
                    <span>Mostrar apenas em Andamento</span>
                  </label>
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  type="button"
                  onClick={openFilters}
                  className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[4px] border border-[#F58220] bg-white outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F58220]"
                  aria-label="Abrir filtros"
                >
                  <AppIcon name="filter_alt" size={18} color="#F58220" />
                </button>
              </div>

              {/* Lista rolável */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {error && (
                  <div className="mb-[12px] flex items-center justify-between rounded-[4px] bg-state-error-light p-[12px] text-[14px] text-state-error-dark">
                    <span>{error}</span>
                    <button type="button" onClick={fetchRoutes} className="ml-[8px] text-[12px] underline">
                      Tentar novamente
                    </button>
                  </div>
                )}

                {activeTab === 'available' ? (
                  <div className="flex flex-col gap-[16px]">
                    <section className="flex flex-col gap-[8px]">
                      <h3 className="text-[16px] font-bold leading-[19.6px] text-[#231f20]">
                        Rotas em Andamento
                      </h3>
                      {isLoading ? (
                        <LoadingRouteCard />
                      ) : filteredRoutesInProgress.length > 0 ? (
                        filteredRoutesInProgress.map(route => (
                          <InProgressRouteCardFigma
                            key={route.id}
                            route={route}
                            onPress={(r) => openRouteDetail(r.id)}
                          />
                        ))
                      ) : hasRouteFilters ? (
                        <EmptyRouteCard>Nenhuma rota encontrada</EmptyRouteCard>
                      ) : (
                        <EmptyInProgressMessageFigma showHint={filteredAvailableRoutes.length > 0} />
                      )}
                    </section>

                    {!showOnlyInProgress && (
                      <section className="flex flex-col gap-[8px]">
                        <h3 className="text-[16px] font-bold leading-[19.6px] text-[#231f20]">
                          Rotas Disponíveis
                        </h3>
                        {isLoading ? (
                          <LoadingRouteCard />
                        ) : filteredAvailableRoutes.length > 0 ? (
                          filteredAvailableRoutes.map(route => (
                            <RouteCardFigma
                              key={route.id}
                              route={route}
                              onPress={(r) => openRouteDetail(r.id)}
                            />
                          ))
                        ) : hasRouteFilters ? (
                          <EmptyRouteCard>Nenhuma rota encontrada</EmptyRouteCard>
                        ) : (
                          <InlineEmptyState>Nenhuma rota disponível</InlineEmptyState>
                        )}
                      </section>
                    )}
                  </div>
                ) : (
                  <section className="flex flex-col gap-[8px]">
                    <h3 className="text-[16px] font-bold leading-[19.6px] text-[#231f20]">
                      Rotas Finalizadas
                    </h3>
                    {isLoading ? (
                      <LoadingRouteCard />
                    ) : filteredCompletedRoutes.length > 0 ? (
                      filteredCompletedRoutes.map(route => (
                        <RouteCardFigma
                          key={route.id}
                          route={route}
                          onPress={(r) => openRouteDetail(r.id)}
                        />
                      ))
                    ) : hasRouteFilters ? (
                      <EmptyRouteCard>Nenhuma rota encontrada</EmptyRouteCard>
                    ) : (
                      <InlineEmptyState>Nenhuma rota finalizada</InlineEmptyState>
                    )}
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter modal (fixed overlay) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 px-[12px] pb-[12px]">
          <div className="w-full max-w-[430px] rounded-[8px] border border-[#d9d9d9] bg-white p-[16px] shadow-[0_8px_24px_rgba(22,26,54,0.18)]">
            <div className="mb-[12px] flex items-center justify-between">
              <h2 className="text-[16px] font-bold leading-[19.6px] text-[#231f20]">Filtros</h2>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="text-[13px] font-bold text-[#4c4c4c]"
              >
                Cancelar
              </button>
            </div>

            <div className="flex flex-col gap-[12px]">
              <label className="flex flex-col gap-[6px] text-[13px] font-semibold text-[#161a36]">
                Código/número da rota
                <input
                  type="text"
                  value={draftFilters.routeCode}
                  onChange={(event) => setDraftFilters(prev => ({ ...prev, routeCode: event.target.value }))}
                  className="h-[40px] rounded-[5px] border border-[#d9d9d9] bg-white px-[12px] text-[14px] font-normal text-[#2a2a2a] outline-none focus:border-[#e67c26]"
                  placeholder="Ex.: ROTA-001"
                />
              </label>
              <label className="flex flex-col gap-[6px] text-[13px] font-semibold text-[#161a36]">
                Nome da rota
                <input
                  type="text"
                  value={draftFilters.routeName}
                  onChange={(event) => setDraftFilters(prev => ({ ...prev, routeName: event.target.value }))}
                  className="h-[40px] rounded-[5px] border border-[#d9d9d9] bg-white px-[12px] text-[14px] font-normal text-[#2a2a2a] outline-none focus:border-[#e67c26]"
                  placeholder="Digite o nome"
                />
              </label>
            </div>

            <div className="mt-[16px] flex gap-[8px]">
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-[42px] flex-1 items-center justify-center rounded-[4px] border border-[#bdbdbd] bg-white text-[14px] font-bold text-[#4c4c4c]"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex h-[42px] flex-1 items-center justify-center rounded-[4px] bg-[#e67c26] text-[14px] font-bold text-white"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais de ação da rota */}
      {confirmStartData && (
        <StartRouteModal
          data={confirmStartData}
          onConfirm={() => startRoute(confirmStartData.route_id)}
          onCancel={closeStartConfirm}
          isLoading={isLoading}
        />
      )}

      {confirmCompleteData && (
        <CompleteRouteModal
          data={confirmCompleteData}
          onConfirm={() => completeRoute(confirmCompleteData.id)}
          onCancel={closeCompleteConfirm}
          isLoading={isLoading}
        />
      )}

      {successMessage && (
        <Notification
          type="success"
          message={successMessage}
          onClose={clearSuccessMessage}
        />
      )}
    </MobilePageShell>
  )
}

export default MyRoutesPage
