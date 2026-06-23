import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrivalClientModal } from '../components/ArrivalClientModal'
import {
  arrivalClientService,
  ArrivalClientDestination,
  RouteArrivalView,
} from '../services/arrival-client.service'
import { MobilePageShell, MobileCardLayout } from '../../../shared/components'

interface ArrivalClientPageProps {
  routeId?: string | null
  onBack?: () => void
}

type ModalState = 'none' | 'confirm' | 'justify'

const formatTime = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

const isValidTime = (value: string): boolean => {
  if (!/^\d{2}:\d{2}$/.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

const isoToTime = (iso: string | null): string => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const fileSizeLabel = (file: File): string => {
  const sizeInMb = file.size / 1024 / 1024
  return `${sizeInMb.toFixed(sizeInMb >= 1 ? 1 : 2)} MB`
}

const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

const ALLOWED_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

const isAllowedPhotoFile = (file: File): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ALLOWED_PHOTO_TYPES.has(file.type) || Boolean(extension && ALLOWED_PHOTO_EXTENSIONS.has(extension))
}

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export const ArrivalClientPage: React.FC<ArrivalClientPageProps> = ({ routeId, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [destinations, setDestinations] = useState<ArrivalClientDestination[]>([])
  const [selectedDestinationId, setSelectedDestinationId] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [justification, setJustification] = useState('')
  const [existingRecord, setExistingRecord] = useState<RouteArrivalView | null>(null)
  const [isCheckingRecord, setIsCheckingRecord] = useState(false)
  const [modalState, setModalState] = useState<ModalState>('none')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadDestinations = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await arrivalClientService.getDestinations(routeId || undefined)
        if (isMounted) {
          setDestinations(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar as empresas.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDestinations()

    return () => {
      isMounted = false
    }
  }, [routeId])

  const selectedDestination = useMemo(() => {
    return destinations.find(destination => destination.id === selectedDestinationId) || null
  }, [destinations, selectedDestinationId])

  useEffect(() => {
    if (!selectedDestination) {
      setExistingRecord(null)
      return
    }

    let active = true

    const fetchExistingRecord = async () => {
      setIsCheckingRecord(true)
      setError(null)

      try {
        const record = await arrivalClientService.getRouteArrival(
          selectedDestination.company_id,
          selectedDestination.route_id
        )

        if (!active) return

        setExistingRecord(record)

        // Pre-preenche o horario com o registro existente, mantendo o fluxo de alteracao.
        if (record?.arrived_at) {
          setArrivalTime(isoToTime(record.arrived_at))
        }
      } catch (err) {
        if (!active) return
        setExistingRecord(null)
        setError(err instanceof Error ? err.message : 'Não foi possível verificar a chegada deste cliente.')
      } finally {
        if (active) {
          setIsCheckingRecord(false)
        }
      }
    }

    fetchExistingRecord()

    return () => {
      active = false
    }
  }, [selectedDestination])

  const isFormValid = Boolean(selectedDestination && isValidTime(arrivalTime) && photo)
  const isJustificationValid = justification.trim().length > 0

  const resetForm = () => {
    setSelectedDestinationId('')
    setArrivalTime('')
    setPhoto(null)
    setJustification('')
    setExistingRecord(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRegisterClick = () => {
    if (!isFormValid || isSubmitting) return
    setModalState(existingRecord ? 'justify' : 'confirm')
  }

  const handleSubmit = async () => {
    if (!selectedDestination || !photo || isSubmitting) return
    if (existingRecord && !isJustificationValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      await arrivalClientService.save({
        destination: selectedDestination,
        arrivalTime,
        photo,
        justification: existingRecord ? justification : undefined,
      })

      setModalState('none')
      setSuccessMessage('Chegada registrada com sucesso.')
      resetForm()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar chegada.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setPhoto(null)
      return
    }

    if (!isAllowedPhotoFile(file)) {
      setError('Anexe uma foto em JPG, PNG, WEBP, HEIC ou HEIF.')
      event.target.value = ''
      setPhoto(null)
      return
    }

    setError(null)
    setPhoto(file)
  }

  const removePhoto = () => {
    setPhoto(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <MobilePageShell>
      <MobileCardLayout
        title="Chegada ao Cliente"
        fullHeight
        footer={
          <div className="flex gap-[16px]">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex h-[45px] flex-1 items-center justify-center rounded-[4px] border border-[#e67c26] bg-white px-[8px] py-[2px] text-[14px] font-bold text-[#e67c26] transition-colors hover:bg-[#fff7f1] focus:outline-none focus:ring-2 focus:ring-[#e67c26]/30 disabled:opacity-50"
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={handleRegisterClick}
              disabled={!isFormValid || isSubmitting || isCheckingRecord}
              className="flex h-[45px] flex-1 items-center justify-center rounded-[4px] bg-[#e67c26] px-[8px] py-[2px] text-[14px] font-bold text-white transition-colors hover:bg-[#cf6f22] focus:outline-none focus:ring-2 focus:ring-[#e67c26]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-[8px]">
                  <LoadingSpinner />
                  Enviando...
                </span>
              ) : existingRecord ? 'Atualizar chegada' : 'Registrar'}
            </button>
          </div>
        }
      >
        {successMessage && (
          <div className="shrink-0 rounded-[4px] border border-[#76c893] bg-[#e7f7ed] px-[12px] py-[10px] text-[14px] font-medium text-[#1f7a3f]" role="status">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="shrink-0 rounded-[4px] border border-[#f3a4a4] bg-[#fff0f0] px-[12px] py-[10px] text-[14px] font-medium text-[#a33232]" role="alert">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto">
          <div className="flex w-full shrink-0 flex-col gap-[8px]">
            <label htmlFor="arrival-company" className="text-[14px] font-semibold leading-normal text-[#161a36]">
              Empresa
            </label>
            <select
              id="arrival-company"
              value={selectedDestinationId}
              onChange={(event) => setSelectedDestinationId(event.target.value)}
              disabled={isLoading || isSubmitting}
              className="h-[45px] w-full rounded-[5px] border border-[#d9d9d9] bg-white px-[16px] py-[12px] text-[14px] text-[#2a2a2a] outline-none transition-colors focus:border-[#e67c26] focus:ring-2 focus:ring-[#e67c26]/20 disabled:bg-[#f5f5f5] disabled:text-[#919191]"
            >
              <option value="">{isLoading ? 'Carregando...' : 'Selecione a empresa'}</option>
              {destinations.map(destination => (
                <option key={destination.id} value={destination.id}>
                  {destination.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[8px]">
            <label htmlFor="arrival-time" className="text-[14px] font-semibold leading-normal text-[#161a36]">
              Horário de chegada
            </label>
            <input
              id="arrival-time"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="hh:mm"
              maxLength={5}
              value={arrivalTime}
              disabled={isSubmitting}
              onChange={(event) => setArrivalTime(formatTime(event.target.value))}
              className="h-[45px] w-full rounded-[5px] border border-[#d9d9d9] bg-white px-[16px] py-[12px] text-[14px] text-[#2a2a2a] outline-none transition-colors placeholder:text-[#bdbdbd] focus:border-[#e67c26] focus:ring-2 focus:ring-[#e67c26]/20 disabled:bg-[#f5f5f5]"
              aria-describedby="arrival-time-help"
            />
            <span id="arrival-time-help" className="sr-only">Informe o horario no formato hh:mm.</span>

            {isCheckingRecord && (
              <span className="text-[12px] font-medium leading-[16px] text-[#919191]">
                Verificando chegada registrada...
              </span>
            )}

            {!isCheckingRecord && existingRecord && (
              <div className="rounded-[4px] border border-[#f0c98a] bg-[#fff7ec] px-[12px] py-[10px] text-[13px] font-medium leading-[18px] text-[#a86a14]" role="status">
                Já existe registro de chegada para este cliente. Para alterar, anexe uma nova foto e informe a justificativa.
              </div>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[8px]">
            <label className="text-[14px] font-semibold leading-normal text-[#161a36]">
              Upload da foto da chegada
            </label>

            <input
              ref={fileInputRef}
              id="arrival-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              disabled={isSubmitting}
              onChange={handlePhotoChange}
              className="sr-only"
            />

            {existingRecord?.arrival_photo_url && !photo && (
              <div className="flex flex-col gap-[6px] rounded-[5px] border border-[#d9d9d9] bg-white p-[10px]">
                <span className="text-[12px] font-semibold leading-[16px] text-[#4c4c4c]">
                  Foto registrada
                </span>
                <img
                  src={existingRecord.arrival_photo_url}
                  alt="Foto da chegada registrada"
                  className="max-h-[200px] w-full rounded-[4px] object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {!photo ? (
              <label
                htmlFor="arrival-photo"
                className="flex min-h-[96px] w-full cursor-pointer flex-col items-center justify-center gap-[6px] rounded-[5px] border border-dashed border-[#d9d9d9] bg-white px-[16px] py-[14px] text-center transition-colors hover:border-[#e67c26] focus-within:border-[#e67c26]"
              >
                <span className="text-[14px] font-bold leading-[19.6px] text-[#e67c26]">
                  Anexar imagem
                </span>
                <span className="text-[12px] font-medium leading-[16px] text-[#919191]">
                  JPG, PNG, WEBP, HEIC ou HEIF
                </span>
              </label>
            ) : (
              <div className="flex min-h-[64px] items-center gap-[12px] rounded-[5px] border border-[#d9d9d9] bg-white px-[12px] py-[10px]">
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="truncate text-[14px] font-semibold leading-[19.6px] text-[#2a2a2a]">
                    {photo.name}
                  </span>
                  <span className="text-[12px] font-medium leading-[16px] text-[#919191]">
                    {fileSizeLabel(photo)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={isSubmitting}
                  className="h-[36px] shrink-0 rounded-[4px] border border-[#e67c26] bg-white px-[12px] text-[12px] font-bold text-[#e67c26] transition-colors hover:bg-[#fff7f1] focus:outline-none focus:ring-2 focus:ring-[#e67c26]/30 disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>
      </MobileCardLayout>

      <ArrivalClientModal
        isOpen={modalState === 'confirm'}
        title="Confirmar chegada"
        message={selectedDestination ? `Deseja registrar a chegada na empresa ${selectedDestination.company_name} as ${arrivalTime}?` : ''}
        isLoading={isSubmitting}
        onCancel={() => setModalState('none')}
        onConfirm={handleSubmit}
      />

      <ArrivalClientModal
        isOpen={modalState === 'justify'}
        title="Justificativa obrigatória"
        message={existingRecord && selectedDestination ? `Você já possui um registro para a empresa ${selectedDestination.company_name}, deseja alterar o registro para as ${arrivalTime}?` : ''}
        isLoading={isSubmitting}
        isConfirmDisabled={!isJustificationValid}
        onCancel={() => setModalState('none')}
        onConfirm={handleSubmit}
      >
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="arrival-justification" className="text-[14px] font-semibold leading-normal text-[#161a36]">
            Justificativa
          </label>
          <textarea
            id="arrival-justification"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            disabled={isSubmitting}
            placeholder="Descreva o motivo da alteração"
            className="h-[112px] w-full resize-none rounded-[5px] border border-[#d9d9d9] bg-white px-[16px] py-[12px] text-[14px] text-[#2a2a2a] outline-none transition-colors placeholder:text-[#bdbdbd] focus:border-[#e67c26] focus:ring-2 focus:ring-[#e67c26]/20 disabled:bg-[#f5f5f5]"
          />
        </div>
      </ArrivalClientModal>
    </MobilePageShell>
  )
}

export default ArrivalClientPage
