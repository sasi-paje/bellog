import { Modal } from '../../../shared/components'
import { InvoiceListItem } from '../../../services/fiscal-invoice.service'

interface NoteDetailModalProps {
  isOpen: boolean
  onClose: () => void
  note: InvoiceListItem | null
}

const PRIMARY_DARK = '#0f3255'
const TEXT_COLOR = '#2a2a2a'

export const NoteDetailModal = ({ isOpen, onClose, note }: NoteDetailModalProps) => {
  if (!isOpen || !note) return null

  const ViewField = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex flex-col gap-[8px]">
      <span className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
        {label}
      </span>
      <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#e0e0e0] bg-[#f9f9f9] w-full">
        <span className="font-normal text-[14px] w-full" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR, lineHeight: '24px' }}>
          {value || '-'}
        </span>
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Nota ${note.invoice_number}`}
      icon="contract"
      showFooter={true}
    >
      {/* Status */}
      <div className="mb-6">
        <ViewField label="Status" value={note.status_description || 'Pendente'} />
      </div>

      {/* Dados da Nota */}
      <div className="flex flex-col gap-4 mb-6">
        <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
          Dados da Nota
        </h3>

        <ViewField label="Número da nota" value={note.invoice_number} />
        <ViewField label="Quantidade de Caixas" value={note.volume} />

        <div className="flex gap-4">
          <div className="flex-1">
            <ViewField label="Local da entrega" value={note.destination_name || '-'} />
          </div>
          <div className="flex-1">
            <ViewField label="Fornecedor" value={note.supplier_name || '-'} />
          </div>
        </div>
      </div>

      {/* Peso do Produto */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
          Peso do Produto
        </h3>

        <div className="flex gap-4">
          <div className="flex-1">
            <ViewField label="Peso Líquido" value={`${note.weight} kg`} />
          </div>
          <div className="flex-1">
            <ViewField label="Peso Bruto" value={`${Math.ceil(note.weight * 1.05)} kg`} />
          </div>
        </div>
      </div>
    </Modal>
  )
}