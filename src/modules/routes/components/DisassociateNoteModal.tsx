interface DisassociateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  invoiceNumber: string
  routeCode: string
  /** Esta é a última nota ativa da rota? Muda o texto e oferece inativar. */
  isLastNote?: boolean
  /** Remover a nota E inativar a rota (só usado quando isLastNote). */
  onRemoveAndInactivate?: () => void
}

const PRIMARY_DARK = '#0f3255'
const ORANGE_PRIMARY = '#e67c26'
const DISASSOCIATE_COLOR = '#eb5757'

export const DisassociateNoteModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  invoiceNumber,
  routeCode,
  isLastNote = false,
  onRemoveAndInactivate,
}: DisassociateNoteModalProps) => {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4" onClick={onClose}>
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
              Tem certeza que deseja desassociar a Nota <strong>{invoiceNumber}</strong> da Rota{' '}
              <strong>{routeCode}</strong>?
            </p>
            {isLastNote ? (
              <p
                className="text-center text-[13px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#C0392B' }}
              >
                Esta é a última nota da rota. Ao removê-la, a rota ficará sem entregas e
                não poderá ser iniciada pelo motorista.
              </p>
            ) : (
              <p
                className="text-center text-[13px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#6b7280' }}
              >
                A nota voltará a ficar disponível para atribuição em outra rota. Esta ação não remove o histórico.
              </p>
            )}
          </div>

          <div className="h-[1px] bg-[#e0e0e0]" />

          {/* Footer */}
          {isLastNote ? (
            <div className="px-[32px] py-[20px] flex flex-col gap-[12px]">
              <div className="flex items-center justify-between gap-[12px]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex items-center justify-center h-[45px] flex-1 rounded-[5px] border disabled:opacity-50 transition-opacity"
                  style={{ borderColor: ORANGE_PRIMARY }}
                >
                  <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_PRIMARY }}>
                    Cancelar
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex items-center justify-center h-[45px] flex-1 rounded-[4px] border disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ borderColor: DISASSOCIATE_COLOR }}
                >
                  <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: DISASSOCIATE_COLOR }}>
                    {isLoading ? 'Removendo...' : 'Remover nota'}
                  </span>
                </button>
              </div>
              {onRemoveAndInactivate && (
                <button
                  type="button"
                  onClick={onRemoveAndInactivate}
                  disabled={isLoading}
                  className="flex items-center justify-center h-[45px] w-full rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ backgroundColor: DISASSOCIATE_COLOR }}
                >
                  <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {isLoading ? 'Processando...' : 'Remover e inativar rota'}
                  </span>
                </button>
              )}
            </div>
          ) : (
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
                style={{ backgroundColor: DISASSOCIATE_COLOR }}
              >
                <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {isLoading ? 'Desassociando...' : 'Desassociar'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
