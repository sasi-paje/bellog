import { useState } from 'react'
import { AppIcon } from '../../../shared/components'
import { formatWeight, formatPercent } from '../../../shared/utils/format'
import { AssignedNote, RouteCardData, DivergenceInfo } from '../types/assign-notes.types'

interface RouteCardProps {
  route: RouteCardData
  routeId: string
  divergence?: DivergenceInfo
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
  canRemove?: boolean
}

const AssignedNoteItem = ({
  note,
  routeId,
  onRemove,
  onViewNote,
  canRemove = true,
}: AssignedNoteItemProps) => {
  const normalizedNoteId = String(note.id)
  const fornecedor = note.fornecedor || note.supplier_name
  const cliente = note.customer_name
  const destino = note.destination_name

  return (
    <div className="bg-white border border-[#bdbdbd] flex gap-[8px] items-center pl-[8px] pr-[12px] py-[8px] rounded-[6px] w-full">
      {/* Infos */}
      <div className="flex flex-[1_0_0] flex-col h-full items-start justify-between min-w-0">
        {/* NF + ícone abrir */}
        <div className="flex gap-[8px] items-end">
          <span className="font-bold text-[14px] text-[#2a2a2a] whitespace-nowrap">
            NF {note.invoice_number}
          </span>
          <button
            type="button"
            className="flex items-center justify-center w-[16px] h-[16px] shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onViewNote?.(note)
            }}
          >
            <AppIcon name="open_in_new" size={16} color="#e67c26" />
          </button>
        </div>

        {/* Peso */}
        <span className="font-medium text-[10px] text-[#919191] whitespace-nowrap">
          {formatWeight(note.peso)}
        </span>

        {/* Fornecedor */}
        {fornecedor && (
          <span className="font-medium text-[10px] text-[#919191] whitespace-nowrap truncate max-w-full">
            {fornecedor}
          </span>
        )}

        {/* Cliente */}
        {cliente && (
          <span className="font-medium text-[10px] text-[#919191] whitespace-nowrap truncate max-w-full">
            {cliente}
          </span>
        )}

        {/* Destino */}
        {destino && (
          <span className="font-medium text-[10px] text-[#919191] whitespace-nowrap truncate max-w-full">
            {destino}
          </span>
        )}

        {/* Tentativa */}
        {(note.attempt_number ?? 0) > 0 && (
          <span className="font-semibold text-[10px] text-[#e67c26] whitespace-nowrap">
            Tentativa {note.attempt_number}
          </span>
        )}
      </div>

      {/* Botão remover */}
      {onRemove && canRemove && (
        <div className="flex flex-col h-full items-center justify-center shrink-0">
          <button
            type="button"
            className="flex items-center justify-center w-[20px] h-[20px] hover:opacity-70 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(routeId, normalizedNoteId, note.invoice_number || '')
            }}
          >
            <AppIcon name="do_not_disturb_on" size={20} color="#C7392C" />
          </button>
        </div>
      )}
    </div>
  )
}

export const RouteCard = ({
  route,
  routeId,
  divergence: _divergence,
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
  const canEdit = route.allowsEdition === true
  const canRemove = canEdit

  const isOverCapacity = route.capacidade > 0 && route.cargaAtual > route.capacidade

  const capacidadePercent =
    route.capacidade > 0 ? (route.cargaAtual / route.capacidade) * 100 : 0

  // Cor da barra de peso por faixa de ocupação:
  // 0–50% cinza · 50–70% amarelo · 70–85% azul (água) · >85% verde ·
  // acima da capacidade (>100%) vermelho.
  const barColor = isOverCapacity
    ? '#c7392c'
    : capacidadePercent >= 85
      ? '#27ae60'
      : capacidadePercent >= 70
        ? '#22b8cf'
        : capacidadePercent >= 50
          ? '#f2c94c'
          : '#919191'

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (canEdit) setIsDragOver(true)
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
    if (canEdit) onDropNote?.(noteId, normalizedRouteId)
  }

  const buttonText = isTemporary ? 'Criar Rota' : 'Alterar Rota'
  const isLockedRoute = !isTemporary && !canEdit
  // Carga excedida NÃO desabilita mais o botão: a confirmação é pedida no
  // fluxo de salvar (popup "Carga máxima excedida"). Apenas o card vazio
  // (rota temporária) e a rota bloqueada continuam desabilitando.
  const isDisabled = (isTemporary && isEmpty) || isLockedRoute
  const isButtonClickable = !isDisabled && !loading

  const handleButtonClick = () => {
    if (!isButtonClickable) return
    if (isTemporary) {
      onCreateRoute?.()
      return
    }
    onAlterRoute?.()
  }

  const handleRemoveClick = (rId: string, noteId: string, invoiceNumber: string) => {
    if (!onRemoveNote) return
    onRemoveNote(rId, noteId, invoiceNumber)
  }

  return (
    <div
      className={`flex flex-col h-full p-3 rounded-[8px] border transition-all duration-200
        ${isDragOver ? 'border-[#4077d9] bg-[#f0f7ff]' : 'border-[#e0e0e0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header: Tipo/Número + Veículo */}
      <div className="flex gap-4 items-start justify-center w-full mb-2">
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
              <span className="font-medium text-[12px] text-[#bdbdbd]">Veículo</span>
              <span className="font-semibold text-[16px] text-[#2a2a2a]">{route.veiculo}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 items-center">
            <span className="font-medium text-[12px] text-[#bdbdbd]">Veículo</span>
            <span className="font-semibold text-[16px] text-[#2a2a2a]">{route.veiculo}</span>
          </div>
        )}
      </div>

      {/* Seção de carga */}
      <div className="mb-3">
        {/* Linha: label + peso */}
        <div className="flex gap-2 items-center text-[12px] mb-1">
          <span className="flex-1 font-medium text-[#2b303b]">Carga</span>
          <span className={`font-bold ${isOverCapacity ? 'text-[#c7392c]' : 'text-[#2b303b]'}`}>
            {formatWeight(route.cargaAtual)} / {formatWeight(route.capacidade)}{route.capacidade > 0 ? ` - ${formatPercent(capacidadePercent)}` : ''}
          </span>
        </div>

        {/* Barra */}
        <div className="bg-[#eaecf0] flex flex-[1_0_0] items-center overflow-clip relative rounded-[64px] w-full h-2">
          <div
            className="h-full min-w-px rounded-[64px] transition-all duration-300"
            style={{ width: `${Math.min(capacidadePercent, 100)}%`, backgroundColor: barColor }}
          />
        </div>

        {/* Mensagem de erro — igual ao Figma */}
        {isOverCapacity && (
          <div className="flex gap-[4px] items-center mt-1">
            <span className="font-normal text-[12px] text-[#941c1e] whitespace-nowrap">
              Carga máxima excedida
            </span>
            <div className="flex items-center shrink-0 w-[18px] h-[18px]">
              <AppIcon name="error" size={18} color="#c7392c" />
            </div>
          </div>
        )}
      </div>

      {/* Área de drop */}
      {!isEmpty ? (
        <div
          className={`flex flex-col gap-2 p-[8px] rounded-[4px] border-2 min-h-[80px] max-h-[280px] overflow-y-auto mb-3 ${
            isDragOver ? 'border-[#4077d9] bg-[#f0f7ff]' : 'border-dashed border-[#bdbdbd]'
          }`}
        >
          {notes.map((note) => (
            <AssignedNoteItem
              key={String(note.id)}
              note={note}
              routeId={normalizedRouteId}
              onRemove={canRemove ? handleRemoveClick : undefined}
              onViewNote={(n) => onViewNote?.(n)}
              canRemove={canRemove}
            />
          ))}
        </div>
      ) : (
        <div
          className={`flex flex-col gap-2 items-center justify-center p-4 rounded-[4px] border-2 min-h-[100px] mb-3 transition-all duration-200
            ${isDragOver ? 'border-[#4077d9] bg-[#f0f7ff]' : 'border-dashed border-[#bdbdbd]'}`}
        >
          {isDragOver ? (
            <>
              <span className="font-bold text-[12px] text-[#4077d9]">Solte para adicionar</span>
              <AppIcon name="add" size={32} color="#4077d9" />
            </>
          ) : (
            <>
              <span className="font-bold text-[12px] text-[#e5d7bc]">Arraste Notas aqui</span>
              <AppIcon name="download" size={32} />
            </>
          )}
        </div>
      )}

      {/* Botão rodapé */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleButtonClick()
        }}
        disabled={!isButtonClickable}
        className={`flex items-center justify-center h-[30px] px-[8px] py-[2px] rounded-[4px] text-white font-bold text-[14px] transition-colors mt-auto w-full ${
          isLockedRoute
            ? 'bg-[#919191] cursor-not-allowed'
            : isDisabled
              ? 'bg-[#919191] cursor-not-allowed'
              : 'bg-[#e67c26] hover:bg-[#d06c1e]'
        }`}
      >
        {isLockedRoute ? 'Em Andamento' : loading ? 'Salvando...' : buttonText}
      </button>
    </div>
  )
}

export default RouteCard
