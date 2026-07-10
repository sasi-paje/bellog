import { useState } from 'react'
import { AppIcon } from '../../../shared/components'
import { NoteItem } from '../types/assign-notes.types'

interface NotesListProps {
  notes: NoteItem[]
  onDragStart?: (note: NoteItem) => void
  onSelectNote?: (note: NoteItem) => void
  onViewNote?: (note: NoteItem) => void
  hasMore?: boolean
  isLoading?: boolean
  onLoadMore?: () => void
}

interface NoteCardProps {
  note: NoteItem
  onDragStart?: (note: NoteItem) => void
  onSelectNote?: (note: NoteItem) => void
  onViewNote?: (note: NoteItem) => void
}

const NoteCard = ({ note, onDragStart, onSelectNote, onViewNote }: NoteCardProps) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.setData('noteId', note.id)
    e.dataTransfer.effectAllowed = 'move'

    // Substitui o ghost nativo (que carrega shadow-md) por uma pill limpa
    const pill = document.createElement('div')
    pill.textContent = `NF ${note.invoice_number}`
    Object.assign(pill.style, {
      position: 'fixed',
      top: '-1000px',
      left: '0',
      background: '#ffffff',
      border: '1.5px solid #4077d9',
      borderRadius: '6px',
      padding: '5px 12px',
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',
      fontWeight: '600',
      color: '#2a2a2a',
      whiteSpace: 'nowrap',
      boxShadow: 'none',
      pointerEvents: 'none',
    })
    document.body.appendChild(pill)
    e.dataTransfer.setDragImage(pill, Math.min(pill.offsetWidth / 2, 60), 16)
    requestAnimationFrame(() => pill.remove())
  }

  const handleDragEnd = () => setIsDragging(false)

  const fornecedor = note.fornecedor || note.supplier_name || ''
  const cliente = note.customer_name || ''
  const destino = note.destination_name || ''
  const caixas = note.volume || 0

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelectNote?.(note)}
      className={`flex gap-[8px] items-start p-[8px] rounded-[8px] border cursor-pointer transition-all duration-200
        ${isDragging
          ? 'opacity-[0.15] border-dashed border-[#4077d9]'
          : 'border-[#bdbdbd] bg-white hover:border-[#4077d9]'
        }`}
    >
      {/* Coluna esquerda: NF + dados secundários */}
      <div className="flex flex-col gap-[2px] flex-1 min-w-0">
        <span className="font-semibold text-[12px] text-[#2a2a2a] truncate">
          NF {note.invoice_number}
        </span>
        {fornecedor ? (
          <span className="font-medium text-[10px] text-[#919191] truncate">
            {fornecedor}
          </span>
        ) : null}
        {cliente ? (
          <span className="font-medium text-[10px] text-[#919191] truncate">
            {cliente}
          </span>
        ) : null}
        {destino && destino !== cliente ? (
          <span className="font-medium text-[10px] text-[#919191] truncate">
            {destino}
          </span>
        ) : null}
      </div>

      {/* Coluna direita: Peso + Caixas */}
      <div className="flex flex-col gap-[2px] shrink-0 items-end">
        <span className="font-semibold text-[12px] text-[#2a2a2a] whitespace-nowrap">
          {note.weight} KG
        </span>
        {caixas > 0 ? (
          <span className="font-medium text-[10px] text-[#919191] whitespace-nowrap">
            {caixas} Caixas
          </span>
        ) : null}
      </div>

      {/* Ícone laranja para ver detalhes */}
      <button
        type="button"
        className="shrink-0 w-[18px] h-[18px] flex items-center justify-center mt-[1px]"
        onClick={(e) => { e.stopPropagation(); onViewNote?.(note) }}
      >
        <AppIcon name="open_in_new" size={18} color="#e67c26" />
      </button>
    </div>
  )
}

export const NotesList = ({
  notes,
  onDragStart,
  onSelectNote,
  onViewNote,
  hasMore = false,
  isLoading = false,
  onLoadMore,
}: NotesListProps) => {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
        <div className="w-[64px] h-[64px]">
          <AppIcon name="file_copy" size={64} className="text-[#bdbdbd]" />
        </div>
        <span className="font-medium text-[14px] text-[#828282] text-center">
          Nenhuma nota disponível
        </span>
        {isLoading && (
          <span className="text-[12px] text-[#919191]">Carregando...</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full min-w-0 pb-4 overflow-hidden">
      {notes.map(note => (
        <NoteCard
          key={note.id}
          note={note}
          onDragStart={onDragStart}
          onSelectNote={onSelectNote}
          onViewNote={onViewNote}
        />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoading}
          className="flex items-center justify-center h-[40px] px-4 py-2 rounded-[4px] border border-[#bdbdbd] text-[#4077d9] font-semibold text-[12px] hover:bg-[#f0f7ff] disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Carregando...' : 'Carregar mais notas'}
        </button>
      )}
    </div>
  )
}

export default NotesList