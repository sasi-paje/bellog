import { useState, useEffect } from 'react'
import { AppIcon, Tabs, TabId, useToast, ToastContainer } from '../../../shared/components'
import { InsertAttachmentModal } from './InsertAttachmentModal'
import { ViewerModal } from './ViewerModal'
import { storageService } from '../../../features/storage'
import { supabase, getEnvironment } from '../../../lib/supabase'

interface AttachmentFile {
  name: string
  type: string
  url?: string
}

interface InvoiceData {
  id: string
  invoice_number: string
  serie?: string
  value?: number
  weight?: number
  gross_weight?: number
  volume?: number
  supplier_name?: string
  destination_name?: string
  is_active?: boolean
  canhoto?: string
  nfd_status?: string
  status?: string
  motivo?: string
  // Campos de arquivo do banco
  receipt_image_path?: string | null
  nfd_image_path?: string | null
  attachments?: {
    nfd?: AttachmentFile[]
    canhoto?: AttachmentFile[]
  }
}

interface RouteNoteDetailProps {
  nota: InvoiceData
  routeCode: string
  routeId: string
  onBack: () => void
  onDesassociar?: () => void
  onRefresh?: () => void
}

// Variável global para armazenar o callback de refresh
let globalRefreshCallback: (() => void) | null = null

export function setGlobalRefreshCallback(callback: () => void) {
  globalRefreshCallback = callback
  console.log('[RouteNoteDetail] Global refresh callback set:', typeof callback)
}

export function triggerGlobalRefresh() {
  if (typeof globalRefreshCallback === 'function') {
    console.log('[RouteNoteDetail] Triggering global refresh...')
    globalRefreshCallback()
  }
}

// Cores exatas do Figma
const PRIMARY_DARK = '#0f3255'
const PRIMARY_LIGHT = '#161a36'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const SECONDARY_ORANGE = '#e67c26'
const BLUE = '#4077d9'
const RED = '#eb5757'
const BORDER_COLOR = '#e0e0e0'
const GRAY_LIGHT = '#eaecf0'

const TABS = [
  { id: 'dados-nota' as TabId, label: 'Dados de Nota' },
  { id: 'anexos' as TabId, label: 'Anexos' },
]

// Helper para formatar peso
const formatWeight = (weight?: number): string => {
  if (!weight) return '-'
  return weight.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' kg'
}

// Campo de visualização simples
const DisplayField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
      {label}
    </p>
    <p className="font-normal text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75, lineHeight: '24px' }}>
      {value}
    </p>
  </div>
)

// Componente para renderizar arquivo na lista
const FileItem = ({ file, onRemove }: { file: AttachmentFile; onRemove: () => void }) => (
  <div className="flex items-center justify-between p-2 rounded w-full" style={{ backgroundColor: GRAY_LIGHT, borderColor: TEXT_LIGHT25, borderWidth: '1px', borderStyle: 'solid' }}>
    <div className="flex items-center gap-2">
      <AppIcon
        name={file.type === 'application/pdf' ? 'file_copy' : 'image'}
        size={24}
        color={TEXT_LIGHT25}
      />
      <span className="text-[14px] truncate max-w-[200px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
        {file.name}
      </span>
    </div>
    <button
      type="button"
      onClick={onRemove}
      className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200"
    >
      <AppIcon name="close" size={20} color={TEXT_LIGHT25} />
    </button>
  </div>
)

// Bloco de anexo (NFD ou Canhoto)
const AttachmentBlock = ({
  label,
  files,
  onEdit,
  onView,
  onDownload,
  onDelete,
  isEditDisabled = false
}: {
  label: string
  files: AttachmentFile[]
  onEdit: () => void
  onView?: (file: AttachmentFile) => void
  onDownload?: (file: AttachmentFile) => void
  onDelete?: (file: AttachmentFile, index: number) => void
  isEditDisabled?: boolean
}) => (
  <div className="flex flex-col gap-3 w-full">
    <p className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
      {label}
    </p>

    {/* Lista de arquivos se existirem */}
    {files.length > 0 ? (
      <div className="flex flex-col gap-2">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-4 py-3 rounded-[6px] w-full"
            style={{ backgroundColor: GRAY_LIGHT, borderColor: TEXT_LIGHT25, borderWidth: '1px', borderStyle: 'solid' }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AppIcon
                name={file.type === 'application/pdf' ? 'file_copy' : 'image'}
                size={24}
                color={TEXT_LIGHT75}
              />
              <span className="text-[14px] truncate" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
                {file.name}
              </span>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <button type="button" className="flex items-center justify-center w-8 h-8 rounded-[4px]" style={{ backgroundColor: '#C7392C' }} onClick={() => onDelete?.(file, index)}>
                <AppIcon name="delete_forever" size={24} color="white" />
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-[4px]"
                style={{ backgroundColor: SECONDARY_ORANGE }}
                onClick={() => onView?.(file)}
              >
                <AppIcon name="visibility" size={24} color="white" />
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-[4px]"
                style={{ backgroundColor: SECONDARY_ORANGE }}
                onClick={() => onDownload?.(file)}
              >
                <AppIcon name="download" size={24} color="white" />
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      /* Área do arquivo vazia */
      <div
        className="flex items-center justify-between px-4 py-3 rounded-[6px] w-full"
        style={{ backgroundColor: GRAY_LIGHT, borderColor: TEXT_LIGHT25, borderWidth: '1px', borderStyle: 'solid' }}
      >
        <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
          Aguardando arquivo
        </p>
        <div className="flex gap-2 items-center justify-end">
          <button type="button" className="flex items-center justify-center w-8 h-8 rounded-[4px]" style={{ backgroundColor: TEXT_LIGHT25 }}>
            <AppIcon name="delete_forever" size={24} color="white" />
          </button>
          <button type="button" className="flex items-center justify-center w-8 h-8 rounded-[4px]" style={{ backgroundColor: TEXT_LIGHT25 }}>
            <AppIcon name="visibility" size={24} color="white" />
          </button>
          <button type="button" className="flex items-center justify-center w-8 h-8 rounded-[4px]" style={{ backgroundColor: TEXT_LIGHT25 }}>
            <AppIcon name="download" size={24} color="white" />
          </button>
        </div>
      </div>
    )}

    {/* Botão Editar */}
    <div className="flex items-center justify-end w-full pt-1">
      <button
        type="button"
        onClick={onEdit}
        disabled={isEditDisabled}
        className="flex items-center justify-center h-[40px] px-[16px] py-[2px] rounded-[4px] gap-2"
        style={{
          backgroundColor: isEditDisabled ? '#cccccc' : SECONDARY_ORANGE,
          minWidth: '120px',
          cursor: isEditDisabled ? 'not-allowed' : 'pointer',
          opacity: isEditDisabled ? 0.6 : 1
        }}
      >
        <AppIcon name="edit" size={20} color="white" />
        <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
          Editar
        </span>
      </button>
    </div>
  </div>
)

export const RouteNoteDetail = ({ nota, routeCode, routeId, onBack, onDesassociar }: RouteNoteDetailProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('dados-nota')
  const { toasts, showSuccess, showError, removeToast } = useToast()
  // Estado local para forçar re-render quando arquivos mudam
  const [refreshKey, setRefreshKey] = useState(0)

  // Detecter mudanças nas props e forçar re-render
  const [lastNotaKey, setLastNotaKey] = useState('')

  // Watch para detectar mudanças nos arquivos
  useEffect(() => {
    const notaKey = `${nota.receipt_image_path}|${nota.nfd_image_path}`
    if (notaKey !== lastNotaKey && lastNotaKey !== '') {
      console.log('[RouteNoteDetail] Arquivos mudaram, forçando re-render:', notaKey)
      setRefreshKey(prev => prev + 1)
    }
    setLastNotaKey(notaKey)
  }, [nota.receipt_image_path, nota.nfd_image_path])

  // Estado para o modal de anexos
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false)
  const [attachmentType, setAttachmentType] = useState<'nfd' | 'canhoto'>('nfd')
  const [deliveryTypeValue, setDeliveryTypeValue] = useState<string | null>(null)

  // Estado para o modal de visualização
  const [viewerData, setViewerData] = useState<{ name: string; url: string; type: string } | null>(null)

  // Arquivos do banco - usando receipt_image_path e nfd_image_path
  const hasCanhoto = nota.receipt_image_path && nota.receipt_image_path !== '[]' && nota.receipt_image_path !== 'null'
  const hasNfd = nota.nfd_image_path && nota.nfd_image_path !== '[]' && nota.nfd_image_path !== 'null'

  console.log('[RouteNoteDetail] nota:', {
    receipt_image_path: nota.receipt_image_path,
    nfd_image_path: nota.nfd_image_path,
    hasCanhoto,
    hasNfd
  })

  // Criar arquivos a partir dos paths do banco
  // Garantir que a URL seja completa para download
  // Suporta tanto string única quanto array JSON
  const getFileUrls = (path: string | null | undefined): string[] => {
    if (!path) return []

    // Se for um array JSON
    if (path.startsWith('[')) {
      try {
        const urls = JSON.parse(path)
        return Array.isArray(urls) ? urls : []
      } catch (e) {
        console.error('[getFileUrls] Erro ao fazer parse do JSON:', e)
        return []
      }
    }

    // Se for URL única
    if (path.startsWith('http')) {
      return [path]
    }

    // Se for path único do Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const bucket = 'bellog-files'
    return [`${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`]
  }

  // Debug - ver se os dados estão sendo atualizados
  console.log('[RouteNoteDetail] Render - nota:', { receipt: nota.receipt_image_path, nfd: nota.nfd_image_path })

  const canhotoUrls = getFileUrls(nota.receipt_image_path)
  const canhotoFiles: AttachmentFile[] = canhotoUrls.map((url, index) => {
    // Detectar tipo pela URL
    const urlLower = url.toLowerCase()
    let fileType = 'application/octet-stream'
    if (urlLower.includes('.pdf') || urlLower.includes('danfe')) {
      fileType = 'application/pdf'
    } else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
      fileType = 'image/jpeg'
    } else if (urlLower.includes('.png')) {
      fileType = 'image/png'
    } else if (urlLower.includes('.gif')) {
      fileType = 'image/gif'
    } else if (urlLower.includes('.webp')) {
      fileType = 'image/webp'
    } else if (urlLower.includes('.bmp')) {
      fileType = 'image/bmp'
    } else if (urlLower.includes('.mp4')) {
      fileType = 'video/mp4'
    }
    const name = url.split('/').pop() || `canhoto_${nota.id || 'file'}_${index + 1}`
    return { name, type: fileType, url }
  })

  const nfdUrls = getFileUrls(nota.nfd_image_path)
  const nfdFiles: AttachmentFile[] = nfdUrls.map((url, index) => {
    // Detectar tipo pela URL
    const urlLower = url.toLowerCase()
    let fileType = 'application/octet-stream'
    if (urlLower.includes('.pdf') || urlLower.includes('danfe')) {
      fileType = 'application/pdf'
    } else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
      fileType = 'image/jpeg'
    } else if (urlLower.includes('.png')) {
      fileType = 'image/png'
    } else if (urlLower.includes('.gif')) {
      fileType = 'image/gif'
    } else if (urlLower.includes('.webp')) {
      fileType = 'image/webp'
    } else if (urlLower.includes('.bmp')) {
      fileType = 'image/bmp'
    } else if (urlLower.includes('.mp4')) {
      fileType = 'video/mp4'
    }
    const name = url.split('/').pop() || `nfd_${nota.id || 'file'}_${index + 1}`
    return { name, type: fileType, url }
  })

  // Status mapeado da nota
  const statusValue = nota.status || (nota.is_active !== false ? 'Ativo' : 'Inativo')

  // Buscar tipo de entrega para validar anexos
  useEffect(() => {
    const checkDeliveryType = async () => {
      if (!routeId || !nota.id) {
        setDeliveryTypeValue(null)
        return
      }

      try {
        const isTest = getEnvironment() !== 'production'
        const { data: delivery } = await supabase
          .from('trx_route_invoice_delivery')
          .select('id_delivery_type')
          .eq('id_route', routeId)
          .eq('id_fiscal_invoice', nota.id)
          .eq('is_active', true)
          .maybeSingle()

        console.log('[RouteNoteDetail] checkDeliveryType:', { routeId, notaId: nota.id, delivery })

        // Buscar o nome do tipo de entrega a partir do id
        if (delivery && delivery.id_delivery_type) {
          const { data: deliveryTypeData } = await supabase
            .from('cat_delivery_type')
            .select('name')
            .eq('id', delivery.id_delivery_type)
            .maybeSingle()

          setDeliveryTypeValue(deliveryTypeData?.name || String(delivery.id_delivery_type))
        } else {
          setDeliveryTypeValue(null)
        }
      } catch (err) {
        console.error('[RouteNoteDetail] Erro ao buscar tipo de entrega:', err)
        setDeliveryTypeValue(null)
      }
    }

    checkDeliveryType()
  }, [routeId, nota.id])

  const handleOpenAttachmentModal = (type: 'nfd' | 'canhoto') => {
    if (!deliveryTypeValue) {
      showError('Informe o Tipo de Entrega antes de anexar um arquivo')
      return
    }

    // Regras de anexo:
    // NFD: apenas para "entrega parcial"
    // Canhoto: apenas para "entrega parcial" ou "entrega total"
    const deliveryTypeLower = deliveryTypeValue.toLowerCase()
    const isEntregaParcial = deliveryTypeLower.includes('parcial')
    const isEntregaTotal = deliveryTypeLower.includes('total')

    if (type === 'nfd') {
      if (!isEntregaParcial) {
        showError('NFD só pode ser anexado em notas com entrega parcial')
        return
      }
    }

    if (type === 'canhoto') {
      if (!isEntregaParcial && !isEntregaTotal) {
        showError('Canhoto só pode ser anexado em notas com entrega parcial ou total')
        return
      }
    }

    setAttachmentType(type)
    setIsAttachmentModalOpen(true)
  }

  const handleViewFile = (file: AttachmentFile) => {
    setViewerData({
      name: file.name,
      url: file.url || '',
      type: file.type
    })
  }

  const handleDownloadFile = async (file: AttachmentFile) => {
    if (!file.url) {
      console.log('[handleDownloadFile] URL não disponível:', file)
      showError('URL do arquivo não disponível')
      return
    }

    console.log('[handleDownloadFile] Baixando:', file.url, 'nome:', file.name)

    try {
      // Buscar o arquivo como blob para forçar o download
      const response = await fetch(file.url)
      if (!response.ok) {
        throw new Error('Falha ao buscar arquivo')
      }

      const blob = await response.blob()
      console.log('[handleDownloadFile] Blob size:', blob.size, 'type:', blob.type)

      // Criar URL do blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Criar link de download
      const link = document.createElement('a')
      link.href = blobUrl

      // Usar nome original do arquivo
      const fileName = file.url.split('/').pop() || file.name
      link.download = fileName
      link.target = '_blank'

      document.body.appendChild(link)
      link.click()

      //Delay para garantir o download
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 1000)

      console.log('[handleDownloadFile] Download iniciado com sucesso')
      showSuccess('Download iniciado')
    } catch (error) {
      console.error('[handleDownloadFile] Erro ao baixar:', error)
      showError('Erro ao baixar arquivo')
      // Fallback: abrir em nova aba
      window.open(file.url, '_blank')
    }
  }

  const handleCloseViewer = () => {
    setViewerData(null)
  }

  const handleDeleteFile = async (file: AttachmentFile, index: number, type: 'nfd' | 'canhoto') => {
    console.log('[handleDeleteFile] Deletando:', file, 'index:', index, 'type:', type, 'routeId:', routeId, 'notaId:', nota.id)

    if (!routeId || !nota.id) {
      console.error('[handleDeleteFile] routeId ou nota.id não disponível')
      return
    }

    try {
      // Buscar o registro de entrega atual
      const { data: existingDelivery } = await supabase
        .from('trx_route_invoice_delivery')
        .select('*')
        .eq('id_route', routeId)
        .eq('id_fiscal_invoice', nota.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!existingDelivery) {
        console.error('[handleDeleteFile] Registro de entrega não encontrado')
        return
      }

      // Pegar o campo basado no tipo
      const fieldName = type === 'canhoto' ? 'receipt_image_path' : 'nfd_image_path'
      const fieldValue = existingDelivery[fieldName as keyof typeof existingDelivery] as string | null

      if (!fieldValue) {
        console.error('[handleDeleteFile] Campo de arquivo não encontrado')
        return
      }

      // Parsear o array existente
      let urls: string[] = []
      if (fieldValue.startsWith('[')) {
        try {
          urls = JSON.parse(fieldValue)
        } catch {
          urls = [fieldValue]
        }
      } else {
        urls = [fieldValue]
      }

      // Remover o arquivo pelo índice
      urls.splice(index, 1)

      // Atualizar o registro
      const { error: updateError } = await supabase
        .from('trx_route_invoice_delivery')
        .update({
          [fieldName]: urls.length > 0 ? JSON.stringify(urls) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDelivery.id)

      if (updateError) {
        console.error('[handleDeleteFile] Erro ao atualizar:', updateError)
        showError('Erro ao excluir arquivo')
      } else {
        console.log('[handleDeleteFile] Arquivo deletado com sucesso')
        showSuccess('Arquivo excluído com sucesso')

        // Notificar para refresh via prop ou global
        if (typeof onRefresh === 'function') {
          console.log('[handleDeleteFile] Chamando onRefresh()...')
          onRefresh()
        } else {
          console.log('[handleDeleteFile] onRefresh não é função, usando global...')
          triggerGlobalRefresh()
        }
      }

    } catch (error) {
      console.error('[handleDeleteFile] Erro geral:', error)
      showError('Erro ao excluir arquivo')
    }
  }

  const handleAddAttachment = async (files: File[], type: 'nfd' | 'canhoto') => {
    console.log('[handleAddAttachment] Arquivos:', files.map(f => f.name), 'tipo:', type, 'routeId:', routeId, 'notaId:', nota.id)

    if (!routeId || !nota.id) {
      console.error('[handleAddAttachment] routeId ou nota.id não disponível')
      return
    }

    try {
      const isTest = getEnvironment() !== 'production'
      const folder = `routes/${routeId}/invoices`

      // Upload de todos os arquivos
      const uploadedUrls: string[] = []
      for (const file of files) {
        console.log('[handleAddAttachment] Fazendo upload de:', file.name)
        const url = await storageService.uploadFile(file, folder)
        if (url) {
          uploadedUrls.push(url)
          console.log('[handleAddAttachment] Upload sucesso:', url)
        } else {
          console.error('[handleAddAttachment] Upload falhou para:', file.name)
        }
      }

      if (uploadedUrls.length === 0) {
        console.error('[handleAddAttachment] Nenhum arquivo foi enviado')
        showError('Nenhum arquivo foi enviado')
        return
      }

      // Pegar o primeiro arquivo (padrão para Canhoto/NFD)
      const fileUrl = uploadedUrls[0]

      // Verificar se já existe registro de entrega
      const { data: existingDelivery } = await supabase
        .from('trx_route_invoice_delivery')
        .select('*')
        .eq('id_route', routeId)
        .eq('id_fiscal_invoice', nota.id)
        .eq('is_active', true)
        .maybeSingle()

      console.log('[handleAddAttachment] existingDelivery:', existingDelivery)

      // Converter array de URLs para JSON
      const allUrls = JSON.stringify(uploadedUrls)

      if (existingDelivery) {
        // Update - adicionar aos arquivos existentes ou criar novo array
        const existingField = type === 'canhoto' ? existingDelivery.receipt_image_path : existingDelivery.nfd_image_path
        let existingUrls: string[] = []

        // Se já existir algo, tentar parsear como JSON
        if (existingField && existingField.startsWith('[')) {
          try {
            existingUrls = JSON.parse(existingField)
          } catch (e) {
            existingUrls = [existingField]
          }
        } else if (existingField) {
          existingUrls = [existingField]
        }

        // Adicionar novos arquivos
        const newUrls = [...existingUrls, ...uploadedUrls]
        const updateData = type === 'canhoto'
          ? { receipt_image_path: JSON.stringify(newUrls), updated_at: new Date().toISOString() }
          : { nfd_image_path: JSON.stringify(newUrls), updated_at: new Date().toISOString() }

        const { error: updateError } = await supabase
          .from('trx_route_invoice_delivery')
          .update(updateData)
          .eq('id', existingDelivery.id)

        if (updateError) {
          console.error('[handleAddAttachment] Erro ao atualizar:', updateError)
          showError('Erro ao salvar arquivo')
          setIsAttachmentModalOpen(false)
        } else {
          console.log('[handleAddAttachment] Atualizado com sucesso')
          showSuccess('Arquivo salvo com sucesso')

          // Fechar o modal
          setIsAttachmentModalOpen(false)

          // Notificar o componente pai para atualizar
          if (typeof onRefresh === 'function') {
            onRefresh()
          } else {
            triggerGlobalRefresh()
          }
        }
      } else {
        // Insert (criar registro de entrega básica) - salvar como array JSON
        const insertData = type === 'canhoto'
          ? {
              id_route: routeId,
              id_fiscal_invoice: nota.id,
              receipt_image_path: allUrls,
              is_test: isTest,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : {
              id_route: routeId,
              id_fiscal_invoice: nota.id,
              nfd_image_path: allUrls,
              is_test: isTest,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

        const { error: insertError } = await supabase
          .from('trx_route_invoice_delivery')
          .insert(insertData)

        if (insertError) {
          console.error('[handleAddAttachment] Erro ao inserir:', insertError)
          showError('Erro ao salvar arquivo')
        } else {
          console.log('[handleAddAttachment] Inserido com sucesso')
          showSuccess('Arquivo salvo com sucesso')

          // Fechar o modal
          setIsAttachmentModalOpen(false)

          // Notificar o componente pai para atualizar
          if (typeof onRefresh === 'function') {
            onRefresh()
          } else {
            triggerGlobalRefresh()
          }
          return
        }
      }

      // Fechar o modal mesmo em caso de erro
      setIsAttachmentModalOpen(false)

    } catch (error) {
      console.error('[handleAddAttachment] Erro geral:', error)
      showError('Erro ao salvar arquivo')
    }
  }

  return (
    <div className="flex flex-col w-full" key={refreshKey}>
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Breadcrumb */}
      <div className="mb-4">
        <span className="font-normal text-[22px]" style={{ color: PRIMARY_DARK }}>
          Notas Fiscais &gt;
        </span>
        <span className="font-bold text-[22px]" style={{ color: PRIMARY_DARK }}>
          Nota
        </span>
        <span className="text-[22px]" style={{ color: PRIMARY_DARK }}>
          {' '}
        </span>
        <span className="font-bold text-[22px]" style={{ color: PRIMARY_DARK }}>
          {nota.invoice_number}
        </span>
      </div>

      {/* Tabs */}
      <div className="bg-white flex h-[52px] items-center justify-start w-full border-b" style={{ borderBottomColor: BORDER_COLOR }}>
        <div className="flex flex-[1_0_0] gap-2 h-full items-center">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-full items-center justify-center px-4 py-2 relative shrink-0 ${
                  isActive ? 'border-b-2 border-solid' : ''
                }`}
                style={{
                  borderColor: isActive ? SECONDARY_ORANGE : 'transparent',
                }}
              >
                <span
                  className="font-medium text-[14px] whitespace-nowrap"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    color: PRIMARY_LIGHT,
                    lineHeight: '24px',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 pt-4">
        {activeTab === 'dados-nota' && (
          <>
            {/* Status */}
            <DisplayField label="Status" value={statusValue} />

            {/* Dados da Nota Section */}
            <div className="flex flex-col gap-2">
              <h3
                className="font-semibold text-[20px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Dados da Nota
              </h3>

              {/* Número da nota e Quantidade lado a lado */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <DisplayField label="Número da nota" value={nota.invoice_number || '-'} />
                </div>
                <div className="flex-1">
                  <DisplayField label="Quantidade de Caixas" value={String(nota.volume || '-')} />
                </div>
              </div>

              {/* Local da entrega e Fornecedor lado a lado */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <DisplayField label="Local da entrega" value={nota.destination_name || '-'} />
                </div>
                <div className="flex-1">
                  <DisplayField label="Fornecedor" value={nota.supplier_name || '-'} />
                </div>
              </div>
            </div>

            {/* Peso do Produto Section */}
            <div className="flex flex-col gap-2">
              <h3
                className="font-semibold text-[20px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Peso do Produto
              </h3>

              <div className="flex gap-4">
                <div className="flex-1">
                  <DisplayField label="Peso Líquido" value={formatWeight(nota.weight)} />
                </div>
                <div className="flex-1">
                  <DisplayField label="Peso Bruto" value={formatWeight(nota.gross_weight)} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'anexos' && (
          <div className="flex flex-col gap-4">
            {/* Bloco NFD - só mostra se for entrega parcial */}
            {deliveryTypeValue?.toLowerCase().includes('parcial') && (
              <AttachmentBlock
                key={`nfd-${nfdFiles.length}`}
                label="NFD"
                files={nfdFiles}
                onEdit={() => handleOpenAttachmentModal('nfd')}
                onView={handleViewFile}
                onDownload={handleDownloadFile}
                onDelete={(file, index) => handleDeleteFile(file, index, 'nfd')}
              />
            )}

            {/* Bloco Canhoto */}
            <AttachmentBlock
              key={`canhoto-${canhotoFiles.length}`}
              label="Canhoto"
              files={canhotoFiles}
              onEdit={() => handleOpenAttachmentModal('canhoto')}
              onView={handleViewFile}
              onDownload={handleDownloadFile}
              onDelete={(file, index) => handleDeleteFile(file, index, 'canhoto')}
            />
          </div>
        )}
      </div>

      
      {/* Modal de Inserir Anexo */}
      <InsertAttachmentModal
        isOpen={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        type={attachmentType}
        onAdd={handleAddAttachment}
      />

      {/* Modal de Visualização de Arquivo */}
      {viewerData && (
        <ViewerModal
          isOpen={true}
          onClose={handleCloseViewer}
          fileName={viewerData.name}
          fileUrl={viewerData.url}
          fileType={viewerData.type}
        />
      )}
    </div>
  )
}