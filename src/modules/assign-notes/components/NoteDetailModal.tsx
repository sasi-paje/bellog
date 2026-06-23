import { Modal, ModalFooter, ModalButton } from '../../../shared/components'

interface NoteDetailModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'readonly' | 'editable'
  onEdit?: () => void
  onInactivate?: () => void
  onActivate?: () => void
  note: {
    id: string
    invoice_number: string
    weight: number
    volume: number
    value?: number
    destination_name?: string
    customer_name?: string
    supplier_name?: string
    fornecedor?: string
    is_active?: boolean
    status_description?: string
  } | null
}

const PRIMARY_DARK = '#0f3255'
const TEXT_COLOR = '#2a2a2a'

export const NoteDetailModal = ({ isOpen, onClose, mode = 'editable', onEdit, onInactivate, onActivate, note }: NoteDetailModalProps) => {
  if (!isOpen || !note) return null

  const isReadonly = mode === 'readonly'
  const supplierValue = note.supplier_name || note.fornecedor || '-'
  const customerValue = note.customer_name || note.destination_name || '-'
  const isActive = note.is_active !== false

  const ViewField = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex flex-col gap-2 w-full">
      <span className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
        {label}
      </span>
      <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#e0e0e0] bg-white w-full">
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
      showFooter={false}
    >
      <div className="flex flex-col gap-4">
        {/* Status */}
        <ViewField label="Status" value={note.status_description || (isActive ? 'Ativo' : 'Inativo')} />
      </div>

      {/* Dados da Nota */}
      <div className="flex flex-col gap-4 mt-4">
        <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
          Dados da Nota
        </h3>

        <ViewField label="Número da nota" value={note.invoice_number} />

        <ViewField label="Quantidade de Caixas" value={note.volume} />

        <div className="flex gap-4">
          <div className="flex-1">
            <ViewField label="Local da entrega" value={customerValue} />
          </div>
          <div className="flex-1">
            <ViewField label="Fornecedor" value={supplierValue} />
          </div>
        </div>
      </div>

      {/* Peso do Produto */}
      <div className="flex flex-col gap-4 mt-4">
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

      {/* Footer Buttons — hidden in readonly mode */}
      {!isReadonly && (
        <ModalFooter
          leftActions={
            <ModalButton variant="danger" onClick={isActive ? onInactivate : onActivate}>
              {isActive ? 'Inativar' : 'Ativar'}
            </ModalButton>
          }
          rightActions={
            <ModalButton variant="primary" onClick={onEdit}>
              Editar
            </ModalButton>
          }
        />
      )}
    </Modal>
  )
}
