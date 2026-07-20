import React from 'react'

interface TermsAcceptanceModalProps {
  isOpen: boolean
  /** URL do PDF do Termo de Uso (servido de public/). */
  url?: string
  accepting?: boolean
  onAccept: () => void
  onDecline: () => void
  /** Fechar (X) — apenas dispensa o modal; reaparece no próximo acesso. */
  onClose: () => void
}

/**
 * Modal de aceite do Termo de Uso. Exibido no login/primeiro acesso enquanto o
 * usuário não aceitou. X no topo (dispensa), Aceita/Não Aceita no rodapé.
 */
export const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({
  isOpen,
  url = '/termos-de-uso.pdf',
  accepting = false,
  onAccept,
  onDecline,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Termo de Uso"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      <div className="relative flex h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[8px] bg-white shadow-xl">
        {/* Header com X */}
        <div className="flex items-center justify-between border-b border-[#e0e0e0] px-5 py-3">
          <h2 className="text-[16px] font-bold text-[#0f3255]">Termo de Uso</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-gray-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* PDF */}
        <div className="flex-1 bg-[#525659]">
          <iframe src={url} title="Termo de Uso" className="h-full w-full border-0" />
        </div>

        {/* Rodapé: Não Aceita / Aceita */}
        <div className="flex items-center justify-end gap-3 border-t border-[#e0e0e0] px-5 py-3">
          <button
            type="button"
            onClick={onDecline}
            disabled={accepting}
            className="flex h-[45px] w-[150px] items-center justify-center rounded-[5px] border border-[#c7392c] bg-white text-[14px] font-bold text-[#c7392c] transition-colors hover:bg-[#fdeceb] disabled:opacity-50"
          >
            Não Aceita
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting}
            className="flex h-[45px] w-[150px] items-center justify-center gap-2 rounded-[5px] bg-[#e67c26] text-[14px] font-bold text-white transition-colors hover:bg-[#d06c1e] disabled:opacity-70"
          >
            {accepting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {accepting ? 'Salvando...' : 'Aceita'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TermsAcceptanceModal
