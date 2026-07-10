import { AppIcon } from '../../../shared/components'

interface CapacityExceededModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  carga: number
  capacidade: number
  loading?: boolean
}

const PRIMARY_DARK = '#0f3255'
const ORANGE_PRIMARY = '#e67c26'

const fmt = (n: number) => `${Math.round(n * 10) / 10} kg`

export const CapacityExceededModal = ({
  isOpen,
  onClose,
  onConfirm,
  carga,
  capacidade,
  loading = false,
}: CapacityExceededModalProps) => {
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
          <div className="px-[32px] py-[20px] flex items-center justify-center gap-2">
            <AppIcon name="warning" size={22} color={ORANGE_PRIMARY} />
            <h2
              className="text-center font-bold text-[18px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
            >
              Carga máxima excedida
            </h2>
          </div>

          <div className="h-[1px] bg-[#e0e0e0]" />

          {/* Body */}
          <div className="px-[32px] py-[28px] flex flex-col gap-[12px]">
            <p
              className="text-center text-[14px] font-medium"
              style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
            >
              A carga atual <strong>{fmt(carga)}</strong> ultrapassa a capacidade máxima do veículo{' '}
              <strong>{fmt(capacidade)}</strong>.
            </p>
            <p
              className="text-center text-[13px] font-semibold"
              style={{ fontFamily: 'Inter, sans-serif', color: '#c7392c' }}
            >
              Deseja confirmar mesmo assim?
            </p>
          </div>

          <div className="h-[1px] bg-[#e0e0e0]" />

          {/* Footer */}
          <div className="px-[32px] py-[20px] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex items-center justify-center h-[45px] w-[150px] rounded-[5px] border disabled:opacity-50 transition-opacity"
              style={{ borderColor: ORANGE_PRIMARY }}
            >
              <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_PRIMARY }}>
                Cancelar
              </span>
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center justify-center h-[45px] w-[150px] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ backgroundColor: ORANGE_PRIMARY }}
            >
              <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                {loading ? 'Salvando...' : 'Confirmar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
