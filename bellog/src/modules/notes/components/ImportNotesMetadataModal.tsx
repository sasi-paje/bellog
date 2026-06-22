import { useEffect, useState } from 'react'
import { companyService, CompanyOption } from '../../../features/companies'

export interface ImportMetadata {
  supplierId: string
  tripNumber: string
  arrivalDate: string
}

interface ImportNotesMetadataModalProps {
  values: ImportMetadata
  onChange: (values: ImportMetadata) => void
  onClose: () => void
  onContinue: () => void
}

const PRIMARY_DARK = '#0f3255'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const GRAY_LIGHTER = '#bdbdbd'
const BORDER_COLOR = '#e0e0e0'
const ORANGE = '#e67c26'

export const ImportNotesMetadataModal = ({
  values,
  onChange,
  onClose,
  onContinue,
}: ImportNotesMetadataModalProps) => {
  const [suppliers, setSuppliers] = useState<CompanyOption[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof ImportMetadata, string>>>({})

  useEffect(() => {
    companyService.listSuppliersByRole().then(setSuppliers).catch(console.error)
  }, [])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ImportMetadata, string>> = {}
    if (!values.supplierId) newErrors.supplierId = 'Campo obrigatório'
    if (!values.tripNumber.trim()) newErrors.tripNumber = 'Campo obrigatório'
    if (!values.arrivalDate) newErrors.arrivalDate = 'Campo obrigatório'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (validate()) onContinue()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />

      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[6px] p-6 flex flex-col gap-4 z-50 shadow-lg"
        style={{ border: `1px solid ${GRAY_LIGHTER}`, minWidth: '480px', maxWidth: '560px', width: '50vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <p className="font-bold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
            Importar notas
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* Fields */}
        <div className="flex flex-col gap-4">
          {/* Fornecedor */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
              Fornecedor
            </label>
            <select
              value={values.supplierId}
              onChange={(e) => onChange({ ...values, supplierId: e.target.value })}
              className="h-[45px] px-4 rounded-[5px] w-full bg-white text-[14px] appearance-none"
              style={{
                fontFamily: 'Inter, sans-serif',
                color: values.supplierId ? TEXT_LIGHT75 : TEXT_LIGHT25,
                border: `1px solid ${errors.supplierId ? '#eb5757' : BORDER_COLOR}`,
              }}
            >
              <option value="" disabled>
                Selecione o Fornecedor
              </option>
              {suppliers.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.supplierId && (
              <span className="text-[12px]" style={{ color: '#eb5757', fontFamily: 'Inter, sans-serif' }}>
                {errors.supplierId}
              </span>
            )}
          </div>

          {/* Número de viagens */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
              Número de viagens
            </label>
            <input
              type="text"
              value={values.tripNumber}
              onChange={(e) => onChange({ ...values, tripNumber: e.target.value })}
              placeholder="Insira o número de viagens"
              className="h-[45px] px-4 rounded-[5px] w-full bg-white text-[14px]"
              style={{
                fontFamily: 'Inter, sans-serif',
                color: TEXT_LIGHT75,
                border: `1px solid ${errors.tripNumber ? '#eb5757' : BORDER_COLOR}`,
              }}
            />
            {errors.tripNumber && (
              <span className="text-[12px]" style={{ color: '#eb5757', fontFamily: 'Inter, sans-serif' }}>
                {errors.tripNumber}
              </span>
            )}
          </div>

          {/* Chegada Bellog */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
              Chegada Bellog
            </label>
            <input
              type="date"
              value={values.arrivalDate}
              onChange={(e) => onChange({ ...values, arrivalDate: e.target.value })}
              className="h-[45px] px-4 rounded-[5px] w-full bg-white text-[14px]"
              style={{
                fontFamily: 'Inter, sans-serif',
                color: values.arrivalDate ? TEXT_LIGHT75 : TEXT_LIGHT25,
                border: `1px solid ${errors.arrivalDate ? '#eb5757' : BORDER_COLOR}`,
              }}
            />
            {errors.arrivalDate && (
              <span className="text-[12px]" style={{ color: '#eb5757', fontFamily: 'Inter, sans-serif' }}>
                {errors.arrivalDate}
              </span>
            )}
          </div>
        </div>

        {/* Info text */}
        <p className="text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
          Esses dados serão utilizados para todas as notas enviadas
        </p>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />

        {/* Footer */}
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border bg-white w-[150px]"
            style={{ borderColor: ORANGE }}
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE }}>
              Voltar
            </span>
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
            style={{ backgroundColor: ORANGE }}
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              Continuar
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
