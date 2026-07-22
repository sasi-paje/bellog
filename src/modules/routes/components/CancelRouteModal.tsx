import { useState, useEffect } from 'react'
import { routeService } from '../../../features/routes/api/route.service'

interface CancelRouteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reasonId: string, note?: string) => void
  isLoading?: boolean
  routeCode: string
}

const PRIMARY_DARK = '#0f3255'
const ORANGE_PRIMARY = '#e67c26'
const CANCEL_COLOR = '#eb5757'

export const CancelRouteModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  routeCode,
}: CancelRouteModalProps) => {
  const [reasons, setReasons] = useState<Array<{ id: string; name: string }>>([])
  const [reasonId, setReasonId] = useState('')
  const [note, setNote] = useState('')
  const [loadingReasons, setLoadingReasons] = useState(false)
  const [reasonsError, setReasonsError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setReasonId('')
    setNote('')
    setReasonsError(null)
    setLoadingReasons(true)
    routeService
      .getCancelReasons()
      .then(setReasons)
      .catch((err) => {
        console.error('[CancelRouteModal] Erro ao carregar motivos:', err)
        setReasonsError('Não foi possível carregar os motivos. Tente novamente.')
      })
      .finally(() => setLoadingReasons(false))
  }, [isOpen])

  if (!isOpen) return null

  const canConfirm = !!reasonId && !isLoading

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
              Cancelar Rota
            </h2>
          </div>

          <div className="h-[1px] bg-[#e0e0e0]" />

          {/* Body */}
          <div className="px-[32px] py-[24px] flex flex-col gap-[16px]">
            <p
              className="text-center text-[14px] font-medium"
              style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
            >
              Você está cancelando a Rota <strong>{routeCode}</strong>. As notas sem entrega
              voltarão a ficar disponíveis; as entregas já registradas permanecem no histórico.
            </p>

            <div className="flex flex-col gap-[6px]">
              <label
                className="text-[13px] font-semibold"
                style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
              >
                Motivo do cancelamento *
              </label>
              <select
                value={reasonId}
                onChange={(e) => setReasonId(e.target.value)}
                disabled={loadingReasons || isLoading}
                className="h-[45px] px-[12px] rounded-[5px] border border-[#d0d0d0] text-[14px] bg-white disabled:opacity-60"
                style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
              >
                <option value="">
                  {loadingReasons ? 'Carregando motivos...' : 'Selecione um motivo'}
                </option>
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {reasonsError && (
                <span className="text-[12px]" style={{ color: CANCEL_COLOR }}>
                  {reasonsError}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-[6px]">
              <label
                className="text-[13px] font-semibold"
                style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
              >
                Observação (opcional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isLoading}
                rows={3}
                maxLength={500}
                className="px-[12px] py-[8px] rounded-[5px] border border-[#d0d0d0] text-[14px] bg-white resize-none disabled:opacity-60"
                style={{ fontFamily: 'Inter, sans-serif', color: '#2a2a2a' }}
                placeholder="Detalhe o motivo, se necessário."
              />
            </div>
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
              <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_PRIMARY }}>
                Voltar
              </span>
            </button>

            <button
              type="button"
              onClick={() => canConfirm && onConfirm(reasonId, note)}
              disabled={!canConfirm}
              className="flex items-center justify-center h-[45px] w-[180px] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ backgroundColor: CANCEL_COLOR }}
            >
              <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                {isLoading ? 'Cancelando...' : 'Cancelar Rota'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CancelRouteModal
