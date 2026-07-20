import React, { useEffect } from 'react'

interface PdfViewerModalProps {
  isOpen: boolean
  title: string
  /** URL do PDF (ex.: /termos-de-uso.pdf servido de public/). */
  url: string
  onClose: () => void
}

/** Modal somente-leitura para exibir um PDF (visualizar e fechar). */
export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ isOpen, title, url, onClose }) => {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative flex h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[8px] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center border-b border-[#e0e0e0] px-5 py-3">
          <h2 className="text-[16px] font-bold text-[#0f3255]">{title}</h2>
        </div>

        {/* PDF */}
        <div className="flex-1 bg-[#525659]">
          <iframe src={url} title={title} className="h-full w-full border-0" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[#e0e0e0] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[42px] items-center justify-center rounded-[5px] border border-[#e67c26] bg-white px-5 text-[14px] font-bold text-[#e67c26] transition-colors hover:bg-[#fdf1e7]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default PdfViewerModal
