/**
 * Página de Entrega (Mobile)
 * Mesmo padrão de layout de MyRoutesPage
 */

import React, { useState, useEffect, useCallback } from 'react'
import { deliveryService, type DeliveryDestination, type DeliveryReason, type DeliveryResultInput } from '../services/delivery.service'
import { FiscalNoteModal, type FiscalNoteModalData } from '../components/FiscalNoteModal'
import SuccessIllustration from '../../../shared/icons/finalizar_mobile.svg?url'
import { MobilePageShell, MobileCardLayout } from '../../../shared/components'

interface DeliveryPageProps {
  onBack?: () => void
  onFinish?: (data: DeliveryFormData) => void
  routeId?: string
}

export interface DeliveryFormData {
  local_entrega: string
  observacoes: string
  notas_fiscais: string[]
}

interface FiscalNote extends FiscalNoteModalData {
  has_canhoto?: boolean
  delivery_result_id?: string
  // Dados temporários da entrega (até Finalizar)
  tempDeliveryData?: {
    delivery_type: string  // 'entrega_total' | 'entrega_parcial' | 'entrega_negada' | 'entrega_abortada'
    delivery_type_id: number  // ID numérico para salvar no banco
    receipt_image_path?: string | null
    nfd_image_path?: string | null
    id_reason?: string | number | null
    nfd_number?: string | null
    returned_box_quantity?: string | null
    returned_amount?: string | null
  }
}

// SVG do ícone open_in_new
const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="#919191"/>
  </svg>
)

// Loading spinner
const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export const DeliveryPage: React.FC<DeliveryPageProps> = ({
  onFinish,
  routeId,
}) => {
  const [localEntrega, setLocalEntrega] = useState<DeliveryDestination | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Parser de observações com marcador @N ou @NF (com deduplicação)
  const parseObservation = (obsText: string, notes: FiscalNote[]): Record<string, string> => {
    const result: Record<string, string> = {}

    if (!obsText || !obsText.trim()) {
      return result
    }

    // Tentar fazer match com padrão específico - suporta @N1: e @NF1:
    const matches = obsText.match(/@(?:NF)?(\d+):\s*([^,]+)/g)

    if (matches && matches.length > 0) {
      // Tem marcadores específicos - processar cada um com deduplicação
      for (const match of matches) {
        const noteMatch = match.match(/@(?:NF)?(\d+):\s*(.+)/)
        if (noteMatch) {
          const noteNum = noteMatch[1]
          const obs = noteMatch[2].trim()
          // Deduplicar: só adicionar se não existir
          if (!result[noteNum]) {
            result[noteNum] = obs
          }
        }
      }
      console.log('[DeliveryPage] Parsed specific observations:', result)
    } else {
      // Sem marcador - aplicar para todas as notas
      const globalObs = obsText.trim()
      for (const note of notes) {
        const noteNum = String(note.id)
        if (!result[noteNum]) {
          result[noteNum] = globalObs
        }
      }
      console.log('[DeliveryPage] Applied global observation to all notes:', result)
    }

    return result
  }

  // Reconstruir campo observações a partir das notas (formato @NF1: texto, @NF2: texto)
  const buildObservationText = (notes: FiscalNote[]): string => {
    if (!notes || notes.length === 0) return ''

    // Usar Map para deduplicar - chave: notaNum, valor: observação
    const seenObs = new Map<string, string>()

    for (const note of notes) {
      const obs = note.observation
      if (obs && obs.trim()) {
        // Usar número da nota
        const noteNum = note.invoice_number?.match(/\d+/)?.[0] || String(note.id)
        // Deduplicar: se já existe mesma observação para essa nota, não duplicar
        if (!seenObs.has(noteNum)) {
          seenObs.set(noteNum, obs)
        }
      }
    }

    // Montar texto final com deduplicação
    const obsParts: string[] = []
    for (const [noteNum, obs] of seenObs) {
      obsParts.push(`@NF${noteNum}: ${obs}`)
    }

    if (obsParts.length > 0) {
      return obsParts.join(', ')
    }

    return ''
  }

  // Buscar observação específica para cada nota
  const getNoteObservation = (noteId: string | number, obsMap: Record<string, string>): string | null => {
    const noteNum = String(noteId)
    return obsMap[noteNum] || null
  }
  const [destinations, setDestinations] = useState<DeliveryDestination[]>([])
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true)
  const [fiscalNotes, setFiscalNotes] = useState<FiscalNote[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<FiscalNote | null>(null)
  const [reasons, setReasons] = useState<DeliveryReason[]>([])
  const [isLoadingReasons, setIsLoadingReasons] = useState(true)
  const [isConfirmingNote, setIsConfirmingNote] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Estado para tela final de sucesso
  const [isFinished, setIsFinished] = useState(false)
  const [finishMessage, setFinishMessage] = useState<{ main: string; subtitle?: string } | null>(null)

  // Buscar motivos de entrega ao carregar
  useEffect(() => {
    const fetchReasons = async () => {
      setIsLoadingReasons(true)
      try {
        // Buscar todos os motivos (vamos filtrar no modal)
        const [parcialReasons, negadaReasons, abortadaReasons] = await Promise.all([
          deliveryService.getDeliveryReasons('parcial'),
          deliveryService.getDeliveryReasons('negada'),
          deliveryService.getDeliveryReasons('abortada'),
        ])
        setReasons([...parcialReasons, ...negadaReasons, ...abortadaReasons])
      } catch (err) {
        console.error('[DeliveryPage] Error fetching reasons:', err)
      } finally {
        setIsLoadingReasons(false)
      }
    }
    fetchReasons()
  }, [])

  // Buscar destinos ao carregar
  useEffect(() => {
    const fetchDestinations = async () => {
      setIsLoadingDestinations(true)
      try {
        const result = await deliveryService.getDestinations()
        setDestinations(result.destinations)
      } catch (err) {
        console.error('[DeliveryPage] Error fetching destinations:', err)
      } finally {
        setIsLoadingDestinations(false)
      }
    }
    fetchDestinations()
  }, [])

  // Buscar notas fiscais quando selecionar uma empresa
  useEffect(() => {
    const fetchFiscalNotes = async () => {
      if (!localEntrega) {
        setFiscalNotes([])
        return
      }

      try {
        const notes = await deliveryService.getFiscalNotesByCompany(localEntrega.company_id, [localEntrega.route_id])

        // Verificar se cada nota já tem resultado de entrega
        const notesWithResults = await Promise.all(
          notes.map(async (note) => {
            const result = await deliveryService.getDeliveryResultByInvoice(String(note.id))

            // Mapear id_delivery_type para string (se existir)
            let deliveryTypeStr: string | undefined
            if (result?.id_delivery_type) {
              deliveryTypeStr = await deliveryService.mapDeliveryTypeIdToString(Number(result.id_delivery_type))
            }

            return {
              ...note,
              has_canhoto: !!result,
              delivery_result_id: result?.id,
              delivery_type: deliveryTypeStr,
              // Passar campos do resultado para o modal
              id_reason: result?.id_reason,
              nfd_number: result?.nfd_number,
              returned_box_quantity: result?.returned_box_quantity ? String(result.returned_box_quantity) : null,
              returned_amount: result?.returned_amount ? String(result.returned_amount) : null,
              receipt_image_path: result?.receipt_image_path,
              nfd_image_path: result?.nfd_image_path,
              observation: result?.observation,
            }
          })
        )

        setFiscalNotes(notesWithResults)

        // Reconstruir observações salvas para exibir no campo
        const obsText = buildObservationText(notesWithResults)
        setObservacoes(obsText)
      } catch (err) {
        console.error('[DeliveryPage] Error fetching fiscal notes:', err)
      }
    }
    fetchFiscalNotes()
  }, [localEntrega])

  const handleConfirmNote = useCallback(async (data: DeliveryResultInput, deliveryType: string, deliveryTypeId: number) => {
    setIsConfirmingNote(true)
    try {
      // NÃO salvar no banco - armazenar temporariamente em memória
      // Os dados serão salvos apenas quando clicar em "Finalizar"

      console.log('[DeliveryPage] Storing temp delivery data:', data, 'type:', deliveryType)

      // Atualizar a lista de notas fiscais com dados temporários
      setFiscalNotes(prev => prev.map(n => {
        // Encontrar o ID numérico para comparar
        const noteIdNum = typeof n.id === 'string' ? parseInt(n.id, 10) : n.id
        const dataInvoiceNum = typeof data.id_fiscal_invoice === 'string' ? parseInt(data.id_fiscal_invoice, 10) : data.id_fiscal_invoice

        if (noteIdNum === dataInvoiceNum) {
          return {
            ...n,
            has_canhoto: !!data.receipt_image_path,
            delivery_type: deliveryType,  // Armazenar tipo string para display
            tempDeliveryData: {
              delivery_type: deliveryType,
              delivery_type_id: deliveryTypeId,
              receipt_image_path: data.receipt_image_path,
              nfd_image_path: data.nfd_image_path,
              id_reason: data.id_reason,
              nfd_number: data.nfd_number,
              returned_box_quantity: data.returned_box_quantity,
              returned_amount: data.returned_amount,
            }
          }
        }
        return n
      }))

      setIsModalOpen(false)
      setSelectedNote(null)
      setSuccessMessage('Dados salvos temporariamente. Confirme no Finalizar.')

      // Limpar mensagem após 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('[DeliveryPage] Error storing temp delivery result:', err)
      throw err
    } finally {
      setIsConfirmingNote(false)
    }
  }, [])

  const handleFinish = async () => {
    if (!localEntrega) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Salvar cada nota com dados temporários no banco
      const notesToSave = fiscalNotes.filter(n => n.tempDeliveryData)

      console.log('[DeliveryPage] Saving delivery results for notes:', notesToSave.length)

      // Parsear observações antes de salvar
      const obsMap = parseObservation(observacoes, fiscalNotes)

      const saveErrors: string[] = []

      for (const note of notesToSave) {
        if (note.tempDeliveryData) {
          const noteObs = getNoteObservation(note.id, obsMap)

          const deliveryData: DeliveryResultInput = {
            id_fiscal_invoice: note.id,
            id_route: note.id_route,
            id_route_invoice: note.id_route_invoice || null,
            id_delivery_type: note.tempDeliveryData.delivery_type_id,
            receipt_image_path: note.tempDeliveryData.receipt_image_path,
            nfd_image_path: note.tempDeliveryData.nfd_image_path,
            id_reason: note.tempDeliveryData.id_reason,
            nfd_number: note.tempDeliveryData.nfd_number,
            returned_box_quantity: note.tempDeliveryData.returned_box_quantity,
            returned_amount: note.tempDeliveryData.returned_amount,
            observation: noteObs,
          }

          console.log('[DeliveryPage] Saving note:', note.id, 'observation:', noteObs)

          const result = await deliveryService.saveDeliveryResult(deliveryData)
          if (!result.success) {
            console.error('[DeliveryPage] Error saving note:', note.id, result.error)
            saveErrors.push(`${note.invoice_number}: ${result.error || 'Erro desconhecido'}`)
          }
        }
      }

      if (saveErrors.length > 0) {
        setErrorMessage(`Erro ao salvar ${saveErrors.length} nota(s):\n${saveErrors.join('\n')}`)
        return
      }

      console.log('[DeliveryPage] All delivery results saved')

      // Atualizar estado com dados salvos no banco
      const updatedNotes = await Promise.all(
        fiscalNotes.map(async (note) => {
          if (note.tempDeliveryData) {
            const savedResult = await deliveryService.getDeliveryResultByInvoice(String(note.id))
            if (savedResult) {
              let deliveryTypeStr: string | undefined
              if (savedResult.id_delivery_type) {
                deliveryTypeStr = await deliveryService.mapDeliveryTypeIdToString(Number(savedResult.id_delivery_type))
              }
              return {
                ...note,
                has_canhoto: !!savedResult,
                delivery_type: deliveryTypeStr,
                delivery_result_id: savedResult.id,
                id_reason: savedResult.id_reason,
                nfd_number: savedResult.nfd_number,
                returned_box_quantity: savedResult.returned_box_quantity ? String(savedResult.returned_box_quantity) : null,
                returned_amount: savedResult.returned_amount ? String(savedResult.returned_amount) : null,
                receipt_image_path: savedResult.receipt_image_path,
                nfd_image_path: savedResult.nfd_image_path,
                observation: savedResult.observation,
                tempDeliveryData: undefined
              }
            }
          }
          return { ...note, tempDeliveryData: undefined }
        })
      )

      setFiscalNotes(updatedNotes)

      // Calcular a mensagem final com base nos tipos de entrega
      // Prioridade: Abortada > Negada > Parcial > Total
      const deliveryTypes = updatedNotes
        .map(n => n.delivery_type)
        .filter((t): t is string => !!t)

      const hasAbortada = deliveryTypes.includes('entrega_abortada')
      const hasNegada = deliveryTypes.includes('entrega_negada')
      const hasParcial = deliveryTypes.includes('entrega_parcial')
      const hasTotal = deliveryTypes.includes('entrega_total')

      let finishMsg: { main: string; subtitle?: string }

      if (hasAbortada) {
        finishMsg = {
          main: 'Seu formulário foi enviado com sucesso!',
          subtitle: 'No entanto, a entrega foi marcada como Abortada e justificativa será avaliada.'
        }
      } else if (hasNegada) {
        finishMsg = {
          main: 'Seu formulário foi enviado com sucesso!',
          subtitle: 'No entanto, a entrega foi marcada como Negada e justificativa será avaliada.'
        }
      } else if (hasParcial) {
        finishMsg = {
          main: 'Seu formulário foi enviado com sucesso!',
          subtitle: 'No entanto, a entrega foi marcada como Parcial e certos itens deverão ser devolvidos.'
        }
      } else if (hasTotal) {
        finishMsg = {
          main: 'Seu formulário foi enviado com sucesso!'
        }
      } else {
        finishMsg = {
          main: 'Seu formulário foi enviado com sucesso!'
        }
      }

      setFinishMessage(finishMsg)
      setIsFinished(true)

      if (onFinish) {
        onFinish({
          local_entrega: localEntrega.company_name,
          observacoes: observacoes,
          notas_fiscais: fiscalNotes.map(n => n.id),
        })
      }

      // Remover success message - agora mostra tela final
      // setSuccessMessage('Entrega finalizada com sucesso!')
      // setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('[DeliveryPage] Error on finish:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get status text based on delivery type (prioriza tempDeliveryData)
  const getStatusText = (note: FiscalNote) => {
    // Primeiro verifica se tem dados temporários
    if (note.tempDeliveryData?.delivery_type) {
      switch (note.tempDeliveryData.delivery_type) {
        case 'entrega_total':
          return 'Entrega Total'
        case 'entrega_parcial':
          return 'Entrega Parcial'
        case 'entrega_negada':
          return 'Entrega Negada'
        case 'entrega_abortada':
          return 'Entrega Abortada'
        default:
          break
      }
    }

    // Fallback para dados já salvos no banco
    if (note.delivery_type) {
      switch (note.delivery_type) {
        case 'entrega_total':
          return 'Entrega Total'
        case 'entrega_parcial':
          return 'Entrega Parcial'
        case 'entrega_negada':
          return 'Entrega Negada'
        case 'entrega_abortada':
          return 'Entrega Abortada'
        default:
          return 'Concluído'
      }
    }

    return 'Aguardando'
  }

  // Renderizar tela final de sucesso
  if (isFinished && finishMessage) {
    return (
      <MobilePageShell>
        <MobileCardLayout
          title="Formulário enviado"
          footer={
            <button
              type="button"
              onClick={() => {
                setIsFinished(false)
                setFinishMessage(null)
                setFiscalNotes([])
                setLocalEntrega(null)
                setObservacoes('')
              }}
              className="bg-[#e67c26] flex w-full h-[45px] items-center justify-center rounded-[4px]"
            >
              <span className="font-bold text-[14px] text-white text-center">Voltar</span>
            </button>
          }
        >
          <div className="flex-1 flex flex-col gap-[38px] items-center py-[46px]">
            <p className="font-medium leading-[19.6px] text-[16px] text-[#000000] text-center">
              {finishMessage.main}
            </p>
            <div className="flex flex-col items-start px-[23px] py-[19px]">
              <img src={SuccessIllustration} alt="Sucesso" className="w-[181px] h-[198px]" />
            </div>
            {finishMessage.subtitle && (
              <p className="font-medium leading-[19.6px] text-[16px] text-[#000000] text-center">
                {finishMessage.subtitle}
              </p>
            )}
          </div>
        </MobileCardLayout>
      </MobilePageShell>
    )
  }

  // Trava a troca do "Local da entrega" quando pelo menos uma nota já tem tipo
  // de entrega registrado (temporário nesta sessão ou já salvo). Mudar de local
  // descartaria o progresso — o usuário deve preencher as notas e finalizar.
  const hasRegisteredDelivery = fiscalNotes.some(
    (n) => n.tempDeliveryData !== undefined || n.has_canhoto
  )

  return (
    <MobilePageShell>
      <MobileCardLayout
        title="Formulário de entrega"
        footer={
          <button
            type="button"
            onClick={handleFinish}
            disabled={isLoading || !localEntrega || fiscalNotes.length === 0 || fiscalNotes.every(n => n.tempDeliveryData === undefined && n.has_canhoto)}
            className="bg-[#e67c26] flex w-full h-[45px] items-center justify-center rounded-[4px] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner />
                <span className="font-bold text-[14px] text-white text-center">Finalizando...</span>
              </div>
            ) : (
              <span className="font-bold text-[14px] text-white text-center whitespace-nowrap">Finalizar</span>
            )}
          </button>
        }
      >
        {/* Toast de sucesso temporário */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-[14px] shrink-0">
            {successMessage}
          </div>
        )}

        {/* Mensagem de erro ao finalizar */}
        {errorMessage && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-[14px] shrink-0 cursor-pointer"
            onClick={() => setErrorMessage(null)}
          >
            <p className="font-semibold mb-1">Erro ao salvar entrega:</p>
            {errorMessage.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {/* Local da entrega */}
        <div className="flex flex-col gap-[8px] w-full shrink-0">
          <p className="font-semibold leading-[normal] text-[14px] text-[#161a36]">
            Local da entrega <span className="text-[#eb5757]" aria-hidden="true">*</span>
          </p>

          {isLoadingDestinations ? (
            <div className="bg-white border border-[#161a36] border-solid h-[45px] items-center justify-center px-[16px] py-[12px] relative rounded-[5px] w-full flex">
              <span className="text-[#bdbdbd] text-[14px]">Carregando...</span>
            </div>
          ) : destinations.length === 0 ? (
            <div className="bg-white border border-[#161a36] border-solid h-[45px] items-center justify-center px-[16px] py-[12px] relative rounded-[5px] w-full flex">
              <span className="text-[#bdbdbd] text-[14px]">Nenhum destino disponível</span>
            </div>
          ) : (
            <div className="relative w-full">
              <select
                required
                aria-required="true"
                aria-label="Local da entrega"
                disabled={hasRegisteredDelivery}
                value={localEntrega ? String(localEntrega.id) : ''}
                onChange={(e) => {
                  const dest = destinations.find((d) => String(d.id) === e.target.value) || null
                  setLocalEntrega(dest)
                }}
                className={`appearance-none bg-white border border-[#161a36] border-solid h-[45px] px-[16px] pr-[44px] rounded-[5px] w-full text-[14px] ${localEntrega ? 'text-[#2a2a2a]' : 'text-[#bdbdbd]'} ${hasRegisteredDelivery ? 'cursor-not-allowed bg-[#f5f5f5] opacity-70' : 'cursor-pointer'}`}
              >
                <option value="" disabled>Selecione o local da entrega</option>
                {destinations.map((dest) => (
                  <option key={dest.id} value={String(dest.id)} className="text-[#2a2a2a]">
                    {dest.company_name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 flex items-center justify-center">
                <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L7 7L13 1" stroke="#161a36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}

          {!isLoadingDestinations && destinations.length > 0 && !localEntrega && (
            <p className="text-[12px] text-[#919191]">
              Selecione um local para continuar.
            </p>
          )}

          {hasRegisteredDelivery && (
            <p className="text-[12px] text-[#e67c26]">
              Preencha as notas e finalize a entrega antes de alterar o local.
            </p>
          )}
        </div>

        {/* Notas Fiscais */}
        <div className="bg-[#F0F4F9] flex flex-col gap-[8px] pb-[12px] pt-[8px] px-[8px] relative rounded-[6px] w-full shrink-0">
          <div className="flex h-[20px] items-center w-full">
            <p className="font-semibold leading-[19.6px] text-[14px] text-[#2a2a2a]">
              Notas Fiscais
            </p>
          </div>

          {!localEntrega ? (
            <div className="flex h-[20px] items-center w-full">
              <p className="font-normal leading-[19.6px] text-[14px] text-[#919191]">
                Aguardando seleção da empresa...
              </p>
            </div>
          ) : fiscalNotes.length === 0 ? (
            <div className="flex h-[20px] items-center w-full">
              <p className="font-normal leading-[19.6px] text-[14px] text-[#919191]">
                Nenhuma nota fiscal encontrada
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {fiscalNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white border border-[#e67c26] border-solid flex gap-[16px] h-[45px] items-center px-[8px] relative rounded-[4px] w-full cursor-pointer min-w-0"
                  onClick={() => {
                    setSelectedNote(note)
                    setIsModalOpen(true)
                  }}
                >
                  <div className="flex flex-[1_0_0] flex-col justify-center min-w-0">
                    <div className="text-[14px] font-medium text-[#4c4c4c] truncate">
                      {note.invoice_number}
                    </div>
                    <div className="text-[12px] text-[#919191] truncate">
                      {note.supplier_name}
                    </div>
                  </div>
                  <div className={`flex flex-col font-bold justify-center text-[14px] whitespace-nowrap shrink-0 ${
                    (note.has_canhoto || note.tempDeliveryData) ? 'text-[#2e7d32]' : 'text-[#919191]'
                  }`}>
                    {getStatusText(note)}
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="#919191"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divisor entre notas e observações */}
        <div className="h-0 relative shrink-0 w-full">
          <div className="absolute inset-[-1px_0_0_0] border-t border-[#bdbdbd]" />
        </div>

        {/* Observações */}
        <div className="flex flex-col gap-[8px] h-[160px] w-full shrink-0">
          <div className="flex items-center w-full">
            <p className="font-semibold leading-[normal] text-[14px] text-[#0f3255]">
              Observações
            </p>
          </div>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Insira sua observação"
            className="bg-white border border-[#0f3255] border-solid flex flex-[1_0_0] flex-col items-start px-[16px] py-[12px] relative rounded-[5px] w-full text-[14px] text-[#2a2a2a] placeholder:text-[#bdbdbd] resize-none"
          />
        </div>
      </MobileCardLayout>

      <FiscalNoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedNote(null)
        }}
        onConfirm={handleConfirmNote}
        onApplyToAll={handleConfirmNote}
        note={selectedNote}
        allNotes={fiscalNotes}
        reasons={reasons}
        isLoading={isLoadingReasons || isConfirmingNote}
        destinationId={localEntrega?.company_id}
      />
    </MobilePageShell>
  )
}

export default DeliveryPage
