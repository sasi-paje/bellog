/**
 * NoteModal - Modal de detalhes da nota fiscal
 */
import React from 'react'
import type { NoteWithDeliveryResult } from '../../delivery/services/delivery.service'

interface NoteModalProps {
  note: NoteWithDeliveryResult
  onClose: () => void
}

export const NoteModal: React.FC<NoteModalProps> = ({ note, onClose }) => {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-[12px]">
        <div className="bg-white flex flex-col gap-[20px] p-[12px] rounded-[6px] w-full max-w-[350px]">
          <p className="font-bold text-[16px] text-[#0f3255]">Dados da Nota</p>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] text-[#919191]">Número da NF</p>
            <p className="text-[14px] text-[#2a2a2a] font-medium">{note.invoice_number}</p>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] text-[#919191]">Empresa</p>
            <p className="text-[14px] text-[#2a2a2a] font-medium">{note.supplier_name}</p>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] text-[#919191]">Quantidade de Caixas</p>
            <p className="text-[14px] text-[#2a2a2a] font-medium">{note.box_quantity || '-'}</p>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] text-[#919191]">Peso Bruto</p>
            <p className="text-[14px] text-[#2a2a2a] font-medium">{note.gross_weight ? `${note.gross_weight} kg` : '-'}</p>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] text-[#919191]">Peso Líquido</p>
            <p className="text-[14px] text-[#2a2a2a] font-medium">{note.net_weight ? `${note.net_weight} kg` : '-'}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-[#e67c26] border-solid flex h-[40px] items-center justify-center rounded-[4px]"
          >
            <span className="font-bold text-[#e67c26] text-[14px]">Voltar</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default NoteModal