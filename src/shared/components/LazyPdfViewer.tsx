import React, { Suspense } from 'react'

// Carrega o pdf.js sob demanda (só quando um modal de PDF abre), mantendo o
// bundle inicial (login) leve.
const PdfCanvasViewer = React.lazy(() => import('./PdfCanvasViewer'))

interface LazyPdfViewerProps {
  url: string
  className?: string
}

export const LazyPdfViewer: React.FC<LazyPdfViewerProps> = ({ url, className }) => (
  <Suspense
    fallback={
      <div className={className} style={{ position: 'relative' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[14px] text-white/90">Carregando documento...</span>
        </div>
      </div>
    }
  >
    <PdfCanvasViewer url={url} className={className} />
  </Suspense>
)

export default LazyPdfViewer
