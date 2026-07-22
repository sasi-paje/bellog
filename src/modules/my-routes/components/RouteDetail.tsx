import React, { useState, useCallback, useEffect } from 'react'
import { deliveryService } from '../../delivery/services/delivery.service'
import type { MyRouteDetail } from '../types/my-routes.types'
import { NoteModal } from './NoteModal'
import { Notification } from './Notification'
import { RouteInfoTab } from './RouteInfoTab'
import { AnexosTab } from './AnexosTab'
import { RouteActionsFooter } from './RouteActionsFooter'
import { AppIcon } from '../../../shared/components/AppIcon'
import { useRouteNotes } from '../hooks/useRouteNotes'

interface RouteDetailProps {
  route: MyRouteDetail
  onBack: () => void
  onStartRoute?: () => void
  onCompleteRoute?: () => void
  onArrivalClient?: () => void
  isLoading?: boolean
  /** Já existe outra rota do motorista em andamento (só uma por vez). */
  hasRouteInProgress?: boolean
}

type TabType = 'data' | 'anexos'

const joinNames = (items: Array<{ name?: string | null }> | undefined): string =>
  items?.map(item => item.name).filter(Boolean).join(', ') || ''

const Field: React.FC<{ label: string; value?: string | null; strong?: boolean }> = ({ label, value, strong = false }) => (
  <div className="flex flex-col gap-[8px]">
    <p className="font-semibold text-[14px] leading-normal text-[#2a2a2a]">{label}</p>
    <div className="bg-white h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px]">
      <p className={`text-[14px] leading-[24px] ${strong ? 'font-bold text-[#2a2a2a]' : 'font-medium text-[#4c4c4c]'}`}>
        {value || '-'}
      </p>
    </div>
  </div>
)

export const RouteDetail: React.FC<RouteDetailProps> = ({
  route,
  onBack,
  onStartRoute,
  onCompleteRoute,
  onArrivalClient,
  isLoading = false,
  hasRouteInProgress = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('data')
  const [selectedNote, setSelectedNote] = useState<ReturnType<typeof useRouteNotes>['notes'][0] | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const { notes, isLoading: isLoadingNotes, error: notesError, refetch } = useRouteNotes(route.id)

  const deliveryStatusName = route.delivery_status?.name
  const canStart = route.status === 'available' || deliveryStatusName === 'Pendente'
  const isInProgress = route.status === 'in_progress' || deliveryStatusName === 'Em Andamento'
  // Só uma rota em andamento por vez: bloqueia iniciar esta se já há outra.
  const startBlockedByOther = hasRouteInProgress && !isInProgress
  // Rota sem notas não pode ser iniciada (regra também validada no serviço e no
  // banco). Enquanto as notas carregam, não bloqueia — o serviço revalida.
  const hasNoNotes = !isLoadingNotes && !notesError && notes.length === 0
  const startBlockedByNoNotes = canStart && hasNoNotes
  const startDisabled = startBlockedByOther || startBlockedByNoNotes
  const startDisabledReason = startBlockedByNoNotes
    ? 'Adicione pelo menos uma nota antes de iniciar o percurso.'
    : 'Finalize a rota em andamento antes de iniciar outra.'

  useEffect(() => {
    if (activeTab === 'anexos' && route.id) {
      refetch()
    }
  }, [activeTab, route.id, refetch])

  const handleCompleteRoute = useCallback(async () => {
    if (!onCompleteRoute) return

    setIsCompleting(true)
    try {
      const validation = await deliveryService.canCompleteRoute(String(route.id))

      if (!validation.canComplete) {
        // Usa a mensagem real retornada pela validação (que já considera
        // notas sem resultado, rota sem notas, erros, etc). Nunca montar aqui
        // a partir de pendingNotes — gerava o "0 nota aguardando entrega".
        setNotification({
          type: 'warning',
          message: validation.message || 'Não é possível finalizar a rota no momento.',
        })
        setIsCompleting(false)
        return
      }

      await onCompleteRoute()
      setNotification({
        type: 'success',
        message: 'Rota finalizada com sucesso.',
      })
    } catch (err) {
      console.error('[RouteDetail] handleCompleteRoute error:', err)
      setNotification({
        type: 'error',
        message: 'Erro ao finalizar a rota.',
      })
    } finally {
      setIsCompleting(false)
    }
  }, [onCompleteRoute, route.id])

  const handleNoteClick = useCallback((note: ReturnType<typeof useRouteNotes>['notes'][0]) => {
    setSelectedNote(note)
    setShowNoteModal(true)
  }, [])

  const clearNotification = useCallback(() => {
    setNotification(null)
  }, [])

  // Rota disponível — sem abas, layout compacto conforme Figma
  if (canStart) {
    return (
      <>
        <main className="flex-1 min-h-0 overflow-y-auto px-[16px] py-[16px]">
          <div className="flex flex-col gap-[16px]">
            <p className="font-bold text-[20px] leading-[19.6px] text-black">Detalhes da Rota</p>

            <Field label="Número da rota" value={route.route_code} />
            <Field label="Nome da Rota" value={route.area_description} />
            <Field label="Responsável" value={joinNames(route.responsibles)} />

            <div className="border-t border-[#E5E7EB]" />

            {/* Destino */}
            <div className="flex flex-col gap-[8px]">
              <p className="font-semibold text-[14px] leading-normal text-[#2a2a2a]">Destino</p>
              {route.destinations.length > 0 ? (
                <div className="flex flex-col gap-[16px]">
                  {route.destinations.map((dest, index) => (
                    <div key={dest.id || index} className="bg-white h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] gap-[4px]">
                      <AppIcon name="location_on" size={24} color="#F47B20" />
                      <p className="font-medium text-[14px] leading-[24px] text-[#2a2a2a] truncate">
                        {dest.company_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px]">
                  <p className="font-medium text-[14px] leading-[24px] text-[#4c4c4c]">-</p>
                </div>
              )}
            </div>

            <div className="border-t border-[#E5E7EB]" />

            <Field label="Motorista" value={joinNames(route.drivers)} strong />
            <Field label="Veículo" value={route.vehicle?.plate} strong />
            <Field label="Ajudante" value={joinNames(route.helpers)} />
          </div>
        </main>

        <footer
          className="shrink-0 border-t border-[#eeeeee] bg-white px-[16px] py-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-[16px]">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 h-[45px] border border-[#e67c26] bg-white flex items-center justify-center rounded-[4px] px-[8px] py-[2px]"
              >
                <span className="font-bold text-[14px] leading-[20px] text-[#e67c26]">Voltar</span>
              </button>
              {onStartRoute && (
                <button
                  type="button"
                  onClick={onStartRoute}
                  disabled={isLoading || startDisabled}
                  className="flex-1 h-[45px] bg-[#e67c26] flex items-center justify-center rounded-[4px] px-[8px] py-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-bold text-[14px] leading-[20px] text-white">
                    {isLoading ? 'Iniciando...' : 'Iniciar Rota'}
                  </span>
                </button>
              )}
            </div>
            {onStartRoute && startDisabled && (
              <p className="text-[12px] text-center text-[#b7950b] leading-snug">{startDisabledReason}</p>
            )}
          </div>
        </footer>

        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={clearNotification}
          />
        )}
      </>
    )
  }

  // Rota em andamento ou finalizada — com abas
  return (
    <>
      {/* Abas */}
      <div className="shrink-0 grid grid-cols-2 h-[52px] border-b border-[#eeeeee] bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className="relative flex items-center justify-center h-full"
        >
          <span className={`font-medium text-[14px] ${activeTab === 'data' ? 'text-[#161a36]' : 'text-[#919191]'}`}>
            Dados da Rota
          </span>
          {activeTab === 'data' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F47B20]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('anexos')}
          className="relative flex items-center justify-center h-full"
        >
          <span className={`font-medium text-[14px] ${activeTab === 'anexos' ? 'text-[#161a36]' : 'text-[#919191]'}`}>
            Anexos
          </span>
          {activeTab === 'anexos' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F47B20]" />
          )}
        </button>
      </div>

      {/* Conteúdo rolável */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {activeTab === 'anexos' ? (
          <AnexosTab
            notes={notes}
            isLoading={isLoadingNotes}
            error={notesError}
            onRetry={refetch}
            onNoteClick={handleNoteClick}
          />
        ) : (
          <RouteInfoTab route={route} />
        )}
      </main>

      {/* Rodapé */}
      <footer
        className="shrink-0 border-t border-[#eeeeee] bg-white px-4 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <RouteActionsFooter
          canStart={canStart}
          isInProgress={isInProgress}
          isLoading={isLoading || isCompleting}
          startDisabled={startDisabled}
          startDisabledReason={startDisabledReason}
          onBack={onBack}
          onStartRoute={onStartRoute}
          onCompleteRoute={handleCompleteRoute}
          onArrivalClient={onArrivalClient}
        />
      </footer>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={clearNotification}
        />
      )}

      {showNoteModal && selectedNote && (
        <NoteModal
          note={selectedNote}
          onClose={() => setShowNoteModal(false)}
        />
      )}
    </>
  )
}

export default RouteDetail
