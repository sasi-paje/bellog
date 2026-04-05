import { AppIcon } from '../../../shared/components'
import { OccurrenceDetail } from '../data/historico.mock'

interface OccurrenceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  detail: OccurrenceDetail | null
}

const TEXT_DARK = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const SECONDARY_DEFAULT = '#e67c26'

export const OccurrenceDetailModal = ({ isOpen, onClose, detail }: OccurrenceDetailModalProps) => {
  if (!isOpen || !detail) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white border border-[#bdbdbd] rounded-[6px] p-6 flex flex-col gap-4 w-[878px] max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[20px] font-bold" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
              <span>{detail.titulo}</span>
              <span className="font-medium"> em </span>
              <span>{detail.local}</span>
            </p>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#e0e0e0] w-full" />

          {/* Body */}
          <div className="flex flex-col gap-4 overflow-auto max-h-[60vh]">
            {/* Notas */}
            <div className="flex items-center">
              <p className="text-[16px] font-bold" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
                Notas
              </p>
            </div>

            {/* Observação */}
            <div className="flex flex-col gap-2">
              <label
                className="font-semibold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}
              >
                Observação
              </label>
              <div className="border border-[#919191] rounded-[5px] p-3 min-h-[100px]">
                <p
                  className="text-[14px] text-justify"
                  style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK, lineHeight: '24px' }}
                >
                  {detail.observacao}
                </p>
              </div>
            </div>

            {/* Anexos */}
            <div className="flex items-center">
              <p className="text-[16px] font-bold" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
                Anexos
              </p>
            </div>

            {/* Lista de anexos */}
            <div className="flex flex-col gap-2">
              {detail.anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  className="border border-[#919191] rounded-[6px] flex items-center justify-between px-4 py-3"
                >
                  <p className="text-[16px] font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
                    {anexo.nome}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-[4px] bg-[#c7392c] flex items-center justify-center"
                    >
                      <AppIcon name="delete_forever" size={20} color="white" />
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-[4px] bg-[#e67c26] flex items-center justify-center"
                    >
                      <AppIcon name="visibility" size={20} color="white" />
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-[4px] bg-[#e67c26] flex items-center justify-center"
                    >
                      <AppIcon name="download" size={20} color="white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#e0e0e0] w-full" />

          {/* Footer */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#4077d9] text-[#4077d9] w-[150px]"
            >
              <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Voltar
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
