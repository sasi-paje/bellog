import { useState, useEffect } from 'react'
import { AppIcon } from '../../../shared/components'
import { attachmentService, Attachment } from '../../../features/attachments'

interface OccurrenceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  // Dados da ocorrência (mock ou real)
  detail: {
    titulo?: string
    local?: string
    observacao?: string
    anexos?: Array<{
      id: string
      nome: string
      url?: string
      file_name?: string
      file_path?: string
    }>
  } | null
  // ID da rota para buscar anexos reais (opcional)
  routeId?: string | null
}

const TEXT_DARK = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const SECONDARY_DEFAULT = '#e67c26'

export const OccurrenceDetailModal = ({ isOpen, onClose, detail, routeId }: OccurrenceDetailModalProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)

  // Buscar anexos reais quando routeId mudar
  useEffect(() => {
    if (!routeId || !isOpen) {
      setAttachments([])
      return
    }

    const fetchAttachments = async () => {
      setLoading(true)
      try {
        const routeIdNum = parseInt(routeId, 10)
        if (!isNaN(routeIdNum)) {
          const files = await attachmentService.listByEntity('route', routeIdNum)
          setAttachments(files)
        }
      } catch (err) {
        console.error('[OccurrenceDetailModal] Error fetching attachments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttachments()
  }, [routeId, isOpen])

  // Usar anexos do detail (mock) se não houver routeId
  const displayAttachments = routeId ? attachments : (detail?.anexos || [])

  // Handler para visualizar arquivo
  const handleView = (attachment: Attachment) => {
    if (attachment.file_url) {
      window.open(attachment.file_url, '_blank')
    }
  }

  // Handler para fazer download
  const handleDownload = async (attachment: Attachment) => {
    if (attachment.file_url) {
      await attachmentService.download(attachment.file_url, attachment.file_name)
    }
  }

  // Handler para deletar arquivo
  const handleDelete = async (attachment: Attachment) => {
    if (!attachment.id) return

    if (!confirm(`Tem certeza que deseja excluir o arquivo "${attachment.file_name}"?`)) {
      return
    }

    try {
      const success = await attachmentService.delete(attachment.id)
      if (success) {
        setAttachments(prev => prev.filter(a => a.id !== attachment.id))
      }
    } catch (err) {
      console.error('[OccurrenceDetailModal] Error deleting attachment:', err)
    }
  }

  if (!isOpen || !detail) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white border border-[#bdbdbd] rounded-[6px] p-6 flex flex-col gap-4 min-w-[50vw] max-h-[90vh]">
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
              {loading ? (
                <p className="text-[14px]" style={{ color: TEXT_LIGHT25 }}>Carregando anexos...</p>
              ) : displayAttachments.length === 0 ? (
                <p className="text-[14px]" style={{ color: TEXT_LIGHT25 }}>Nenhum anexo encontrado.</p>
              ) : (
                displayAttachments.map((anexo, index) => (
                  <div
                    key={routeId ? (anexo as Attachment).id || index : (anexo as any).id || index}
                    className="border border-[#919191] rounded-[6px] flex items-center justify-between px-4 py-3"
                  >
                    <p className="text-[16px] font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
                      {routeId ? (anexo as Attachment).file_name : (anexo as any).nome}
                    </p>
                    <div className="flex gap-2">
                      {/* Botão Deletar */}
                      <button
                        type="button"
                        onClick={() => routeId ? handleDelete(anexo as Attachment) : undefined}
                        className="w-8 h-8 rounded-[4px] bg-[#c7392c] flex items-center justify-center"
                        title="Excluir"
                      >
                        <AppIcon name="delete_forever" size={20} color="white" />
                      </button>
                      {/* Botão Visualizar */}
                      <button
                        type="button"
                        onClick={() => routeId ? handleView(anexo as Attachment) : undefined}
                        className="w-8 h-8 rounded-[4px] bg-[#e67c26] flex items-center justify-center"
                        title="Visualizar"
                      >
                        <AppIcon name="visibility" size={20} color="white" />
                      </button>
                      {/* Botão Download */}
                      <button
                        type="button"
                        onClick={() => routeId ? handleDownload(anexo as Attachment) : undefined}
                        className="w-8 h-8 rounded-[4px] bg-[#e67c26] flex items-center justify-center"
                        title="Baixar"
                      >
                        <AppIcon name="download" size={20} color="white" />
                      </button>
                    </div>
                  </div>
                ))
              )}
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
