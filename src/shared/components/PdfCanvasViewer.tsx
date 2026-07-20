import React, { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Worker do pdf.js (renderização fora da main thread)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface PdfCanvasViewerProps {
  url: string
  className?: string
}

/**
 * Visualizador de PDF somente-leitura: renderiza as páginas em <canvas> numa
 * rolagem contínua. Sem camada de texto (não há busca/seleção/cópia), sem
 * toolbar, sem navegação por página, sem imprimir/baixar.
 */
export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ url, className }) => {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const host = canvasHostRef.current
    if (!host) return

    setLoading(true)
    setError(false)
    host.innerHTML = ''

    const render = async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ url }).promise
        if (cancelled) return

        const available = (host.clientWidth || 860) - 24
        const dpr = window.devicePixelRatio || 1

        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n)
          if (cancelled) return

          const base = page.getViewport({ scale: 1 })
          const scale = Math.max(0.5, Math.min(2, available / base.width))
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          canvas.width = Math.floor(viewport.width * dpr)
          canvas.height = Math.floor(viewport.height * dpr)
          canvas.style.width = `${Math.floor(viewport.width)}px`
          canvas.style.height = `${Math.floor(viewport.height)}px`
          canvas.style.display = 'block'
          canvas.style.margin = '0 auto 12px'
          canvas.style.boxShadow = '0 1px 6px rgba(0,0,0,0.35)'
          ctx.scale(dpr, dpr)

          await page.render({ canvasContext: ctx, viewport }).promise
          if (cancelled) return
          host.appendChild(canvas)
        }
        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div
      className={className}
      style={{ position: 'relative', overflow: 'auto' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[14px] text-white/90">Carregando documento...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[14px] text-white/90">Não foi possível carregar o documento.</span>
        </div>
      )}
      <div ref={canvasHostRef} style={{ padding: '12px' }} />
    </div>
  )
}

export default PdfCanvasViewer
