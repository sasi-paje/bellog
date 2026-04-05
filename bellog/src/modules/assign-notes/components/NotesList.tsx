import { useState } from 'react'
import { AppIcon } from '../../../shared/components'

interface NoteItem {
  id: string
  invoice_number: string
  weight: number
  volume: number
  fornecedor?: string
  caixas?: number
  value?: number
  issue_date?: string
}

interface NotesListProps {
  notes: NoteItem[]
  onDragStart?: (note: NoteItem) => void
  onSelectNote?: (note: NoteItem) => void
  onViewNote?: (note: NoteItem) => void
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
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelectNote?.(note)}
      className={`flex w-full gap-4 h-[64px] items-center p-2 rounded-[8px] border cursor-pointer transition-all duration-200
        ${isDragging
          ? 'border-[#4077d9] bg-[#f0f7ff] opacity-70'
          : 'border-[#bdbdbd] bg-white hover:border-[#4077d9] hover:shadow-md'
        }`}
    >
      {/* Left side: NF + Fornecedor */}
      <div className="flex flex-col gap-2 flex-1 min-w-0 items-start justify-center">
        <span className="font-semibold text-[12px] text-[#2a2a2a] truncate">
          NF {note.invoice_number}
        </span>
        <span className="font-medium text-[10px] text-[#919191] truncate">
          {note.fornecedor || 'Fornecedor'}
        </span>
      </div>

      {/* Right side: Peso + Caixas */}
      <div className="flex flex-col gap-1 shrink-0 items-end justify-center">
        <span className="font-semibold text-[12px] text-[#2a2a2a] whitespace-nowrap">
          {note.weight} KG
        </span>
        <span className="font-medium text-[10px] text-[#919191] whitespace-nowrap">
          {note.caixas || Math.ceil(note.volume)} Caixas
        </span>
      </div>

      {/* Icon */}
      <div className="w-[18px] h-[18px] shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewNote?.(note) }}>
        <AppIcon name="open_in_new" size={18} />
      </div>
    </div>
  )
}

export const NotesList = ({ notes, onDragStart, onSelectNote, onViewNote }: NotesListProps) => {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
        <div className="w-[64px] h-[64px]">
          <AppIcon name="file_copy" size={64} className="text-[#bdbdbd]" />
        </div>
        <span className="font-medium text-[14px] text-[#828282] text-center">
          Nenhuma nota disponível
        </span>
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
    </div>
  )
}