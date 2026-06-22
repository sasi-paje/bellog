interface InactivateConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  companyName: string
  action: 'activate' | 'inactivate'
  entityLabel?: string
}

const PRIMARY_DARK = '#0f3255'
const ORANGE_PRIMARY = '#e67c26'
const INACTIVATE_COLOR = '#eb5757'
const ACTIVATE_COLOR = '#2E7D32'

export const InactivateConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  companyName,
  action,
  entityLabel = 'Destino',
}: InactivateConfirmModalProps) => {
  if (!isOpen) return null

  const isActivate = action === 'activate'
  const confirmColor = isActivate ? ACTIVATE_COLOR : INACTIVATE_COLOR
  const confirmLabel = isActivate ? 'Ativar' : 'Inativar'
  const confirmLoadingLabel = isActivate ? 'Ativando...' : 'Inativando...'
  const actionVerb = isActivate ? 'ativar' : 'inativar'
  const entityLower = entityLabel.toLowerCase()

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />

      <div
        className="fixed inset-0 flex items-center justify-center z-[70] p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-[8px] shadow-xl w-full max-w-[560px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-[32px] py-[20px]">
            <h2
              className="text-center font-bold text-[18px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
            >
              Atenção
            </h2>
          </div>

          <div className="h-[1px] bg-[#e0e0e0]" />

          {/* Body */}
          <div className="px-[32px] py-[28px] flex flex-col gap-[12px]">
            <p
              className="text-center text-[14px] font-medium"
              style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
            >
              Tem certeza que deseja {actionVerb} o {entityLabel}{' '}
              <strong>{companyName}</strong>
            </p>
            {!isActivate && (
              <p
                className="text-center text-[13px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#6b7280' }}
              >
                Esta ação não remove o histórico, mas o {entityLower} não poderá ser usado em novas operações.
              </p>
            )}
          </div>

          <div className="h-[1px] bg-[#e0e0e0]" />

          {/* Footer */}
          <div className="px-[32px] py-[20px] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex items-center justify-center h-[45px] w-[150px] rounded-[5px] border disabled:opacity-50 transition-opacity"
              style={{ borderColor: ORANGE_PRIMARY }}
            >
              <span
                className="font-bold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_PRIMARY }}
              >
                Cancelar
              </span>
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center justify-center h-[45px] w-[150px] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ backgroundColor: confirmColor }}
            >
              <span
                className="font-bold text-[14px] text-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {isLoading ? confirmLoadingLabel : confirmLabel}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
