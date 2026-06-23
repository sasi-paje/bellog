import React from 'react'

interface ArrivalClientModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  isConfirmDisabled?: boolean
  children?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export const ArrivalClientModal: React.FC<ArrivalClientModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Registrar',
  cancelLabel = 'Voltar',
  isLoading = false,
  isConfirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-[24px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arrival-client-modal-title"
        className="arrival-client-modal bg-white flex w-full max-w-[327px] flex-col gap-[16px] rounded-[8px] p-[16px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.20)]"
      >
        <h2 id="arrival-client-modal-title" className="text-[20px] font-bold leading-[19.6px] text-[#231f20]">
          {title}
        </h2>

        <div className="h-0 w-full border-t border-[#bdbdbd]" />

        <p className="text-[14px] font-medium leading-[19.6px] text-[#2a2a2a]">
          {message}
        </p>

        {children}

        <div className="flex gap-[16px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex h-[45px] flex-1 items-center justify-center rounded-[4px] border border-[#e67c26] bg-white px-[8px] py-[2px] text-[14px] font-bold text-[#e67c26] transition-colors hover:bg-[#fff7f1] focus:outline-none focus:ring-2 focus:ring-[#e67c26]/30 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || isConfirmDisabled}
            className="flex h-[45px] flex-1 items-center justify-center rounded-[4px] bg-[#e67c26] px-[8px] py-[2px] text-[14px] font-bold text-white transition-colors hover:bg-[#cf6f22] focus:outline-none focus:ring-2 focus:ring-[#e67c26]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-[8px]">
                <LoadingSpinner />
                Enviando...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
