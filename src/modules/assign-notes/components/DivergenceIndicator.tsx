// =====================================================
// DIVERGENCE INDICATOR - Componente para mostrar divergências
// =====================================================
// Arquivo: src/modules/assign-notes/components/DivergenceIndicator.tsx

import { AppIcon } from '../../../shared/components'
import { DivergenceInfo } from '../types/assign-notes.types'

interface DivergenceIndicatorProps {
  divergence: DivergenceInfo
  compact?: boolean
}

export const DivergenceIndicator = ({ divergence, compact = false }: DivergenceIndicatorProps) => {
  if (!divergence.hasDivergence) {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#fef3c7] border border-[#f59e0b]/30">
        <AppIcon name="warning" size={14} color="#f59e0b" />
        <span className="text-[10px] font-semibold text-[#92400e]">
          {Math.abs(divergence.weightDiff)} kg
        </span>
      </div>
    )
  }

  const hasAdditions = divergence.addedNotes.length > 0
  const hasRemovals = divergence.removedNotes.length > 0
  const isPositive = divergence.weightDiff > 0

  return (
    <div className="flex flex-col gap-2 p-3 rounded-[6px] bg-[#fef3c7] border border-[#f59e0b]/30">
      <div className="flex items-center gap-2">
        <AppIcon name="warning" size={18} color="#f59e0b" />
        <span className="font-semibold text-[12px] text-[#92400e]">
          Divergência Detectada
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div className="flex flex-col">
          <span className="text-[#92400e]/70">Banco</span>
          <span className="font-bold text-[#92400e]">
            {divergence.dbNotesCount} notas • {divergence.dbWeight} kg
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[#92400e]/70">Local</span>
          <span className="font-bold text-[#92400e]">
            {divergence.localNotesCount} notas • {divergence.localWeight} kg
          </span>
        </div>
      </div>

      {(hasAdditions || hasRemovals) && (
        <div className="flex gap-2 text-[10px]">
          {hasAdditions && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#d1fae5] text-[#065f46]">
              <AppIcon name="add" size={12} />
              {divergence.addedNotes.length} adicionada(s)
            </span>
          )}
          {hasRemovals && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#fee2e2] text-[#991b1b]">
              <AppIcon name="close" size={12} />
              {divergence.removedNotes.length} removida(s)
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-[#f59e0b]/20">
        <span className="text-[10px] text-[#92400e]/70">Diferença</span>
        <span className={`text-[12px] font-bold ${isPositive ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
          {isPositive ? '+' : ''}{divergence.weightDiff} kg
        </span>
      </div>
    </div>
  )
}

export default DivergenceIndicator