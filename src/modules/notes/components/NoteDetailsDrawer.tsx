import { useState, useEffect } from 'react'
import { Drawer, TabId, FormDropdown, AppIcon } from '../../../shared/components'
import { CompanyOption } from '../../../features/companies'
import { supabase, IS_TEST } from '../../../lib/supabase'
import { ViewerModal } from '../../routes/components/ViewerModal'
import { formatWeight } from '../../../shared/utils/format'

export interface NoteDetailData {
  id: string
  invoice_number: string
  volume?: number
  weight?: number
  gross_weight?: number
  value?: number
  destination_name?: string
  customer_name?: string
  supplier_name?: string
  fornecedor?: string
  tripNumber?: string
  attempt_number?: number
  is_active?: boolean
  id_customer_company?: number
  id_supplier_company?: number
}

export interface NoteEditData {
  invoice_number: string
  volume: number
  weight: number
  gross_weight: number
  value: number
  attempt_number: number
  tripNumber: string
  id_customer_company: number
  id_supplier_company: number
  destination_name: string
  supplier_name: string
}

interface NoteDetailsDrawerProps {
  isOpen: boolean
  onClose: () => void
  note: NoteDetailData | null
  mode?: 'readonly' | 'editable'
  onInactivate?: () => void
  onActivate?: () => void
  onSave?: (data: NoteEditData) => Promise<void>
  deliveryLocations?: CompanyOption[]
  suppliers?: CompanyOption[]
}

interface AttachmentFile {
  name: string
  type: string
  url: string
}

interface DeliveryRecord {
  id: string
  receipt_image_path: string | null
  nfd_image_path: string | null
  nfd_number: string | null
}

const PRIMARY_DARK = '#0f3255'
const TEXT_COLOR = '#2a2a2a'
const BORDER_COLOR = '#e0e0e0'
const ORANGE = '#e67c26'
const TEXT_LIGHT25 = '#919191'
const GRAY_LIGHT = '#eaecf0'

const TABS = [
  { id: 'dados-nota' as TabId, label: 'Dados de Nota' },
  { id: 'anexos' as TabId, label: 'Anexos' },
]

const formatCurrency = (value?: number) => {
  if (!value) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Parse URL(s) from a storage path field — same logic used in RouteNoteDetail
const getFileUrls = (path: string | null | undefined): string[] => {
  if (!path) return []
  if (path.startsWith('[')) {
    try {
      const urls = JSON.parse(path)
      return Array.isArray(urls) ? urls : []
    } catch { return [] }
  }
  if (path.startsWith('http')) return [path]
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  return [`${supabaseUrl}/storage/v1/object/public/bellog-files/${path}`]
}

const detectFileType = (url: string): string => {
  const u = url.toLowerCase()
  if (u.includes('.pdf') || u.includes('danfe')) return 'application/pdf'
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'image/jpeg'
  if (u.includes('.png')) return 'image/png'
  if (u.includes('.webp')) return 'image/webp'
  return 'image/jpeg'
}

function ReadonlyField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[12px] font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#1F2937' }}>
        {label}
      </p>
      <p className="text-[13px] font-normal" style={{ fontFamily: 'Inter, sans-serif', color: '#374151' }}>
        {value != null && value !== '' ? String(value) : '-'}
      </p>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
        {label}
      </p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[45px] px-4 py-3 rounded-[5px] w-full bg-white"
        style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR, border: `1px solid ${BORDER_COLOR}` }}
      />
    </div>
  )
}

export function NoteDetailsDrawer({
  isOpen,
  onClose,
  note,
  mode = 'editable',
  onInactivate,
  onActivate,
  onSave,
  deliveryLocations = [],
  suppliers = [],
}: NoteDetailsDrawerProps) {
  const isReadonly = mode === 'readonly'
  const [activeTab, setActiveTab] = useState<TabId>('dados-nota')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<NoteEditData>({
    invoice_number: '',
    volume: 0,
    weight: 0,
    gross_weight: 0,
    value: 0,
    attempt_number: 0,
    tripNumber: '',
    id_customer_company: 0,
    id_supplier_company: 0,
    destination_name: '',
    supplier_name: '',
  })

  // Attachment state
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState(false)
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([])
  const [viewerData, setViewerData] = useState<{ name: string; url: string; type: string } | null>(null)

  const noteId = note?.id

  // Fetch attachments + Realtime subscription — runs when drawer opens or note changes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setActiveTab('dados-nota')
      setDeliveryRecords([])
      setAttachmentsError(false)
      setViewerData(null)
      return
    }
    if (!noteId) return

    const doFetch = async () => {
      setAttachmentsLoading(true)
      setAttachmentsError(false)
      try {
        const isTest = IS_TEST
        const { data, error } = await supabase
          .from('trx_route_invoice_delivery')
          .select('id, receipt_image_path, nfd_image_path, nfd_number')
          .eq('id_fiscal_invoice', noteId)
          .eq('is_active', true)
          .eq('is_test', isTest)
        if (error) throw error
        setDeliveryRecords((data as DeliveryRecord[]) || [])
      } catch {
        setAttachmentsError(true)
      } finally {
        setAttachmentsLoading(false)
      }
    }

    doFetch()

    const channel = supabase
      .channel(`note-attachments-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trx_route_invoice_delivery',
          filter: `id_fiscal_invoice=eq.${noteId}`,
        },
        () => { doFetch() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isOpen, noteId])

  if (!note) return null

  const isActive = note.is_active !== false
  const isViewing = !isEditing || isReadonly
  const displaySupplier = note.supplier_name || note.fornecedor || '-'
  const displayCustomer = note.customer_name || note.destination_name || '-'

  const handleEditClick = () => {
    setEditData({
      invoice_number: note.invoice_number || '',
      volume: note.volume || 0,
      weight: note.weight || 0,
      gross_weight: note.gross_weight || 0,
      value: note.value || 0,
      attempt_number: note.attempt_number || 0,
      id_customer_company: note.id_customer_company || 0,
      id_supplier_company: note.id_supplier_company || 0,
      destination_name: note.destination_name || '',
      supplier_name: note.supplier_name || '',
      tripNumber: note.tripNumber || '',
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => setIsEditing(false)

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(editData)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setIsEditing(false)
    setActiveTab('dados-nota')
    onClose()
  }

  const handleViewFile = (file: AttachmentFile) => {
    setViewerData({ name: file.name, url: file.url, type: file.type })
  }

  const handleDownloadFile = async (file: AttachmentFile) => {
    try {
      const response = await fetch(file.url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = file.url.split('/').pop() || file.name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 1000)
    } catch {
      window.open(file.url, '_blank')
    }
  }

  const renderDadosNota = () => {
    if (isViewing) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
              Dados da Nota
            </h3>
            <ReadonlyField label="Número da nota" value={note.invoice_number} />
            <ReadonlyField label="Quantidade de Caixas" value={note.volume ?? 0} />
            <div className="flex gap-4">
              <div className="flex-1">
                <ReadonlyField label="Local da entrega" value={displayCustomer} />
              </div>
              <div className="flex-1">
                <ReadonlyField label="Fornecedor" value={displaySupplier} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <ReadonlyField label="Nº Viagem" value={note.tripNumber || '-'} />
              </div>
              <div className="flex-1">
                <ReadonlyField label="Nº Tentativa" value={note.attempt_number ?? 0} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
              Peso do Produto
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <ReadonlyField label="Peso Líquido" value={note.weight ? formatWeight(note.weight) : '-'} />
              </div>
              <div className="flex-1">
                <ReadonlyField label="Peso Bruto" value={note.gross_weight ? formatWeight(note.gross_weight) : '-'} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
              Valor
            </h3>
            <ReadonlyField label="Valor da Nota" value={formatCurrency(note.value)} />
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4 w-full">
        <EditField
          label="Número da nota"
          value={editData.invoice_number}
          onChange={(v) => setEditData({ ...editData, invoice_number: v })}
        />
        <EditField
          label="Quantidade de Caixas"
          value={String(editData.volume)}
          onChange={(v) => setEditData({ ...editData, volume: Number(v) })}
          type="number"
        />

        <div className="flex gap-4">
          <div className="flex-1">
            <FormDropdown
              label="Local da entrega"
              value={editData.id_customer_company ? String(editData.id_customer_company) : ''}
              options={deliveryLocations.map((loc) => ({ value: loc.value, label: loc.label }))}
              onChange={(v) => {
                const selected = deliveryLocations.find((loc) => loc.value === v)
                setEditData({
                  ...editData,
                  destination_name: selected?.label || v,
                  id_customer_company: selected
                    ? parseInt(selected.value, 10)
                    : editData.id_customer_company,
                })
              }}
            />
          </div>
          <div className="flex-1">
            <FormDropdown
              label="Fornecedor"
              value={editData.id_supplier_company ? String(editData.id_supplier_company) : ''}
              options={suppliers.map((sup) => ({ value: sup.value, label: sup.label }))}
              onChange={(v) => {
                const selected = suppliers.find((sup) => sup.value === v)
                setEditData({
                  ...editData,
                  supplier_name: selected?.label || v,
                  id_supplier_company: selected
                    ? parseInt(selected.value, 10)
                    : editData.id_supplier_company,
                })
              }}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <EditField
              label="Nº Viagem"
              value={editData.tripNumber}
              onChange={(v) => setEditData({ ...editData, tripNumber: v })}
            />
          </div>
          <div className="flex-1">
            <EditField
              label="Nº Tentativa"
              value={String(editData.attempt_number)}
              onChange={(v) => setEditData({ ...editData, attempt_number: Number(v) })}
              type="number"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
            Peso do Produto
          </h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <EditField
                label="Peso Líquido"
                value={String(editData.weight)}
                onChange={(v) => setEditData({ ...editData, weight: Number(v) })}
                type="number"
              />
            </div>
            <div className="flex-1">
              <EditField
                label="Peso Bruto"
                value={String(editData.gross_weight)}
                onChange={(v) => setEditData({ ...editData, gross_weight: Number(v) })}
                type="number"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
            Valor
          </h3>
          <EditField
            label="Valor da Nota"
            value={String(editData.value)}
            onChange={(v) => setEditData({ ...editData, value: Number(v) })}
            type="number"
          />
        </div>
      </div>
    )
  }

  const renderAnexos = () => {
    if (attachmentsLoading) {
      return (
        <div className="flex items-center gap-3 py-6">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: ORANGE }}
          />
          <span className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
            Carregando anexos...
          </span>
        </div>
      )
    }

    if (attachmentsError) {
      return (
        <p className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#eb5757' }}>
          Não foi possível carregar os anexos.
        </p>
      )
    }

    // Aggregate files from all delivery records
    const canhotoFiles: AttachmentFile[] = deliveryRecords.flatMap((record) =>
      getFileUrls(record.receipt_image_path).map((url) => ({
        name: url.split('/').pop() || 'canhoto',
        type: detectFileType(url),
        url,
      }))
    )

    const nfdFiles: AttachmentFile[] = deliveryRecords.flatMap((record) =>
      getFileUrls(record.nfd_image_path).map((url) => ({
        name: url.split('/').pop() || 'nfd',
        type: detectFileType(url),
        url,
      }))
    )

    const nfdNumbers = [
      ...new Set(
        deliveryRecords.filter((r) => r.nfd_number).map((r) => r.nfd_number!)
      ),
    ]

    if (canhotoFiles.length === 0 && nfdFiles.length === 0) {
      return (
        <p className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
          Nenhum anexo disponível.
        </p>
      )
    }

    const renderFileBlock = (
      label: string,
      files: AttachmentFile[],
      extra?: React.ReactNode
    ) => (
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-[16px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
          {label}
        </p>
        {extra}
        {files.length > 0 ? (
          <div className="flex flex-col gap-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-3 rounded-[6px]"
                style={{ backgroundColor: GRAY_LIGHT, border: `1px solid ${TEXT_LIGHT25}` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <AppIcon
                    name={file.type === 'application/pdf' ? 'file_copy' : 'image'}
                    size={24}
                    color={TEXT_COLOR}
                  />
                  <span
                    className="text-[14px] truncate"
                    style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
                  >
                    {file.name}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 rounded-[4px]"
                    style={{ backgroundColor: ORANGE }}
                    onClick={() => handleViewFile(file)}
                    title="Visualizar"
                  >
                    <AppIcon name="visibility" size={20} color="white" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 rounded-[4px]"
                    style={{ backgroundColor: ORANGE }}
                    onClick={() => handleDownloadFile(file)}
                    title="Baixar"
                  >
                    <AppIcon name="download" size={20} color="white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex items-center px-4 py-3 rounded-[6px]"
            style={{ backgroundColor: GRAY_LIGHT, border: `1px solid ${TEXT_LIGHT25}` }}
          >
            <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
              Aguardando arquivo
            </p>
          </div>
        )}
      </div>
    )

    return (
      <div className="flex flex-col gap-4">
        {renderFileBlock('Canhoto', canhotoFiles)}
        {(nfdFiles.length > 0 || nfdNumbers.length > 0) &&
          renderFileBlock(
            'NFD',
            nfdFiles,
            nfdNumbers.length > 0 ? (
              <p
                className="text-[13px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#374151' }}
              >
                Nº NFD: {nfdNumbers.join(', ')}
              </p>
            ) : null
          )}
      </div>
    )
  }

  const renderFooter = (): React.ReactNode => {
    if (isReadonly) return undefined

    if (isEditing) {
      return (
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border w-[150px]"
            style={{ borderColor: ORANGE }}
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE }}>
              Cancelar
            </span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] disabled:opacity-50"
            style={{ backgroundColor: ORANGE }}
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </span>
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          onClick={isActive ? onInactivate : onActivate}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#eb5757] w-[150px]"
        >
          <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isActive ? 'Inativar' : 'Ativar'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleEditClick}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
          style={{ backgroundColor: ORANGE }}
        >
          <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            Editar
          </span>
        </button>
      </div>
    )
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        title={`Nota ${note.invoice_number}`}
        icon="contract"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showFooter={!isReadonly}
        footerContent={renderFooter()}
      >
        {activeTab === 'dados-nota' ? renderDadosNota() : renderAnexos()}
      </Drawer>

      {viewerData && (
        <ViewerModal
          isOpen={true}
          onClose={() => setViewerData(null)}
          fileName={viewerData.name}
          fileUrl={viewerData.url}
          fileType={viewerData.type}
        />
      )}
    </>
  )
}
