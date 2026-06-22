import { Modal, StatusBadge } from '../../../shared/components'
import { InvoiceListItem } from '../../../features/notes'
import { NoteStatus } from '../../../shared/components'

interface NoteDetailModalProps {
  isOpen: boolean
  onClose: () => void
  note: InvoiceListItem | null
}

const PRIMARY_DARK = '#0f3255'
const TEXT_COLOR = '#2a2a2a'

export const NoteDetailModal = ({
  isOpen,
  onClose,
  note,
}: NoteDetailModalProps) => {
  if (!isOpen || !note) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const getInvoiceStatus = (data: InvoiceListItem): NoteStatus => {
    if (!data.is_active) return 'Cancelada'
    if (data.route_number) return 'Em Trânsito'
    return 'Pendente'
  }

  const ViewField = ({ label, value }: { label: string; value: string }) => (
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
      title="Detalhes da Nota"
      icon="contract"
      showFooter={true}
      onBack={onClose}
      onConfirm={onClose}
      confirmLabel="Fechar"
      backLabel=""
    >
      <div className="flex flex-col gap-[16px] w-full">
        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
            Dados da Nota
          </h3>

          <ViewField label="Número da nota" value={note.invoice_number || '-'} />
          <ViewField label="Quantidade de Caixas" value={String(note.volume || 0)} />

          <div className="flex gap-4">
            <div className="flex-1">
              <ViewField label="Local da entrega" value={note.destination_name || '-'} />
            </div>
            <div className="flex-1">
              <ViewField label="Fornecedor" value={note.supplier_name || '-'} />
            </div>
          </div>

          <ViewField label="Nº Viagem" value={note.tripNumber || '-'} />

          <div className="flex flex-col gap-[8px]">
            <span className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
              Status
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge status={getInvoiceStatus(note)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
            Peso do Produto
          </h3>

          <div className="flex gap-4">
            <div className="flex-1">
              <ViewField label="Peso Líquido" value={`${(note.weight || 0).toFixed(1)} kg`} />
            </div>
            <div className="flex-1">
              <ViewField label="Peso Bruto" value={`${(note.weight || 0).toFixed(1)} kg`} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
            Valor
          </h3>

          <ViewField label="Valor da Nota" value={formatCurrency(note.value || 0)} />
        </div>
      </div>
    </Modal>
  )
}
