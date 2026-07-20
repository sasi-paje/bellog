import React, { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
  EventBus,
  PDFViewer,
  PDFLinkService,
  PDFFindController,
} from 'pdfjs-dist/web/pdf_viewer.mjs'
import 'pdfjs-dist/web/pdf_viewer.css'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface PdfFullViewerProps {
  url: string
  className?: string
}

/**
 * Visualizador de PDF completo (busca, navegação por página, zoom) SEM imprimir
 * nem baixar. Usa os componentes do pdf.js (pdf_viewer.mjs) com uma toolbar
 * própria — os botões de imprimir/baixar simplesmente não existem.
 */
export const PdfFullViewer: React.FC<PdfFullViewerProps> = ({ url, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerElRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<{ viewer: any; eventBus: any; findController: any } | null>(null)

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const viewerEl = viewerElRef.current
    if (!container || !viewerEl) return

    let cancelled = false
    setLoading(true)
    setError(false)

    const eventBus = new EventBus()
    const linkService = new PDFLinkService({ eventBus })
    const findController = new PDFFindController({ eventBus, linkService })
    const viewer = new PDFViewer({ container, viewer: viewerEl, eventBus, linkService, findController })
    linkService.setViewer(viewer)
    apiRef.current = { viewer, eventBus, findController }

    eventBus.on('pagesinit', () => {
      viewer.currentScaleValue = 'page-width'
      setTotal(viewer.pagesCount)
      setZoom(Math.round(viewer.currentScale * 100))
      setLoading(false)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventBus.on('pagechanging', (e: any) => setPage(e.pageNumber))
    eventBus.on('scalechanging', () => setZoom(Math.round(viewer.currentScale * 100)))

    pdfjsLib
      .getDocument({ url })
      .promise.then((doc) => {
        if (cancelled) return
        viewer.setDocument(doc)
        linkService.setDocument(doc, null)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      try {
        viewer.setDocument(null)
      } catch {
        /* ignora */
      }
      apiRef.current = null
    }
  }, [url])

  const changeZoom = (delta: number) => {
    const v = apiRef.current?.viewer
    if (!v) return
    v.currentScale = Math.min(4, Math.max(0.25, v.currentScale + delta))
  }

  const goPage = (delta: number) => {
    const v = apiRef.current?.viewer
    if (!v) return
    v.currentPageNumber = Math.min(v.pagesCount, Math.max(1, v.currentPageNumber + delta))
  }

  const runSearch = (findPrevious: boolean) => {
    const bus = apiRef.current?.eventBus
    if (!bus || !query.trim()) return
    bus.dispatch('find', {
      source: null,
      type: 'again',
      query: query.trim(),
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious,
      matchDiacritics: false,
    })
  }

  const btn =
    'flex h-8 min-w-8 items-center justify-center rounded px-2 text-[13px] text-white/90 hover:bg-white/15 disabled:opacity-40'

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar (sem imprimir/baixar) */}
      <div className="flex flex-wrap items-center gap-2 bg-[#323639] px-3 py-2 text-white">
        {/* Busca */}
        <div className="flex items-center gap-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch(e.shiftKey)
            }}
            placeholder="Buscar no documento"
            className="h-8 w-[190px] rounded bg-white/10 px-3 text-[13px] text-white placeholder:text-white/50 focus:outline-none"
          />
          <button type="button" className={btn} onClick={() => runSearch(true)} title="Anterior" aria-label="Ocorrência anterior">▲</button>
          <button type="button" className={btn} onClick={() => runSearch(false)} title="Próxima" aria-label="Próxima ocorrência">▼</button>
        </div>

        <div className="mx-1 h-5 w-px bg-white/20" />

        {/* Navegação de página */}
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => goPage(-1)} disabled={page <= 1} aria-label="Página anterior">‹</button>
          <span className="min-w-[70px] text-center text-[13px] tabular-nums">{page} / {total || '—'}</span>
          <button type="button" className={btn} onClick={() => goPage(1)} disabled={total > 0 && page >= total} aria-label="Próxima página">›</button>
        </div>

        <div className="mx-1 h-5 w-px bg-white/20" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => changeZoom(-0.2)} aria-label="Diminuir zoom">−</button>
          <span className="min-w-[48px] text-center text-[13px] tabular-nums">{zoom}%</span>
          <button type="button" className={btn} onClick={() => changeZoom(0.2)} aria-label="Aumentar zoom">+</button>
        </div>
      </div>

      {/* Documento */}
      <div className="relative flex-1 bg-[#525659]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-[14px] text-white/90">Carregando documento...</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-[14px] text-white/90">Não foi possível carregar o documento.</span>
          </div>
        )}
        <div ref={containerRef} className="pdfViewerContainer absolute inset-0 overflow-auto">
          <div ref={viewerElRef} className="pdfViewer" />
        </div>
      </div>
    </div>
  )
}

export default PdfFullViewer
