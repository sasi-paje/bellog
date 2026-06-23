import React from 'react'

interface RouteActionsFooterProps {
  canStart: boolean
  isInProgress: boolean
  isLoading: boolean
  onBack: () => void
  onStartRoute?: () => void
  onCompleteRoute?: () => void
  onArrivalClient?: () => void
}

export const RouteActionsFooter: React.FC<RouteActionsFooterProps> = ({
  canStart,
  isInProgress,
  isLoading,
  onBack,
  onStartRoute,
  onCompleteRoute,
}) => {
  return (
    <div className="flex gap-[16px] items-center justify-center shrink-0 w-full">
      <button
        type="button"
        onClick={onBack}
        className="flex-1 h-[45px] border border-[#e67c26] border-solid bg-white flex items-center justify-center rounded-[4px]"
      >
        <span className="font-bold text-[#e67c26] text-[14px]">Voltar</span>
      </button>

      {canStart && onStartRoute && (
        <button
          type="button"
          onClick={onStartRoute}
          disabled={isLoading}
          className="flex-1 h-[45px] bg-[#e67c26] flex items-center justify-center rounded-[4px] disabled:opacity-50"
        >
          <span className="font-bold text-white text-[14px]">
            {isLoading ? 'Iniciando...' : 'Iniciar Rota'}
          </span>
        </button>
      )}

      {isInProgress && onCompleteRoute && (
        <button
          type="button"
          onClick={onCompleteRoute}
          disabled={isLoading}
          className="flex-1 h-[45px] bg-[#e67c26] flex items-center justify-center rounded-[4px] disabled:opacity-50"
        >
          <span className="font-bold text-white text-[14px]">
            {isLoading ? 'Finalizando...' : 'Finalizar Rota'}
          </span>
        </button>
      )}

      {isInProgress && !onCompleteRoute && (
        <div className="flex-1 h-[45px] bg-[#e2b93b] flex items-center justify-center rounded-[4px]">
          <span className="font-bold text-[#b7950b] text-[14px]">Em Andamento</span>
        </div>
      )}
    </div>
  )
}

export default RouteActionsFooter
