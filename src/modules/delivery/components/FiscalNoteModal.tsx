/**
 * Modal de Abrir Nota Fiscal
 * Usado na tela de Entrega para preencher dados da nota fiscal
 */

import React, { useState, useRef, useEffect } from 'react'
import { storageService } from '../../../features/storage'
import { deliveryService } from '../services/delivery.service'
import type { DeliveryReason, DeliveryResultInput } from '../services/delivery.service'

// Mask functions
const maskNumber = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 20)
}

const maskCurrency = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (!digits) return ''
  const floatValue = parseInt(digits, 10) / 100
  return floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Tipos
export interface FiscalNoteModalData {
  id: string
  invoice_number: string
  supplier_name: string
  status: string
  id_route: string
  id_route_invoice?: string
  delivery_type?: string
  has_canhoto?: boolean
  // Dados salvos no banco (para reidratação)
  delivery_result_id?: string
  id_reason?: string | number | null
  nfd_number?: string | null
  returned_box_quantity?: string | null
  returned_amount?: string | null
  receipt_image_path?: string | null
  nfd_image_path?: string | null
  observation?: string | null
  // Dados temporários para reidratar o modal
  tempDeliveryData?: {
    delivery_type: string
    delivery_type_id: number
    receipt_image_path?: string | null
    nfd_image_path?: string | null
    id_reason?: string | number | null
    nfd_number?: string | null
    returned_box_quantity?: string | null
    returned_amount?: string | null
  }
}

// Grupo de motivos por categoria
interface ReasonGroup {
  category_id: number
  category_name: string
  reasons: DeliveryReason[]
}

// Helper para agrupar motivos por categoria - ordem dinâmica do banco
const groupReasonsByCategory = (reasons: DeliveryReason[]): ReasonGroup[] => {
  const grouped = reasons.reduce((acc, reason) => {
    // Usar categoria_id como chave
    const key = reason.category_id || 0
    if (!acc[key]) {
      acc[key] = {
        category_id: reason.category_id,
        category_name: reason.category_name || 'Outros',
        reasons: []
      }
    }
    acc[key].reasons.push(reason)
    return acc
  }, {} as Record<number, ReasonGroup>)

  // Retorna valores agrupados - ordem segue a ordem do array de entrada (do banco)
  return Object.values(grouped)
}

interface FiscalNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: DeliveryResultInput, deliveryType: string, deliveryTypeId: number) => Promise<void>
  onApplyToAll?: (data: DeliveryResultInput, deliveryType: string, deliveryTypeId: number) => Promise<void>
  note: FiscalNoteModalData | null
  allNotes?: FiscalNoteModalData[]
  reasons: DeliveryReason[]
  isLoading?: boolean
  destinationId?: string | number
}

// Opções de tipo de entrega
const DELIVERY_TYPE_OPTIONS = [
  { value: 'entrega_total', label: 'Entrega Total' },
  { value: 'entrega_parcial', label: 'Entrega Parcial' },
  { value: 'entrega_negada', label: 'Entrega Negada' },
  { value: 'entrega_abortada', label: 'Entrega Abortada' },
]

// Ícone de upload (attach_file)
const buildDeliveryStorageFolder = (
  routeId: string | number | undefined,
  destinationId: string | number | undefined,
  folder: 'canhotos' | 'nfd'
): string => {
  if (!routeId || !destinationId) return folder

  return `rota/${routeId}/destino/${destinationId}/${folder}`
}

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.5 6V17.5C16.5 18.88 15.38 20 14 20C12.62 20 11.5 18.88 11.5 17.5V5C11.5 3.62 12.62 2.5 14 2.5C15.38 2.5 16.5 3.62 16.5 5V8.5H14.5V5H14V5.5H13.5V8.5H14.5V6H16.5ZM6.5 18C7.88 18 9 16.88 9 15.5C9 14.12 7.88 13 6.5 13C5.12 13 4 14.12 4 15.5C4 16.88 5.12 18 6.5 18ZM6.5 14.5C6.9 14.5 7.25 14.85 7.25 15.25C7.25 15.65 6.9 16 6.5 16C6.1 16 5.75 15.65 5.75 15.25C5.75 14.85 6.1 14.5 6.5 14.5ZM17.5 17.5C17.5 15.75 16.12 14.5 14.25 14.5V13C15.38 13 16.25 13.88 16.25 15C16.25 15.63 15.87 16.16 15.31 16.44C16.03 16.75 16.5 17.5 16.5 18.5H18.5C18.5 16.46 17.5 15 17.5 17.5Z" fill="#161a36"/>
  </svg>
)

// Ícone de deletar (delete_forever)
const DeleteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="#1f30a7"/>
  </svg>
)

// Ícone de dropdown
const DropdownIcon = () => (
  <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L7 7L13 1" stroke="#161a36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Close icon
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#919191"/>
  </svg>
)

// Loading spinner
const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export const FiscalNoteModal: React.FC<FiscalNoteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onApplyToAll,
  note,
  allNotes = [],
  reasons,
  isLoading = false,
  destinationId,
}) => {
  const [deliveryType, setDeliveryType] = useState('')
  const [canhoto, setCanhoto] = useState<File | null>(null)
  const [nfdFile, setNfdFile] = useState<File | null>(null)
  // Armazenar nome e URL do arquivo quando já existe (temp ou banco)
  const [canhotoName, setCanhotoName] = useState<string | null>(null)
  const [canhotoUrl, setCanhotoUrl] = useState<string | null>(null)
  const [nfdName, setNfdName] = useState<string | null>(null)
  const [nfdUrl, setNfdUrl] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [numeroNfd, setNumeroNfd] = useState('')
  const [caixasDevolvidas, setCaixasDevolvidas] = useState('')
  const [valorDevolucao, setValorDevolucao] = useState('')
  const [todasNotasAbortadas, setTodasNotasAbortadas] = useState(false)
  const [isDeliveryTypeDropdownOpen, setIsDeliveryTypeDropdownOpen] = useState(false)
  const [isMotivoDropdownOpen, setIsMotivoDropdownOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // State para modal de confirmação de anexos pendentes
  const [showPendingAttachmentsModal, setShowPendingAttachmentsModal] = useState(false)

  const canhotoInputRef = useRef<HTMLInputElement>(null)
  const nfdInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes or note changes
  // Também inicializa com dados temporários existentes (reidratação do modal)
  const prevNoteRef = useRef<string | null>(null)

  useEffect(() => {
    // Só executar se o modal estiver aberto e a nota existir
    if (!isOpen || !note) {
      // Limpar tudo ao fechar
      setDeliveryType('')
      setCanhoto(null)
      setNfdFile(null)
      setMotivo('')
      setNumeroNfd('')
      setCaixasDevolvidas('')
      setValorDevolucao('')
      setTodasNotasAbortadas(false)
      setError(null)
      return
    }

    // Evitar re-render desnecessário se a nota não mudou
    const noteId = note.id
    if (prevNoteRef.current === noteId && deliveryType) {
      return
    }
    prevNoteRef.current = noteId

    // Se tem dados temporários, hidratar o modal com eles
    if (note.tempDeliveryData) {
      setDeliveryType(note.tempDeliveryData.delivery_type || '')
      setMotivo(note.tempDeliveryData.id_reason ? String(note.tempDeliveryData.id_reason) : '')
      setNumeroNfd(note.tempDeliveryData.nfd_number || '')
      setCaixasDevolvidas(note.tempDeliveryData.returned_box_quantity || '')
      setValorDevolucao(note.tempDeliveryData.returned_amount || '')
      // Hydrata nome e URL dos arquivos
      if (note.tempDeliveryData.receipt_image_path) {
        setCanhotoName('Anexo salvo')
        setCanhotoUrl(note.tempDeliveryData.receipt_image_path)
      } else {
        setCanhotoName(null)
        setCanhotoUrl(null)
      }
      if (note.tempDeliveryData.nfd_image_path) {
        setNfdName('Anexo salvo')
        setNfdUrl(note.tempDeliveryData.nfd_image_path)
      } else {
        setNfdName(null)
        setNfdUrl(null)
      }
      setCanhoto(null)
      setNfdFile(null)
    } else if (note.has_canhoto && note.delivery_type) {
      // Hydratrar com dados salvos no banco
      setDeliveryType(note.delivery_type)
      setMotivo(note.id_reason ? String(note.id_reason) : '')
      setNumeroNfd(note.nfd_number || '')
      setCaixasDevolvidas(note.returned_box_quantity || '')
      setValorDevolucao(note.returned_amount || '')
      // Hydrata nome e URL dos arquivos do banco
      if (note.receipt_image_path) {
        setCanhotoName('Anexo salvo')
        setCanhotoUrl(note.receipt_image_path)
      } else {
        setCanhotoName(null)
        setCanhotoUrl(null)
      }
      if (note.nfd_image_path) {
        setNfdName('Anexo salvo')
        setNfdUrl(note.nfd_image_path)
      } else {
        setNfdName(null)
        setNfdUrl(null)
      }
      setCanhoto(null)
      setNfdFile(null)
    } else {
      // Reset normal quando não tem dados temporários
      setDeliveryType('')
      setCanhoto(null)
      setNfdFile(null)
      setCanhotoName(null)
      setCanhotoUrl(null)
      setNfdName(null)
      setNfdUrl(null)
      setMotivo('')
      setNumeroNfd('')
      setCaixasDevolvidas('')
      setValorDevolucao('')
    }

    // Verificar se todas as notas já estão abortadas para marcar o checkbox
    if (allNotes && allNotes.length > 0) {
      const allAreAbortadas = allNotes.every(n => {
        return n.tempDeliveryData?.delivery_type === 'entrega_abortada' || n.delivery_type === 'entrega_abortada'
      })
      setTodasNotasAbortadas(allAreAbortadas)
    } else {
      setTodasNotasAbortadas(false)
    }

    setError(null)
  }, [isOpen])

  if (!isOpen || !note) return null

  const isEntregaParcial = deliveryType === 'entrega_parcial'
  const isEntregaNegada = deliveryType === 'entrega_negada'
  const isEntregaAbortada = deliveryType === 'entrega_abortada'

  // Get the appropriate motivo options based on delivery type
  const getMotivoOptions = () => {
    // Filtrar motivos pelo tipo de entrega
    let typeFilter: string
    if (isEntregaNegada) typeFilter = 'negada'
    else if (isEntregaAbortada) typeFilter = 'abortada'
    else typeFilter = 'parcial'

    const filtered = reasons.filter(r => r.type === typeFilter)
    return filtered
  }

  // Get grouped motivos por categoria
  const getMotivoGroups = (): ReasonGroup[] => {
    const filtered = getMotivoOptions()
    return groupReasonsByCategory(filtered)
  }

  const selectedMotivo = getMotivoOptions().find(opt => String(opt.id) === String(motivo))

  const handleCanhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCanhoto(file)
      setCanhotoName(file.name)  // Armazenar nome do arquivo
      setCanhotoUrl(null)  // Limpar URL anterior quando novo arquivo é selecionado
    }
  }

  const handleRemoveCanhoto = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Se tem URL existente (do temp ou banco), deletar do storage
    const existingCanhotoUrl = note?.tempDeliveryData?.receipt_image_path || note?.receipt_image_path
    if (existingCanhotoUrl) {
      await storageService.deleteFile(existingCanhotoUrl)
    }

    // Limpar states
    setCanhoto(null)
    setCanhotoName(null)
    setCanhotoUrl(null)
    // Marcar que o arquivo foi removido (isso será usado no handleConfirm)
    // Não precisamos de state adicional - a ausência de canhoto + ausência de canhotoUrl significa removido
    if (canhotoInputRef.current) {
      canhotoInputRef.current.value = ''
    }
  }

  const handleNfdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNfdFile(file)
      setNfdName(file.name)  // Armazenar nome do arquivo
      setNfdUrl(null)  // Limpar URL anterior quando novo arquivo é selecionado
    }
  }

  const handleRemoveNfd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNfdFile(null)
    setNfdName(null)
    setNfdUrl(null)
    if (nfdInputRef.current) {
      nfdInputRef.current.value = ''
    }
  }

  const handleConfirm = async () => {
    if (!note) return

    setError(null)
    setIsUploading(true)

    try {
      // Upload de arquivos se existirem (novos arquivos)
      // Se não houver novo arquivo, verificar se usuário removeu ou quer manter
      let canhotoPath: string | null = null
      let nfdPath: string | null = null

      // Verificar se o usuário manteve ou removeu o arquivo
      // Se canhotoUrl e canhotoName são null E não há novo arquivo, significa que foi removido
      const wasCanhotoRemoved = canhoto === null && canhotoUrl === null && canhotoName === null
      const wasNfdRemoved = nfdFile === null && nfdUrl === null && nfdName === null

      // URLs existentes (do temp ou banco)
      const existingCanhotoPath = note.tempDeliveryData?.receipt_image_path || note.receipt_image_path || null
      const existingNfdPath = note.tempDeliveryData?.nfd_image_path || note.nfd_image_path || null

      // Se usuário enviou novo arquivo
      if (canhoto) {
        canhotoPath = await storageService.uploadFile(
          canhoto,
          buildDeliveryStorageFolder(note.id_route, destinationId, 'canhotos')
        )
        if (!canhotoPath) {
          setError('Erro ao fazer upload do canhoto. Verifique o console.')
          setIsUploading(false)
          return
        }
      } else if (!wasCanhotoRemoved && existingCanhotoPath) {
        // Apenas preservar se o usuário NÃO removeu e há URL existente
        canhotoPath = existingCanhotoPath
      } else if (wasCanhotoRemoved) {
        // Usuário removeu - não preservar URL (já foi deletado no handleRemoveCanhoto)
        canhotoPath = null
      }

      if (nfdFile) {
        nfdPath = await storageService.uploadFile(
          nfdFile,
          buildDeliveryStorageFolder(note.id_route, destinationId, 'nfd')
        )
        if (!nfdPath) {
          setError('Erro ao fazer upload da NFD. Verifique o console.')
          setIsUploading(false)
          return
        }
      } else if (!wasNfdRemoved && existingNfdPath) {
        // Apenas preservar se o usuário NÃO removeu e há URL existente
        nfdPath = existingNfdPath
      } else if (wasNfdRemoved) {
        // Usuário removeu - não preservar URL
        nfdPath = null
      }

      // Resolve o id do tipo de entrega pelo code (nunca por id fixo — a
      // ordem dos ids em ref_delivery_reason_type não segue a da UI).
      const deliveryTypeId = await deliveryService.getDeliveryTypeId(deliveryType)
      if (!deliveryTypeId) {
        setError('Tipo de entrega inválido. Tente novamente.')
        setIsUploading(false)
        return
      }

      // Converter IDs para number (tabela espera bigint)
      const idRouteNum = typeof note.id_route === 'string' ? parseInt(note.id_route, 10) : note.id_route
      const idInvoiceNum = typeof note.id === 'string' ? parseInt(note.id, 10) : note.id
      const idReasonNum = motivo ? parseInt(motivo, 10) : null
      const returnedBoxNum = caixasDevolvidas ? parseInt(caixasDevolvidas, 10) : null
      const returnedAmtNum = valorDevolucao ? parseFloat(valorDevolucao) : null

      // Montar payload
      const deliveryData: DeliveryResultInput = {
        id_fiscal_invoice: idInvoiceNum,
        id_route: idRouteNum,
        id_route_invoice: note.id_route_invoice || null,
        id_delivery_type: deliveryTypeId,
        receipt_image_path: canhotoPath,
        nfd_image_path: nfdPath,
        id_reason: idReasonNum,
        nfd_number: isEntregaParcial ? numeroNfd || null : null,
        returned_box_quantity: isEntregaParcial ? String(returnedBoxNum) : null,
        returned_amount: isEntregaParcial ? String(returnedAmtNum) : null,
      }

      // Se "todas as notas abortadas" está marcado E é entrega abortada, aplicar a TODAS as notas da lista
      if (todasNotasAbortadas && isEntregaAbortada && onApplyToAll && allNotes.length > 0) {
        // Aplicar a cada nota da lista (sem upload de arquivo - apenas motivo e tipo)
        for (const targetNote of allNotes) {
          // Pular a nota atual (já será salva pelo onConfirm)
          const targetNoteId = typeof targetNote.id === 'string' ? parseInt(targetNote.id, 10) : targetNote.id
          if (targetNoteId === idInvoiceNum) {
            continue // Skip current note, will be handled by onConfirm
          }

          const targetData: DeliveryResultInput = {
            id_fiscal_invoice: targetNoteId,
            id_route: typeof targetNote.id_route === 'string' ? parseInt(targetNote.id_route, 10) : targetNote.id_route,
            id_route_invoice: targetNote.id_route_invoice || null,
            id_delivery_type: deliveryTypeId,
            receipt_image_path: null,
            nfd_image_path: null,
            id_reason: idReasonNum,
            nfd_number: null,
            returned_box_quantity: null,
            returned_amount: null,
          }

          await onApplyToAll(targetData, deliveryType, deliveryTypeId)
        }
      }

      // Passar também o tipo de entrega string e ID para display no card
      await onConfirm(deliveryData, deliveryType, deliveryTypeId)
    } catch (err) {
      console.error('[FiscalNoteModal] Error confirming:', err)
      setError('Erro ao salvar resultado da entrega')
    } finally {
      setIsUploading(false)
    }
  }

  // Confirm logic based on delivery type
  // Também considera dados temporários existentes (arquivos já salvos como URL)
  // Retorna objeto com info se deve mostrar modal de anexos pendentes
  const getConfirmStatus = () => {
    if (isLoading || isUploading) return { canConfirm: false, showPendingModal: false }

    // Se tem dados temporários com URL de imagem, não precisa de novo arquivo
    const hasExistingCanhoto = note?.tempDeliveryData?.receipt_image_path || note?.receipt_image_path
    const hasExistingNfd = note?.tempDeliveryData?.nfd_image_path || note?.nfd_image_path
    const hasNewCanhoto = canhoto !== null
    const hasNewNfd = nfdFile !== null
    const hasAnyCanhoto = hasNewCanhoto || !!hasExistingCanhoto
    const hasAnyNfd = hasNewNfd || !!hasExistingNfd

    // Verificar se é uma edição (nota já tem registro no banco)
    const isEditing = !!note?.delivery_result_id || (!!note?.has_canhoto && !!note?.delivery_type)

    if (deliveryType === 'entrega_total') {
      // Entrega Total: mostra modal se:
      // 1. Não tem canhoto (pendente)
      // 2. OU é edição (para revisar o registro existente)
      const canConfirmBasic = hasAnyCanhoto
      const showModal = isEditing || !canConfirmBasic
      return {
        canConfirm: true,
        showPendingModal: showModal
      }
    }
    if (isEntregaParcial) {
      // Entrega Parcial: mostra modal se:
      // 1. Faltam campos obrigatórios
      // 2. Ou falta canhoto/NFD
      // 3. Ou é edição
      const hasRequiredFields = motivo && numeroNfd
      const isMissingCanhoto = !hasAnyCanhoto
      const isMissingNfd = !hasAnyNfd
      return {
        canConfirm: hasRequiredFields,
        showPendingModal: hasRequiredFields && (isMissingCanhoto || isMissingNfd || isEditing)
      }
    }
    if (isEntregaNegada) {
      return { canConfirm: motivo !== '', showPendingModal: false }
    }
    if (isEntregaAbortada) {
      // Se "todas as notas abortadas" está marcado, motivo é obrigatório
      const motivoObrigatorio = todasNotasAbortadas ? motivo !== '' : true
      return { canConfirm: motivoObrigatorio, showPendingModal: false }
    }
    return { canConfirm: false, showPendingModal: false }
  }

  const confirmStatus = getConfirmStatus()
  const canConfirm = () => confirmStatus.canConfirm

  // Selected option label
  const selectedOption = DELIVERY_TYPE_OPTIONS.find(opt => opt.value === deliveryType)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[200]"
        onClick={onClose}
      />

      {/* Modal - centered in container */}
      <div className="fixed inset-0 flex items-center justify-center z-[200] p-[12px]">
        <div className="bg-white flex flex-col gap-[16px] p-[16px] rounded-[8px] shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-hidden">
          {/* Header - NF Number + Close (fixo no topo) */}
          <div className="flex items-center justify-between w-full shrink-0 pb-[12px] border-b border-[#e0e0e0]">
            <p className="font-extrabold text-[16px] text-[#0f3255]">
              NF {note.invoice_number}
            </p>
            <button type="button" className="cursor-pointer flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 -mr-1" onClick={onClose} aria-label="Fechar">
              <CloseIcon />
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-[14px] shrink-0">
              {error}
            </div>
          )}

          {/* Body - rolável quando ultrapassa a altura da tela */}
          <div className="flex flex-col gap-[16px] flex-1 overflow-y-auto min-h-0 pr-[4px] -mr-[4px]">
            {/* Tipo da entrega - Dropdown */}
            <div className="flex flex-col gap-[8px] w-full shrink-0">
              <p className="font-semibold text-[14px] text-[#161a36]">
                Tipo da entrega
              </p>
              <div
                className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center justify-between px-[16px] py-[12px] relative rounded-[5px] w-full cursor-pointer"
                onClick={() => !isUploading && setIsDeliveryTypeDropdownOpen(!isDeliveryTypeDropdownOpen)}
              >
                <span className={`text-[14px] ${selectedOption ? 'text-[#2a2a2a]' : 'text-[#bdbdbd]'}`}>
                  {selectedOption?.label || 'Selecione o tipo da entrega'}
                </span>
                <div className="flex items-center justify-center w-[24px] h-[24px]">
                  <DropdownIcon />
                </div>

                {/* Dropdown options */}
                {isDeliveryTypeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#161a36] rounded-[5px] z-[200] max-h-[150px] overflow-auto">
                    {DELIVERY_TYPE_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center px-[16px] py-[12px] hover:bg-[#f0f0f0] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeliveryType(option.value)
                          setIsDeliveryTypeDropdownOpen(false)
                          // Clear all conditional fields when changing type
                          setMotivo('')
                          setNumeroNfd('')
                          setCaixasDevolvidas('')
                          setValorDevolucao('')
                          setNfdFile(null)
                          setTodasNotasAbortadas(false)
                        }}
                      >
                        <span className="text-[14px] text-[#2a2a2a]">
                          {option.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Adicionar Canhoto - File Upload (only for Entrega Total or Entrega Parcial) */}
            {(deliveryType === 'entrega_total' || isEntregaParcial) && (
              <div className="flex flex-col gap-[8px] w-full shrink-0">
                <p className="font-semibold text-[14px] text-[#161a36]">
                  Adicionar Canhoto
                </p>
                <div
                  className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center justify-between px-[16px] py-[12px] relative rounded-[5px] w-full cursor-pointer"
                  onClick={() => !canhoto && !isUploading && canhotoInputRef.current?.click()}
                >
                  {canhoto ? (
                    // Arquivo recém selecionado
                    <>
                      <span className="text-[14px] text-[#1f30a7] flex-1 truncate">
                        {canhoto.name}
                      </span>
                      <div
                        className="flex items-center justify-center w-[24px] h-[24px]"
                        onClick={handleRemoveCanhoto}
                      >
                        <DeleteIcon />
                      </div>
                    </>
                  ) : canhotoName && canhotoUrl ? (
                    // Já existe arquivo anexado (salvo no banco ou temporário) - clicar para visualizar
                    <>
                      <span
                        className="text-[14px] text-[#1f30a7] flex-1 truncate underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(canhotoUrl, '_blank')
                        }}
                      >
                        {canhotoName}
                      </span>
                      <div
                        className="flex items-center justify-center w-[24px] h-[24px]"
                        onClick={handleRemoveCanhoto}
                      >
                        <DeleteIcon />
                      </div>
                    </>
                  ) : (
                    // Nenhum arquivo - estado inicial
                    <>
                      <span className="text-[14px] text-[#bdbdbd]">
                        Anexe o canhoto
                      </span>
                      <div className="flex items-center justify-center w-[24px] h-[24px]">
                        <UploadIcon />
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={canhotoInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleCanhotoChange}
                  disabled={isUploading}
                />
              </div>
            )}

            {/* Campos condicionais para Entrega Parcial */}
            {isEntregaParcial && (
              <>
                {/* Adicionar NFD */}
                <div className="flex flex-col gap-[8px] w-full shrink-0">
                  <p className="font-semibold text-[14px] text-[#161a36]">
                    Adicionar NFD
                  </p>
                  <div
                    className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center justify-between px-[16px] py-[12px] relative rounded-[5px] w-full cursor-pointer"
                    onClick={() => !nfdFile && !isUploading && nfdInputRef.current?.click()}
                  >
                    {nfdFile ? (
                      // Arquivo recém selecionado
                      <>
                        <span className="text-[14px] text-[#1f30a7] flex-1 truncate">
                          {nfdFile.name}
                        </span>
                        <div
                          className="flex items-center justify-center w-[24px] h-[24px]"
                          onClick={handleRemoveNfd}
                        >
                          <DeleteIcon />
                        </div>
                      </>
                    ) : nfdName && nfdUrl ? (
                      // Já existe arquivo anexado (salvo no banco ou temporário) - clicar para visualizar
                      <>
                        <span
                          className="text-[14px] text-[#1f30a7] flex-1 truncate underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(nfdUrl, '_blank')
                          }}
                        >
                          {nfdName}
                        </span>
                        <div
                          className="flex items-center justify-center w-[24px] h-[24px]"
                          onClick={handleRemoveNfd}
                        >
                          <DeleteIcon />
                        </div>
                      </>
                    ) : (
                      // Nenhum arquivo - estado inicial
                      <>
                        <span className="text-[14px] text-[#bdbdbd]">
                          Anexe a nota
                        </span>
                        <div className="flex items-center justify-center w-[24px] h-[24px]">
                          <UploadIcon />
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    ref={nfdInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleNfdChange}
                    disabled={isUploading}
                  />
                </div>

                {/* Motivo */}
                <div className="flex flex-col gap-[8px] w-full shrink-0">
                  <p className="font-semibold text-[14px] text-[#161a36]">
                    Motivo
                  </p>
                  <div
                    className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center justify-between px-[16px] py-[12px] relative rounded-[5px] w-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isUploading) setIsMotivoDropdownOpen(!isMotivoDropdownOpen)
                    }}
                  >
                    <span className={`text-[14px] ${selectedMotivo ? 'text-[#2a2a2a]' : 'text-[#bdbdbd]'}`}>
                      {selectedMotivo?.reason || 'Selecione o motivo'}
                    </span>
                    <div className="flex items-center justify-center w-[24px] h-[24px]">
                      <DropdownIcon />
                    </div>

                    {/* Dropdown options - agrupados por categoria */}
                    {isMotivoDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#161a36] rounded-[5px] z-[200] max-h-[250px] overflow-auto">
                        {getMotivoGroups().map((group) => (
                          <div key={group.category_id}>
                            {/* Nome do grupo - não clicável */}
                            <div className="px-[16px] py-[8px] bg-[#f5f5f5] border-b border-[#e0e0e0]">
                              <span className="text-[12px] font-bold text-[#161a36] uppercase">
                                {group.category_name}
                              </span>
                            </div>
                            {/* Itens do grupo */}
                            {group.reasons.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center px-[16px] py-[12px] hover:bg-[#f0f0f0] cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMotivo(option.id)
                                  setIsMotivoDropdownOpen(false)
                                }}
                              >
                                <span className="text-[14px] text-[#2a2a2a]">
                                  {option.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Número da NFD */}
                <div className="flex flex-col gap-[8px] w-full shrink-0">
                  <p className="font-semibold text-[14px] text-[#161a36]">
                    Número da NFD
                  </p>
                  <input
                    type="text"
                    value={numeroNfd}
                    onChange={(e) => setNumeroNfd(maskNumber(e.target.value))}
                    placeholder="Digite o número da NFD"
                    disabled={isUploading}
                    className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center px-[16px] py-[12px] rounded-[5px] w-full text-[14px] text-[#2a2a2a] placeholder:text-[#bdbdbd] disabled:bg-gray-100"
                  />
                </div>

                {/* Caixas devolvidas */}
                <div className="flex flex-col gap-[8px] w-full shrink-0">
                  <p className="font-semibold text-[14px] text-[#161a36]">
                    Caixas devolvidas
                  </p>
                  <input
                    type="text"
                    value={caixasDevolvidas}
                    onChange={(e) => setCaixasDevolvidas(maskNumber(e.target.value))}
                    placeholder="Digite o número de caixas devolvidas"
                    disabled={isUploading}
                    className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center px-[16px] py-[12px] rounded-[5px] w-full text-[14px] text-[#2a2a2a] placeholder:text-[#bdbdbd] disabled:bg-gray-100"
                  />
                </div>

                {/* Valor da devolução */}
                <div className="flex flex-col gap-[8px] w-full shrink-0">
                  <p className="font-semibold text-[14px] text-[#161a36]">
                    Valor da devolução
                  </p>
                  <input
                    type="text"
                    value={valorDevolucao}
                    onChange={(e) => setValorDevolucao(maskCurrency(e.target.value))}
                    placeholder="Digite o valor da devolução"
                    disabled={isUploading}
                    className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center px-[16px] py-[12px] rounded-[5px] w-full text-[14px] text-[#2a2a2a] placeholder:text-[#bdbdbd] disabled:bg-gray-100"
                  />
                </div>
              </>
            )}

            {/* Campos para Entrega Negada */}
            {isEntregaNegada && (
              <>
                {/* Motivo */}
                <div className="flex flex-col gap-[8px] w-full shrink-0">
                  <p className="font-semibold text-[14px] text-[#161a36]">
                    Motivo
                  </p>
                  <div
                    className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center justify-between px-[16px] py-[12px] relative rounded-[5px] w-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isUploading) {
                        setIsMotivoDropdownOpen(!isMotivoDropdownOpen)
                      }
                    }}
                  >
                    <span className={`text-[14px] ${selectedMotivo ? 'text-[#2a2a2a]' : 'text-[#bdbdbd]'}`}>
                      {selectedMotivo?.reason || 'Selecione o motivo'}
                    </span>
                    <div className="flex items-center justify-center w-[24px] h-[24px]">
                      <DropdownIcon />
                    </div>

                    {/* Dropdown options - agrupados por categoria */}
                    {isMotivoDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#161a36] rounded-[5px] z-[200] max-h-[250px] overflow-auto">
                        {getMotivoGroups().map((group) => (
                          <div key={group.category_id}>
                            {/* Nome do grupo - não clicável */}
                            <div className="px-[16px] py-[8px] bg-[#f5f5f5] border-b border-[#e0e0e0]">
                              <span className="text-[12px] font-bold text-[#161a36] uppercase">
                                {group.category_name}
                              </span>
                            </div>
                            {/* Itens do grupo */}
                            {group.reasons.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center px-[16px] py-[12px] hover:bg-[#f0f0f0] cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMotivo(option.id)
                                  setIsMotivoDropdownOpen(false)
                                }}
                              >
                                <span className="text-[14px] text-[#2a2a2a]">
                                  {option.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Campos para Entrega Abortada */}
            {isEntregaAbortada && (
              <>
                {/* Motivo */}
                <div className="flex flex-col gap-[8px] w-full shrink-0">
                  <p className="font-semibold text-[14px] text-[#161a36]">
                    Motivo
                  </p>
                  <div
                    className="bg-white border border-[#161a36] border-solid flex h-[45px] items-center justify-between px-[16px] py-[12px] relative rounded-[5px] w-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isUploading) setIsMotivoDropdownOpen(!isMotivoDropdownOpen)
                    }}
                  >
                    <span className={`text-[14px] ${selectedMotivo ? 'text-[#2a2a2a]' : 'text-[#bdbdbd]'}`}>
                      {selectedMotivo?.reason || 'Selecione o motivo'}
                    </span>
                    <div className="flex items-center justify-center w-[24px] h-[24px]">
                      <DropdownIcon />
                    </div>

                    {/* Dropdown options - agrupados por categoria */}
                    {isMotivoDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#161a36] rounded-[5px] z-[200] max-h-[250px] overflow-auto">
                        {getMotivoGroups().map((group) => (
                          <div key={group.category_id}>
                            {/* Nome do grupo - não clicável */}
                            <div className="px-[16px] py-[8px] bg-[#f5f5f5] border-b border-[#e0e0e0]">
                              <span className="text-[12px] font-bold text-[#161a36] uppercase">
                                {group.category_name}
                              </span>
                            </div>
                            {/* Itens do grupo */}
                            {group.reasons.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center px-[16px] py-[12px] hover:bg-[#f0f0f0] cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setMotivo(option.id)
                                  setIsMotivoDropdownOpen(false)
                                }}
                              >
                                <span className="text-[14px] text-[#2a2a2a]">
                                  {option.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkbox - Todas as notas do destino foram Abortadas? */}
                <div
                  className="flex items-center gap-[8px] w-full cursor-pointer"
                  onClick={() => !isUploading && setTodasNotasAbortadas(!todasNotasAbortadas)}
                >
                  <div
                    className={`w-[24px] h-[24px] border border-[#161a36] border-solid rounded flex items-center justify-center ${isUploading ? 'opacity-50' : ''}`}
                  >
                    {todasNotasAbortadas && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#161a36"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-[14px] text-[#2a2a2a]">
                    Todas as notas do destino foram Abortadas?
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer - Buttons (fixo no rodapé) */}
          <div className="flex gap-[16px] h-[45px] items-stretch justify-center w-full shrink-0 pt-[12px] border-t border-[#e0e0e0]">
            {/* Voltar Button */}
            <div
              className="bg-white border border-[#e67c26] border-solid flex flex-[1_0_0] h-full items-center justify-center px-[8px] py-[2px] rounded-[4px] cursor-pointer"
              onClick={onClose}
            >
              <span className="font-bold text-[14px] text-[#e67c26] text-center">
                Voltar
              </span>
            </div>

            {/* Confirmar Button */}
            <div
              className={`flex flex-[1_0_0] h-full items-center justify-center px-[8px] py-[2px] rounded-[4px] ${
                canConfirm()
                  ? 'bg-[#e67c26] cursor-pointer'
                  : 'bg-[#919191] cursor-not-allowed'
              }`}
              onClick={() => {
                if (!canConfirm()) return
                if (confirmStatus.showPendingModal) {
                  setShowPendingAttachmentsModal(true)
                } else {
                  handleConfirm()
                }
              }}
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner />
                  <span className="font-bold text-[14px] text-white text-center">Enviando...</span>
                </div>
              ) : (
                <span className={`font-bold text-[14px] text-white text-center`}>
                  Confirmar
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Anexos Pendentes - conforme Figma */}
      {showPendingAttachmentsModal && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 z-[300]" />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[300] p-[12px]">
            <div className="bg-white flex flex-col gap-[20px] p-[12px] rounded-[6px] w-full min-w-[50vw]">
              {/* Título */}
              <div className="flex gap-[12px] items-center justify-center w-full">
                <p className="font-extrabold text-[16px] text-[#0f3255]">
                  Anexos pendentes
                </p>
              </div>

              {/* Mensagem */}
              <div className="flex gap-[12px] items-center w-full">
                <p className="flex-[1_0_0] text-[16px] text-[#0f3255] text-justify">
                  NFDs ou Canhotos estão pendentes e deverão ser adicionados posteriormente pela equipe
                </p>
              </div>

              {/* Footer com botões */}
              <div className="flex gap-[16px] h-[40px] items-end justify-center w-full">
                {/* Botão Voltar */}
                <button
                  type="button"
                  onClick={() => setShowPendingAttachmentsModal(false)}
                  className="bg-white border border-[#e67c26] flex flex-[1_0_0] h-full items-center justify-center px-[8px] py-[2px] rounded-[4px]"
                >
                  <span className="font-bold text-[14px] text-[#e67c26] text-center">
                    Voltar
                  </span>
                </button>

                {/* Botão Continuar */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPendingAttachmentsModal(false)
                    handleConfirm()
                  }}
                  className="bg-[#e67c26] flex flex-[1_0_0] h-full items-center justify-center px-[8px] py-[2px] rounded-[4px]"
                >
                  <span className="font-bold text-[14px] text-white text-center">
                    Continuar
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default FiscalNoteModal
