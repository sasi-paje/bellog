/**
 * AnexosTab - Conteúdo da aba "Anexos" com notas e resultados de entrega
 */
import React, { useMemo } from 'react'
import type { NoteWithDeliveryResult } from '../../delivery/services/delivery.service'

interface AnexosTabProps {
  notes: NoteWithDeliveryResult[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onNoteClick: (note: NoteWithDeliveryResult) => void
}

interface NoteCardProps {
  note: NoteWithDeliveryResult
  onClick: (note: NoteWithDeliveryResult) => void
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick }) => (
  <div
    className="bg-white border border-[#bdbdbd] border-solid flex gap-[16px] items-center p-[8px] relative rounded-[8px] shrink-0 w-full cursor-pointer"
    onClick={() => onClick(note)}
  >
    <div className="flex flex-[1_0_0] flex-col gap-[4px] items-start justify-center min-w-0">
      <p className="font-semibold text-[12px] text-[#2a2a2a] truncate w-full">
        {note.invoice_number}
      </p>
      <p className="font-medium text-[10px] text-[#919191] truncate w-full">
        {note.supplier_name}
      </p>
      <p className="font-medium text-[10px] text-[#919191] truncate w-full">
        {note.customer_name || '-'}
      </p>
    </div>

    <div className="flex flex-col gap-[4px] items-end justify-center shrink-0">
      <p className="font-semibold text-[12px] text-[#2a2a2a]">
        {note.gross_weight ? `${note.gross_weight} KG` : '-'}
      </p>
      <p className="font-medium text-[10px] text-[#919191]">
        {note.box_quantity ? `${note.box_quantity} cx` : '-'}
      </p>
    </div>

    <div className="flex items-center shrink-0 size-[20px]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="#919191"/>
      </svg>
    </div>
  </div>
)

const NoteGroup: React.FC<{ title: string; notes: NoteWithDeliveryResult[]; onNoteClick: (note: NoteWithDeliveryResult) => void }> = ({ title, notes, onNoteClick }) => {
  if (notes.length === 0) return null
  return (
    <div className="flex flex-col gap-[16px]">
      <p className="font-bold leading-[19.6px] text-[20px] text-[black]">
        {title}
      </p>
      <div className="flex flex-col gap-[8px]">
        {notes.map(note => (
          <NoteCard key={note.id} note={note} onClick={onNoteClick} />
        ))}
      </div>
    </div>
  )
}

export const AnexosTab: React.FC<AnexosTabProps> = ({
  notes,
  isLoading,
  error,
  onRetry,
  onNoteClick,
}) => {
  const groupedNotes = useMemo(() => ({
    total: notes.filter(n => n.deliveryTypeLabel === 'entrega_total'),
    parcial: notes.filter(n => n.deliveryTypeLabel === 'entrega_parcial'),
    negada: notes.filter(n => n.deliveryTypeLabel === 'entrega_negada'),
    abortada: notes.filter(n => n.deliveryTypeLabel === 'entrega_abortada'),
  }), [notes])

  const observations = useMemo(() => {
    const obs: string[] = []
    notes.forEach((note) => {
      if (note.deliveryResult?.observation) {
        const nfMatch = note.invoice_number.match(/(\d+)/)
        const nfNum = nfMatch ? nfMatch[1] : note.id
        obs.push(`@NF${nfNum}: ${note.deliveryResult.observation}`)
      }
    })
    return obs
  }, [notes])

  if (isLoading) {
    return (
      <div className="flex flex-[1_0_0] flex-col gap-[32px]">
        <div className="flex items-center justify-center h-[200px]">
          <span className="text-[#4c4c4c] text-[14px]">Carregando notas...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-[1_0_0] flex-col gap-[32px]">
        <div className="flex flex-col items-center justify-center h-[200px] gap-4">
          <p className="text-[14px] text-red-600 text-center">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 bg-[#e67c26] text-white rounded-[4px] font-bold text-[14px]"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-[1_0_0] flex-col gap-[32px]">
      <div className="flex h-[20px] items-center">
        <p className="font-bold leading-[19.6px] text-[20px] text-[black]">
          Informações de entrega
        </p>
      </div>

      <div className="flex flex-col gap-[8px] h-[160px]">
        <p className="font-semibold text-[14px] text-[#0f3255]">
          Observações
        </p>
        <div className="bg-white border border-[#0f3255] border-solid flex flex-[1_0_0] flex-col items-start px-[16px] py-[12px] relative rounded-[5px] w-full">
          <p className="text-[14px] text-[#2a2a2a]">
            {observations.length > 0 ? observations.join(', ') : 'Sem observações'}
          </p>
        </div>
      </div>

      <NoteGroup title="Entrega Total" notes={groupedNotes.total} onNoteClick={onNoteClick} />
      <NoteGroup title="Entrega Parcial" notes={groupedNotes.parcial} onNoteClick={onNoteClick} />
      <NoteGroup title="Entrega Negada" notes={groupedNotes.negada} onNoteClick={onNoteClick} />
      <NoteGroup title="Entrega Abortada" notes={groupedNotes.abortada} onNoteClick={onNoteClick} />

      {notes.length === 0 && (
        <p className="text-[14px] text-[#919191] text-center">
          Nenhuma nota encontrada
        </p>
      )}
    </div>
  )
}

export default AnexosTab