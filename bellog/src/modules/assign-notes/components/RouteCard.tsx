import { useState } from 'react'
import { AppIcon } from '../../../shared/components'

interface AssignedNote {
  id: string
  invoice_number: string
  peso: number
  destination_name?: string
}

interface RouteCardData {
  id: string
  tipoRota: string
  numeroRota: string
  veiculo: string
  capacidade: number
  cargaAtual: number
  notasAtribuidas: AssignedNote[]
  isEmpty?: boolean
  id_vehicle?: string
  route_status?: string
}

interface RouteCardProps {
  route: RouteCardData
  routeId: string
  onDropNote?: (noteId: string, routeId: string) => void
  onRemoveNote?: (routeId: string, noteId: string, invoiceNumber: string) => void
  onCreateRoute?: () => void
  onAlterRoute?: () => void
  onViewNote?: (note: AssignedNote) => void
  loading?: boolean
  isTemporary?: boolean
}

interface AssignedNoteItemProps {
  note: AssignedNote
  routeId: string
  onRemove?: (routeId: string, noteId: string, invoiceNumber: string) => void
  onViewNote?: (note: AssignedNote) => void
}

const AssignedNoteItem = ({
  note,
  routeId,
  onRemove,
  onViewNote,
}: AssignedNoteItemProps) => {
  const normalizedNoteId = String(note.id)

  return (
    <div className="flex gap-2 h-[47px] items-center pl-2 pr-3 py-2 rounded-[6px] border border-[#bdbdbd] bg-white w-full">
      <div className="flex flex-col flex-1 justify-between">
        <div className="flex gap-2 items-center">
          <span className="font-bold text-[14px] text-[#2a2a2a]">
            NF {note.invoice_number}
          </span>

          <button
            type="button"
            className="w-4 h-4 cursor-pointer flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              onViewNote?.(note)
            }}
          >
            <AppIcon name="open_in_new" size={16} />
          </button>
        </div>

        <span className="font-medium text-[10px] text-[#919191]">
          {note.peso} KG
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(routeId, normalizedNoteId, note.invoice_number || '')
          }}
          className="w-5 h-5 flex items-center justify-center hover:bg-[#fee2e2] rounded transition-colors"
        >
          <AppIcon name="close" size={18} className="text-[#dc2626]" />
        </button>
      )}
    </div>
  )
}

export const RouteCard = ({
  route,
  routeId,
  onDropNote,
  onRemoveNote,
  onCreateRoute,
  onAlterRoute,
  onViewNote,
  loading = false,
  isTemporary = false,
}: RouteCardProps) => {
  const [isDragOver, setIsDragOver] = useState(false)

  const normalizedRouteId = String(routeId || '')
  const notes = route.notasAtribuidas || []
  const isEmpty = notes.length === 0
  const isRouteStarted = route.route_status === 'started'

  const capacidadePercent =
    route.capacidade > 0 ? (route.cargaAtual / route.capacidade) * 100 : 0

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    if (isEmpty || !isRouteStarted) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const noteId = String(e.dataTransfer.getData('noteId') || '')

    if (!noteId || !normalizedRouteId) return

    if (isEmpty || !isRouteStarted) {
      onDropNote?.(noteId, normalizedRouteId)
    }
  }

  const buttonText = isTemporary ? 'Criar Rota' : 'Alterar Rota'
  const isDisabled = isTemporary && isEmpty
  const isButtonClickable = !isDisabled && !loading

  const buttonStyle = isDisabled
    ? 'bg-[#919191] cursor-not-allowed opacity-50'
    : 'bg-[#e67c26] hover:bg-[#d06c1e]'

  const handleButtonClick = () => {
    if (!isButtonClickable) return

    if (isTemporary) {
      onCreateRoute?.()
      return
    }

    onAlterRoute?.()
  }

  const handleRemoveClick = (routeId: string, noteId: string, invoiceNumber: string) => {
    if (!onRemoveNote) return

    onRemoveNote(
      routeId,
      noteId,
      invoiceNumber
    )
  }

  return (
    <div
      className={`flex flex-col gap-2 p-2 rounded-[8px] border transition-all duration-200
        ${isDragOver ? 'border-[#4077d9] bg-[#f0f7ff]' : 'border-[#bdbdbd] bg-white'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex gap-4 items-start justify-center w-full">
        {!isEmpty ? (
          <>
            <div className="flex flex-col flex-1 items-center">
              <span className="font-medium text-[12px] text-[#bdbdbd]">
                {route.tipoRota}
              </span>
              <span className="font-semibold text-[16px] text-[#2a2a2a]">
                {route.numeroRota}
              </span>
            </div>

            <div className="flex flex-col flex-1 items-center">
              <span className="font-medium text-[12px] text-[#bdbdbd]">
                Veículo
              </span>
              <span className="font-semibold text-[16px] text-[#2a2a2a]">
                {route.veiculo}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 items-center">
            <span className="font-medium text-[12px] text-[#bdbdbd]">
              Veículo
            </span>
            <span className="font-semibold text-[16px] text-[#2a2a2a]">
              {route.veiculo}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 h-[42px] bg-white rounded-[8px]">
        <div className="flex gap-2 items-center text-[12px]">
          <span className="flex-1 font-medium text-[#2b303b]">Carga</span>
          <span className="font-bold text-[#2b303b]">
            {route.cargaAtual} kg / {route.capacidade} kg
          </span>
        </div>

        <div className="flex-1 bg-[#eaecf0] rounded-[64px] overflow-hidden">
          <div
            className="h-full bg-[#e67c26] rounded-[64px] transition-all duration-300"
            style={{ width: `${Math.min(capacidadePercent, 100)}%` }}
          />
        </div>
      </div>

      {!isEmpty ? (
        <div
          className={`flex flex-col gap-4 p-2 rounded-[4px] border-2 ${
            isDragOver ? 'border-[#4077d9] bg-[#f0f7ff]' : 'border-dashed border-[#bdbdbd]'
          }`}
        >
          {notes.map((note) => (
            <AssignedNoteItem
              key={String(note.id)}
              note={note}
              routeId={normalizedRouteId}
              onRemove={isRouteStarted ? undefined : handleRemoveClick}
              onViewNote={(selectedNote) => onViewNote?.(selectedNote)}
            />
          ))}
        </div>
      ) : (
        <div
          className={`flex flex-col gap-2 items-center justify-center p-2 rounded-[4px] border-2 transition-all duration-200 min-h-[100px]
            ${
              isDragOver
                ? 'border-[#4077d9] bg-[#f0f7ff]'
                : 'border-dashed border-[#bdbdbd]'
            }`}
        >
          {isDragOver ? (
            <>
              <span className="font-bold text-[12px] text-[#4077d9]">
                Solte para adicionar
              </span>
              <div className="w-8 h-8">
                <AppIcon name="add" size={32} color="#4077d9" />
              </div>
            </>
          ) : (
            <>
              <span className="font-bold text-[12px] text-[#e5d7bc]">
                Arraste Notas aqui
              </span>
              <div className="w-8 h-8">
                <AppIcon name="download" size={32} />
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleButtonClick()
        }}
        disabled={!isButtonClickable}
        className={`flex items-center justify-center h-[30px] px-2 py-[2px] rounded-[4px] ${buttonStyle} text-white font-bold text-[14px] disabled:opacity-50 transition-colors`}
      >
        {buttonText}
      </button>
    </div>
  )
}