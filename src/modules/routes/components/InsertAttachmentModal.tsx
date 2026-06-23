import { useState, useRef, useCallback } from 'react'
import { AppIcon } from '../../../shared/components'

interface InsertAttachmentModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'nfd' | 'canhoto'
  onAdd: (files: File[], type: 'nfd' | 'canhoto') => void
}

// Cores do Figma
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const GRAY_LIGHTER = '#bdbdbd'
const PRIMARY_DEFAULT = '#1e558b'
const BORDER_COLOR = '#e0e0e0'
const ORANGE = '#e67c26'

// Tipos de arquivo permitidos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']

// Item de arquivo selecionado - como no Figma
const FileItem = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const fileName = file.name.length > 12 ? file.name.substring(0, 12) + '...' : file.name
  const isPdf = file.type === 'application/pdf'

  return (
    <div className="flex flex-col items-center justify-center relative">
      {/* Botão remover no canto superior */}
      <div className="absolute top-0 right-0 -mt-1 -mr-1 z-10">
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center"
        >
          <AppIcon name="close" size={13} color={TEXT_LIGHT25} />
        </button>
      </div>

      {/* Ícone do arquivo - 34x34 como no Figma */}
      <div className="w-[34px] h-[34px] flex items-center justify-center">
        <AppIcon
          name={isPdf ? 'file_copy' : 'image'}
          size={34}
          color={TEXT_LIGHT25}
        />
      </div>

      {/* Nome do arquivo - 8px como no Figma */}
      <p
        className="text-[8px] text-center font-semibold mt-[-2px]"
        style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DEFAULT, maxWidth: '77px' }}
      >
        {fileName}
      </p>

      {/* Barra de progresso (visual apenas) */}
      <div
        className="h-[10px] w-[79px] overflow-hidden"
        style={{ backgroundColor: GRAY_LIGHTER }}
      >
        <div
          className="h-full w-full"
          style={{ backgroundColor: '#bdcde8' }}
        />
      </div>
    </div>
  )
}

export const InsertAttachmentModal = ({ isOpen, onClose, type, onAdd }: InsertAttachmentModalProps) => {
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
    if (selectedFiles.length > 0) {
      onAdd(selectedFiles, type)
      setSelectedFiles([])
      // Não fecha o modal ao adicionar - mantém aberto para繼續 adicionando
    }
  }, [selectedFiles, type, onAdd])

  const handleClose = useCallback(() => {
    setSelectedFiles([])
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay - não fecha ao clicar */}
      <div className="fixed inset-0 bg-black/20 z-50" />

      {/* Modal - exatamente como Figma node 571-149016 */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[6px] p-6 flex flex-col gap-4 z-50 shadow-lg"
        style={{
          border: '1px solid #bdbdbd',
          minWidth: '50vw',
          width: 'auto'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <p className="font-bold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
            Inserir Anexo
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* Área de upload - height 100px como no Figma */}
        <div
          className="flex items-center w-full border-2 border-dashed rounded-[8px]"
          style={{
            height: '100px',
            padding: '16px',
            borderColor: isDragging ? ORANGE : GRAY_LIGHTER
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

          {/* Arquivos selecionados - à esquerda com gap de 32px como no Figma */}
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
            /* Texto quando não há arquivos - centralizado como no Figma */
            <div className="flex-1 flex items-center gap-1 justify-center text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <AppIcon name="attach_file" size={33} color={PRIMARY_DEFAULT} />
              <span style={{ color: PRIMARY_DEFAULT, fontWeight: 600 }}>*Clique aqui</span>
              <span style={{ color: TEXT_LIGHT75 }}> ou Arraste um arquivo</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* Footer - exatamente como Figma */}
        <div className="flex items-center justify-between w-full">
          {/* Voltar - border azul como no Figma */}
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border bg-white w-[150px]"
            style={{ borderColor: ORANGE }}
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE }}>
              Voltar
            </span>
          </button>

          {/* Adicionar - bg azul como no Figma */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={selectedFiles.length === 0}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
            style={{
              backgroundColor: selectedFiles.length > 0 ? ORANGE : TEXT_LIGHT25
            }}
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              Adicionar
            </span>
          </button>
        </div>
      </div>
    </>
  )
}