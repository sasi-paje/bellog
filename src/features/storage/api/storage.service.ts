/**
 * Storage Service
 * Gerencia upload de arquivos para Supabase Storage
 */

import { supabase, STORAGE_ENV_FOLDER } from '../../../lib/supabase'

const STORAGE_BUCKET = 'bellog-files'

export interface UploadResult {
  success: boolean
  path?: string
  url?: string
  error?: string
}

export const storageService = {
  /**
   * Upload de arquivo para Supabase Storage
   * @param file - Arquivo a ser upado
   * @param folder - Pasta destino (ex: 'canhotos', 'nfd')
   * @returns URL pública do arquivo upado ou null em caso de erro
   */
  async uploadFile(file: File, folder: string): Promise<string | null> {
    console.log('[storageService] ========== UPLOAD START ==========')
    console.log('[storageService] File:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    })
    console.log('[storageService] Folder:', folder)
    console.log('[storageService] Bucket:', STORAGE_BUCKET)

    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      // Sanitizar nome do arquivo - remover caracteres especiais
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const extension = sanitizedName.split('.').pop()?.toLowerCase() || 'jpg'
      // A estrutura nova de rota fica direto na raiz do bucket:
      // bellog-files/rota/{rota}/destino/{destino}/{canhotos|nfd|chegada}
      const normalizedFolder = folder.replace(/^\/+|\/+$/g, '')
      const folderPath = normalizedFolder.startsWith('rota/')
        ? normalizedFolder
        : `${STORAGE_ENV_FOLDER}/${normalizedFolder}`
      const fileName = `${folderPath}/${timestamp}-${randomId}.${extension}`

      console.log('[storageService] Final filename:', fileName)
      console.log('[storageService] Content-Type:', file.type || 'image/jpeg')

      // Upload para Supabase Storage diretamente (sem verificar bucket)
      // O bucket pode existir mas listBuckets pode não funcionar com anon key
      const uploadOptions = {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      }

      console.log('[storageService] Attempting upload to bucket:', STORAGE_BUCKET)

      // Verificar se há usuário autenticado
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[storageService] Current user:', user ? { id: user.id, email: user.email } : 'NO USER')

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, uploadOptions)

      console.log('[storageService] Upload response - data:', data)
      console.log('[storageService] Upload response - error:', error ? {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode,
        cause: error.cause
      } : null)

      if (error) {
        console.error('[storageService] Upload FAILED:', {
          message: error.message,
          statusCode: error.statusCode,
          name: error.name,
        })
        return null
      }

      if (!data) {
        console.error('[storageService] No data returned from upload')
        return null
      }

      console.log('[storageService] Upload SUCCESS - path:', data.path)
      console.log('[storageService] Upload FULL data:', data)

      // Obter URL pública usando o path retornado
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path)

      console.log('[storageService] Public URL result:', urlData)

      if (!urlData.publicUrl) {
        console.error('[storageService] No public URL returned')
        return null
      }

      console.log('[storageService] FINAL URL:', urlData.publicUrl)
      console.log('[storageService] ========== UPLOAD END ==========')

      return urlData.publicUrl
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('[storageService] EXCEPTION:', error)
      console.error('[storageService] Exception message:', error.message)
      console.error('[storageService] Exception stack:', error.stack)
      return null
    }
  },

  /**
   * Upload de múltiplos arquivos
   * @param files - Array de arquivos
   * @param folder - Pasta destino
   * @returns Array de URLs (ordem correspondente aos arquivos)
   */
  async uploadMultiple(files: File[], folder: string): Promise<(string | null)[]> {
    const results = await Promise.all(
      files.map(file => this.uploadFile(file, folder))
    )
    return results
  },

  /**
   * Deletar arquivo do Supabase Storage
   * @param fileUrl - URL completa do arquivo ou caminho do arquivo
   * @returns true se deletado com sucesso, false caso contrário
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false

    console.log('[storageService] Deleting file:', fileUrl)

    try {
      // Extrair o path do arquivo da URL
      // URLs do Supabase seguem o padrão: .../storage/v1/object/public/bucket/path
      let filePath = fileUrl

      // Se é uma URL completa, extrair o path
      if (fileUrl.includes('/storage/v1/object/public/')) {
        const parts = fileUrl.split('/storage/v1/object/public/')
        if (parts.length > 1) {
          filePath = parts[1]
        }
      }

      // Se ainda tem o nome do bucket no início, remover
      if (filePath.startsWith(`${STORAGE_BUCKET}/`)) {
        filePath = filePath.substring(STORAGE_BUCKET.length + 1)
      }

      console.log('[storageService] File path to delete:', filePath)

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath])

      if (error) {
        console.error('[storageService] Delete error:', error.message)
        return false
      }

      console.log('[storageService] File deleted successfully')
      return true
    } catch (err) {
      console.error('[storageService] Delete exception:', err)
      return false
    }
  },
}
