// Attachment Service - Sistema centralizado de anexos
// Suporta tanto a estrutura atual (campos na tabela) quanto a nova tabela (trx_attachment)
import { supabase, getEnvironment } from '../../../lib/supabase'
import { storageService } from '../../storage'

// Tipos de entidade suportados
export type AttachmentEntityType =
  | 'route_invoice_delivery'  // Entrega de nota fiscal
  | 'route'                   // Rota
  | 'fiscal_invoice'          // Nota fiscal
  | 'vehicle'                 // Veículo
  | 'user'                    // Usuário
  | 'provider'                // Fornecedor
  | 'customer'                // Cliente/Destino

// Tipos de anexo suportados
export type AttachmentType =
  | 'receipt'       // Canhoto de entrega
  | 'nfd'          // NFD/DANFE
  | 'document'    // Documento genérico
  | 'image'       // Imagem genérica
  | 'signature'   // Assinatura
  | 'contract'    // Contrato
  | 'license'     // CNH/Licença
  | 'insurance'   // Seguro
  | 'inspection'  // Laudo/Inspeção
  | 'photo'       // Foto

// Interface do anexo
export interface Attachment {
  id?: number
  entity_type: AttachmentEntityType
  entity_id: number
  attachment_type: AttachmentType
  file_name: string
  file_path: string
  file_url?: string
  mime_type?: string
  file_size?: number
  sort_order?: number
  description?: string
  is_active: boolean
  is_test: boolean
  created_at?: string
  updated_at?: string
}

// Response da operação de upload
export interface UploadResult {
  success: boolean
  file_url?: string
  file_path?: string
  error?: string
}

// Service de anexos
export const attachmentService = {
  /**
   * Listar anexos de uma entidade
   */
  async listByEntity(
    entityType: AttachmentEntityType,
    entityId: number,
    attachmentTypeFilter?: AttachmentType
  ): Promise<Attachment[]> {
    const isTest = getEnvironment() !== 'production'

    let query = supabase
      .from('trx_attachment')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (attachmentTypeFilter) {
      query = query.eq('attachment_type', attachmentTypeFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('[attachmentService.listByEntity] Error:', error)
      throw new Error(error.message)
    }

    return data || []
  },

  /**
   * Buscar um anexo pelo ID
   */
  async getById(id: number): Promise<Attachment | null> {
    const { data, error } = await supabase
      .from('trx_attachment')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[attachmentService.getById] Error:', error)
      return null
    }

    return data
  },

  /**
   * Upload de arquivo(s) para uma entidade
   * Retorna array de URLs em formato JSON para compatibilidade com campos legados
   */
  async upload(
    entityType: AttachmentEntityType,
    entityId: number,
    attachmentType: AttachmentType,
    files: File[],
    folder?: string
  ): Promise<UploadResult> {
    if (!files || files.length === 0) {
      return { success: false, error: 'Nenhum arquivo fornecido' }
    }

    try {
      const isTest = getEnvironment() !== 'production'

      // Definir pasta base baseada no tipo de entidade
      const baseFolder = folder || this.getBaseFolder(entityType, entityId)

      const uploadedUrls: string[] = []
      const filePaths: string[] = []

      // Upload de cada arquivo
      for (const file of files) {
        const result = await storageService.uploadFile(file, baseFolder)
        if (result) {
          uploadedUrls.push(result)
          // Extrair o path relativo
          const pathParts = result.split('/storage/v1/object/public/')
          if (pathParts.length > 1) {
            filePaths.push(pathParts[1])
          }
        }
      }

      if (uploadedUrls.length === 0) {
        return { success: false, error: 'Falha ao fazer upload dos arquivos' }
      }

      // Verificar se a tabela trx_attachment existe
      // Se existir, usar a nova estrutura
      // Se não, usar JSON array (compatibilidade legada)
      const tableExists = await this.checkTableExists()

      if (tableExists) {
        // Inserir cada arquivo na nova tabela
        for (let i = 0; i < files.length; i++) {
          await supabase.from('trx_attachment').insert({
            entity_type: entityType,
            entity_id: entityId,
            attachment_type: attachmentType,
            file_name: files[i].name,
            file_path: filePaths[i] || uploadedUrls[i],
            file_url: uploadedUrls[i],
            mime_type: files[i].type,
            file_size: files[i].size,
            sort_order: i,
            is_active: true,
            is_test: isTest,
          })
        }
      }

      // Retornar primeiro URL para compatibilidade com campos legados
      return {
        success: true,
        file_url: uploadedUrls[0],
        file_path: filePaths[0] || uploadedUrls[0],
      }

    } catch (error) {
      console.error('[attachmentService.upload] Error:', error)
      return { success: false, error: String(error) }
    }
  },

  /**
   * Salvar URLs de anexos em campo JSON (para estrutura legada)
   */
  async saveToLegacyField(
    tableName: string,
    recordId: number,
    fieldName: 'receipt_image_path' | 'nfd_image_path',
    urls: string[]
  ): Promise<boolean> {
    try {
      const jsonUrls = JSON.stringify(urls)

      const { error } = await supabase
        .from(tableName)
        .update({
          [fieldName]: jsonUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)

      if (error) {
        console.error('[attachmentService.saveToLegacyField] Error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[attachmentService.saveToLegacyField] Error:', error)
      return false
    }
  },

  /**
   * Buscar anexos de campo legados (JSON array)
   */
  async getFromLegacyField(
    fieldValue: string | null | undefined
  ): Promise<string[]> {
    if (!fieldValue) return []

    // Se já for um array JSON
    if (fieldValue.startsWith('[')) {
      try {
        const parsed = JSON.parse(fieldValue)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    // Se for URL única
    if (fieldValue.startsWith('http')) {
      return [fieldValue]
    }

    // Se for path único
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const bucket = 'bellog-files'
    return [`${supabaseUrl}/storage/v1/object/public/${bucket}/${fieldValue}`]
  },

  /**
   * Deletar um anexo (soft delete)
   */
  async delete(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trx_attachment')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('[attachmentService.delete] Error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[attachmentService.delete] Error:', error)
      return false
    }
  },

  /**
   * Download de arquivo
   * Retorna blob para forced download
   */
  async download(url: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Falha ao buscar arquivo')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('[attachmentService.download] Error:', error)
      // Fallback: abrir em nova aba
      window.open(url, '_blank')
    }
  },

  // ============ Helpers ============

  /**
   * Verificar se a tabela trx_attachment existe
   */
  async checkTableExists(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trx_attachment')
        .select('id')
        .limit(1)

      // Se não houver erro, a tabela existe
      return !error
    } catch {
      return false
    }
  },

  /**
   * Obter pasta base baseada no tipo de entidade
   */
  getBaseFolder(entityType: AttachmentEntityType, entityId: number): string {
    switch (entityType) {
      case 'route_invoice_delivery':
        return `routes/${entityId}/invoices`
      case 'route':
        return `routes/${entityId}`
      case 'vehicle':
        return `vehicles/${entityId}`
      case 'user':
        return `users/${entityId}`
      case 'provider':
        return `providers/${entityId}`
      case 'customer':
        return `customers/${entityId}`
      default:
        return `${entityType}/${entityId}`
    }
  },

  /**
   * Contar anexos por tipo no sistema
   */
  async countByType(): Promise<Record<string, number>> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('trx_attachment')
      .select('entity_type, attachment_type')
      .eq('is_active', true)
      .eq('is_test', isTest)

    if (error) {
      console.error('[attachmentService.countByType] Error:', error)
      return {}
    }

    const counts: Record<string, number> = {}
    data?.forEach(item => {
      const key = `${item.entity_type}_${item.attachment_type}`
      counts[key] = (counts[key] || 0) + 1
    })

    return counts
  },
}
