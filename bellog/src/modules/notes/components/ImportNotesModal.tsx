import { useState, useRef, useCallback } from 'react'
import { AppIcon, LoadingButton } from '../../../shared/components'
import { ImportMetadata } from './ImportNotesMetadataModal'

interface ImportNotesModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  loading?: boolean
  onImport?: (files: File[]) => void
  metadata?: ImportMetadata
}

// Cores do sistema
const PRIMARY_DEFAULT = '#1e558b'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const GRAY_LIGHTER = '#bdbdbd'
const BORDER_COLOR = '#e0e0e0'
const BLUE = '#4077d9'

// Tipos de arquivo permitidos
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/xml', 'text/xml']
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.xml']

export const ImportNotesModal = ({ isOpen, onClose, onBack, loading = false, onImport, metadata }: ImportNotesModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(file => ALLOWED_TYPES.includes(file.type))
    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = files.filter(file => ALLOWED_TYPES.includes(file.type))
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleAdd = useCallback(() => {
    if (selectedFiles.length > 0 && onImport) {
      onImport(selectedFiles)
      setSelectedFiles([])
    }
  }, [selectedFiles, onImport])

  const handleClose = useCallback(() => {
    setSelectedFiles([])
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-50" onClick={handleClose} />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[6px] p-6 flex flex-col gap-4 z-50 shadow-lg"
        style={{ border: `1px solid ${GRAY_LIGHTER}`, minWidth: '50vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <p className="font-bold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
            Inserir Nota
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* Área de upload - 100px height como no Figma */}
        <div
          className="flex items-center w-full border-2 border-dashed rounded-[8px]"
          style={{
            height: '100px',
            padding: '16px',
            borderColor: isDragging ? BLUE : GRAY_LIGHTER
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {selectedFiles.length > 0 ? (
            <div className="flex gap-8 items-center" style={{ gap: '32px' }}>
              {selectedFiles.map((file, index) => (
                <FileItem
                  key={index}
                  file={file}
                  onRemove={() => handleRemoveFile(index)}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-1 justify-center text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <AppIcon name="attach_file" size={33} color={PRIMARY_DEFAULT} />
              <span style={{ color: PRIMARY_DEFAULT, fontWeight: 600 }}>*Clique aqui</span>
              <span style={{ color: TEXT_LIGHT75 }}> ou Arraste um arquivo</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* Footer */}
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#e67c26] bg-white w-[150px]"
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}>
              Voltar
            </span>
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={selectedFiles.length === 0 || loading}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
            style={{
              backgroundColor: selectedFiles.length > 0 && !loading ? '#e67c26' : TEXT_LIGHT25
            }}
          >
            {loading ? (
              <LoadingButton isLoading={true} isSmall={false}>
                <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Processando...
                </span>
              </LoadingButton>
            ) : (
              <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                Adicionar Novo
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// Componente de item de arquivo
const FileItem = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const fileName = file.name.length > 12 ? file.name.substring(0, 12) + '...' : file.name
  const isPdf = file.type === 'application/pdf'
  const isXml = file.type === 'application/xml' || file.type === 'text/xml' || file.name.endsWith('.xml')

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="absolute top-0 right-0 -mt-1 -mr-1 z-10">
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center"
        >
          <AppIcon name="close" size={13} color={TEXT_LIGHT25} />
        </button>
      </div>

      <div className="w-[34px] h-[34px] flex items-center justify-center">
        <AppIcon
          name={isPdf ? 'file_copy' : (isXml ? 'dataset_linked' : 'image')}
          size={34}
          color={TEXT_LIGHT25}
        />
      </div>

      <p className="text-[8px] text-center font-semibold mt-[-2px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DEFAULT, maxWidth: '77px' }}>
        {fileName}
      </p>

      <div className="h-[10px] w-[79px] overflow-hidden" style={{ backgroundColor: GRAY_LIGHTER }}>
        <div className="h-full w-full" style={{ backgroundColor: '#bdcde8' }} />
      </div>
    </div>
  )
}