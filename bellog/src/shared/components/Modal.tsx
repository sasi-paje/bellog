import { AppIcon } from './AppIcon'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: 'road' | 'contract' | 'pallet' | 'delivery_truck_speed' | 'work'
  children: React.ReactNode
  showFooter?: boolean
  onBack?: () => void
  onConfirm?: () => void
  confirmLabel?: string
  backLabel?: string
  confirmDisabled?: boolean
}

const PRIMARY_DARK = '#0f3255'
const SECONDARY = '#4077d9'

export const Modal = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  showFooter = true,
  onBack,
  onConfirm,
  confirmLabel = 'Editar',
  backLabel = 'Voltar',
  confirmDisabled = false,
}: ModalProps) => {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal - painel lateral direito */}
      <div className="fixed inset-0 flex items-center justify-end z-50">
        <div className="bg-white flex flex-col h-full w-[850px] max-w-[850px] overflow-hidden p-[32px]">
          {/* Header */}
          <div className="flex items-center justify-between h-[24px] shrink-0 mb-4">
            <div className="flex items-center gap-[8px] w-[450px]">
              {icon && (
                <div className="w-[32px] h-[32px] flex items-center justify-center">
                  <AppIcon name={icon} size={24} color={PRIMARY_DARK} />
                </div>
              )}
              <h2
                className="font-semibold text-[24px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-[32px] h-[32px]"
            >
              <span
                className="font-semibold text-[20px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                X
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-0 w-full shrink-0 mb-4">
            <div className="border-t border-[#e0e0e0]" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto w-full">
            {children}
          </div>

          {/* Divider */}
          <div className="h-0 w-full shrink-0 mt-4">
            <div className="border-t border-[#e0e0e0]" />
          </div>

          {/* Footer */}
          {showFooter && (
            <div className="flex items-center justify-between h-[45px] shrink-0 w-full mt-4">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[5px] border border-[#4077d9] bg-white w-[150px]"
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: SECONDARY }}
                >
                  {backLabel}
                </span>
              </button>
              <button
                type="button"
                onClick={confirmDisabled ? undefined : (onConfirm || onClose)}
                disabled={confirmDisabled}
                className={`flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] ${
                  confirmDisabled
                    ? 'bg-[#919191] cursor-not-allowed'
                    : 'bg-[#919191] cursor-pointer'
                }`}
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {confirmLabel}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
