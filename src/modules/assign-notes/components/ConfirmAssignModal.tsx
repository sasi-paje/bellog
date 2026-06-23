import { AppIcon } from '../../../shared/components'

interface NoteItem {
  id: string
  invoice_number: string
  weight: number
  fornecedor?: string
}

interface RouteCardData {
  id: string
  tipoRota: string
  numeroRota: string
  veiculo: string
}

interface ConfirmAssignModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  note: NoteItem | null
  route: RouteCardData | null
  loading?: boolean
}

const SECONDARY_DEFAULT = '#e67c26'

export const ConfirmAssignModal = ({
  isOpen,
  onClose,
  onConfirm,
  note,
  route,
  loading = false,
}: ConfirmAssignModalProps) => {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-8">
        <div className="bg-white rounded-[8px] w-full min-w-[50vw] flex flex-col overflow-hidden shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between h-[60px] px-8 shrink-0 border-b border-[#e0e0e0]">
            <h2
              className="font-semibold text-[24px]"
              style={{ fontFamily: 'Inter, sans-serif', color: '#0f3255' }}
            >
              Adicionar Nota
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-[32px] h-[32px] rounded hover:bg-[#f0f0f0] transition-colors"
            >
              <span
                className="font-semibold text-[20px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#0f3255' }}
              >
                X
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-6 p-8">
            <div className="flex items-center gap-4 p-4 bg-[#f5f9ff] rounded-[8px] border border-[#4077d9]/20">
              <div className="w-[48px] h-[48px] rounded-full bg-[#4077d9]/10 flex items-center justify-center">
                <AppIcon name="contract" size={24} color="#4077d9" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[16px] text-[#2a2a2a]">
                  NF {note?.invoice_number}
                </span>
                <span className="font-medium text-[14px] text-[#828282]">
                  {note?.weight} KG
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-[#f5f9ff] rounded-[8px] border border-[#4077d9]/20">
              <div className="w-[48px] h-[48px] rounded-full bg-[#4077d9]/10 flex items-center justify-center">
                <AppIcon name="road" size={24} color="#4077d9" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[16px] text-[#2a2a2a]">
                  {route?.numeroRota || 'Nova Rota'}
                </span>
                <span className="font-medium text-[14px] text-[#828282]">
                  Veículo: {route?.veiculo}
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#fff8e6] rounded-[8px] border border-[#e67c26]/20">
              <div className="flex items-start gap-3">
                <div className="w-[20px] h-[20px] shrink-0 mt-0.5">
                  <AppIcon name="info" size={20} color={SECONDARY_DEFAULT} />
                </div>
                <p className="font-medium text-[14px] text-[#2a2a2a] leading-relaxed">
                  Você só poderá remover notas associadas antes da rota ser iniciada pelo motorista
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 h-[45px] px-8 shrink-0 border-t border-[#e0e0e0]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex items-center justify-center h-[40px] px-[16px] py-[2px] rounded-[4px] border border-[#4077d9] bg-white text-[#4077d9] font-bold text-[14px] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center justify-center h-[40px] px-[16px] py-[2px] rounded-[4px] bg-[#4077d9] text-white font-bold text-[14px] disabled:opacity-50 hover:bg-[#3569c4] transition-colors"
            >
              {loading ? 'Adicionando...' : 'Adicionar Nota'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}