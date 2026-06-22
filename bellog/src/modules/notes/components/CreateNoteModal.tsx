import { useState, useEffect } from 'react'
import { Modal, StatusBadge } from '../../../shared/components'
import { companyService, CompanyOption } from '../../../features/companies'

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: CreateNoteFormData) => void
  loading?: boolean
}

export interface CreateNoteFormData {
  invoice_number: string
  volume: number
  id_customer_company: number | null
  id_supplier_company: number | null
  attempt_number: number
  net_weight: number
  gross_weight: number
  invoice_amount: number
}

const PRIMARY_DARK = '#0f3255'
const TEXT_COLOR = '#2a2a2a'
const PLACEHOLDER_COLOR = '#bdbdbd'

export const CreateNoteModal = ({
  isOpen,
  onClose,
  onSave,
  loading = false,
}: CreateNoteModalProps) => {
  const [formData, setFormData] = useState<CreateNoteFormData>({
    invoice_number: '',
    volume: 0,
    id_customer_company: null,
    id_supplier_company: null,
    attempt_number: 0,
    net_weight: 0,
    gross_weight: 0,
    invoice_amount: 0,
  })

  const [deliveryLocations, setDeliveryLocations] = useState<CompanyOption[]>([])
  const [suppliers, setSuppliers] = useState<CompanyOption[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoadingOptions(true)
      setFormData({
        invoice_number: '',
        volume: 0,
        id_customer_company: null,
        id_supplier_company: null,
        attempt_number: 0,
        net_weight: 0,
        gross_weight: 0,
        invoice_amount: 0,
      })
      Promise.all([
        companyService.listDeliveryLocations(),
        companyService.listSuppliersByRole(),
      ])
        .then(([locations, supps]) => {
          setDeliveryLocations(locations)
          setSuppliers(supps)
        })
        .catch(console.error)
        .finally(() => setIsLoadingOptions(false))
    }
  }, [isOpen])

  const handleSubmit = () => {
    onSave?.(formData)
  }

  const handleBack = () => {
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Criar Nota"
      icon="contract"
      showFooter={true}
      onBack={handleBack}
      onConfirm={handleSubmit}
      confirmLabel={loading ? 'Criando...' : 'Criar'}
      backLabel="Voltar"
      confirmDisabled={loading}
    >
      <div className="flex flex-col gap-[16px] w-full">
        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
            Dados da Nota
          </h3>

          <div className="flex flex-col gap-[8px] w-full">
            <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
              Número da nota
            </label>
            <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="Insira o número da nota"
                className="flex-1 bg-transparent outline-none text-[14px] w-full"
                style={{ fontFamily: 'Inter, sans-serif', color: formData.invoice_number ? TEXT_COLOR : PLACEHOLDER_COLOR }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[8px] w-full">
            <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
              Quantidade de Caixas
            </label>
            <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
              <input
                type="number"
                value={formData.volume || ''}
                onChange={(e) => setFormData({ ...formData, volume: parseInt(e.target.value) || 0 })}
                placeholder="Insira a quantidade de caixas"
                className="flex-1 bg-transparent outline-none text-[14px] w-full"
                style={{ fontFamily: 'Inter, sans-serif', color: formData.volume ? TEXT_COLOR : PLACEHOLDER_COLOR }}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-[8px]">
              <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
                Local da entrega
              </label>
              <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
                <select
                  value={formData.id_customer_company ? String(formData.id_customer_company) : ''}
                  onChange={(e) => setFormData({ ...formData, id_customer_company: e.target.value ? parseInt(e.target.value) : null })}
                  className="flex-1 bg-transparent outline-none text-[14px] w-full"
                  style={{ fontFamily: 'Inter, sans-serif', color: formData.id_customer_company ? TEXT_COLOR : PLACEHOLDER_COLOR }}
                  disabled={isLoadingOptions}
                >
                  <option value="" disabled>
                    {isLoadingOptions ? 'Carregando...' : 'Selecione o Local de entrega'}
                  </option>
                  {deliveryLocations.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-[8px]">
              <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
                Fornecedor
              </label>
              <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
                <select
                  value={formData.id_supplier_company ? String(formData.id_supplier_company) : ''}
                  onChange={(e) => setFormData({ ...formData, id_supplier_company: e.target.value ? parseInt(e.target.value) : null })}
                  className="flex-1 bg-transparent outline-none text-[14px] w-full"
                  style={{ fontFamily: 'Inter, sans-serif', color: formData.id_supplier_company ? TEXT_COLOR : PLACEHOLDER_COLOR }}
                  disabled={isLoadingOptions}
                >
                  <option value="" disabled>
                    {isLoadingOptions ? 'Carregando...' : 'Selecione o Fornecedor'}
                  </option>
                  {suppliers.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-[8px]">
              <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
                Nº Tentativa
              </label>
              <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
                <input
                  type="number"
                  value={formData.attempt_number || ''}
                  onChange={(e) => setFormData({ ...formData, attempt_number: parseInt(e.target.value) || 0 })}
                  placeholder="Insira o número da tentativa"
                  className="flex-1 bg-transparent outline-none text-[14px] w-full"
                  style={{ fontFamily: 'Inter, sans-serif', color: formData.attempt_number ? TEXT_COLOR : PLACEHOLDER_COLOR }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
            Peso do Produto
          </h3>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-[8px]">
              <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
                Peso Líquido (kg)
              </label>
              <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
                <input
                  type="number"
                  value={formData.net_weight || ''}
                  onChange={(e) => setFormData({ ...formData, net_weight: parseFloat(e.target.value) || 0 })}
                  placeholder="Insira o peso líquido"
                  className="flex-1 bg-transparent outline-none text-[14px] w-full"
                  style={{ fontFamily: 'Inter, sans-serif', color: formData.net_weight ? TEXT_COLOR : PLACEHOLDER_COLOR }}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-[8px]">
              <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
                Peso Bruto (kg)
              </label>
              <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
                <input
                  type="number"
                  value={formData.gross_weight || ''}
                  onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                  placeholder="Insira o peso bruto"
                  className="flex-1 bg-transparent outline-none text-[14px] w-full"
                  style={{ fontFamily: 'Inter, sans-serif', color: formData.gross_weight ? TEXT_COLOR : PLACEHOLDER_COLOR }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
            Valor
          </h3>

          <div className="flex flex-col gap-[8px] w-full">
            <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
              Valor da Nota (R$)
            </label>
            <div className="h-[45px] flex items-center px-4 py-3 rounded-[5px] border border-[#0f3255] bg-white w-full">
              <input
                type="number"
                value={formData.invoice_amount || ''}
                onChange={(e) => setFormData({ ...formData, invoice_amount: parseFloat(e.target.value) || 0 })}
                placeholder="Insira o valor da nota"
                className="flex-1 bg-transparent outline-none text-[14px] w-full"
                style={{ fontFamily: 'Inter, sans-serif', color: formData.invoice_amount ? TEXT_COLOR : PLACEHOLDER_COLOR }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
