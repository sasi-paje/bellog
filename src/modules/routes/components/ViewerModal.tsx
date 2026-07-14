import { AppIcon } from '../../../shared/components'

interface ViewerModalProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  fileUrl: string
  fileType?: string
}

const TEXT_LIGHT75 = '#2a2a2a'
const BORDER_COLOR = '#e0e0e0'

export const ViewerModal = ({ isOpen, onClose, fileName, fileUrl, fileType }: ViewerModalProps) => {
  if (!isOpen) return null

  // Detectar tipo pelo nome ou MIME type
  const fileNameLower = fileName.toLowerCase()
  const isPdf = fileType === 'application/pdf' ||
    fileNameLower.endsWith('.pdf') ||
    fileNameLower.includes('danfe')
  const isImage = fileType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileNameLower) ||
    fileType?.startsWith('image/')
  const isVideo = fileType?.startsWith('video/') ||
    /\.(mp4|webm|mov)$/i.test(fileNameLower)

  // Fallback para imagem se não souber o tipo
  const isUnknown = !isPdf && !isImage && !isVideo

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[6px] p-6 flex flex-col gap-4 z-50 shadow-lg"
        style={{
          border: '1px solid #bdbdbd',
          maxWidth: '80vw',
          maxHeight: '80vh',
          width: 'auto'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <p className="font-bold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
            Visualizar Arquivo
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
          >
            <AppIcon name="close" size={24} color={TEXT_LIGHT75} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* File name */}
        <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
          {fileName}
        </p>

        {/* Content - based on file type */}
        <div className="flex items-center justify-center overflow-auto" style={{ maxHeight: '60vh' }}>
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="w-[600px] h-[500px]"
              style={{ border: '1px solid #bdbdbd' }}
              title={fileName}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
            />
          ) : isImage || isUnknown ? (
            // Tratar como imagem (unknown fallback para imagem se for URL de imagem)
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[500px] object-contain"
              style={{ border: '1px solid #bdbdbd' }}
            />
          ) : isVideo ? (
            <video
              src={fileUrl}
              controls
              className="max-w-full max-h-[500px]"
              style={{ border: '1px solid #bdbdbd' }}
            />
          ) : (
            // Para outros tipos, mostrar link de download
            <div className="flex flex-col items-center gap-4 p-8">
              <AppIcon name="insert_drive_file" size={64} color="#919191" />
              <p style={{ color: TEXT_LIGHT75 }}>Tipo de arquivo não suportado para visualização</p>
              <button
                onClick={() => window.open(fileUrl, '_blank')}
                className="px-4 py-2 bg-[#e67c26] text-white rounded"
              >
                Abrir arquivo
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* Footer */}
        <div className="flex items-center justify-end w-full gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                const response = await fetch(fileUrl)
                const blob = await response.blob()
                const blobUrl = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = blobUrl
                link.download = fileName
                document.body.appendChild(link)
                link.click()
                setTimeout(() => {
                  document.body.removeChild(link)
                  window.URL.revokeObjectURL(blobUrl)
                }, 1000)
              } catch (error) {
                console.error('Download error:', error)
                window.open(fileUrl, '_blank')
              }
            }}
            className="flex items-center justify-center h-[45px] w-[150px] rounded-[5px] gap-2"
            style={{ backgroundColor: '#e67c26' }}
          >
            <AppIcon name="download" size={20} color="white" />
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              Baixar
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-[45px] w-[150px] rounded-[5px] border bg-white"
            style={{ borderColor: '#e67c26' }}
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}>
              Fechar
            </span>
          </button>
        </div>
      </div>
    </>
  )
}