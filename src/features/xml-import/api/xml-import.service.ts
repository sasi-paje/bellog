// Feature XML Import - API Service
import { supabase, getEnvironment } from '../../../lib/supabase'
import { resolveDestinationByCnpj } from '../../company-resolver/api/company-resolver.service'
import { companyService } from '../../companies/api/company.service'

export interface XmlInvoiceData {
  invoice_number: string
  serie?: string
  invoice_access_key?: string
  supplier_doc?: string
  customer_doc?: string
  box_quantity?: number
  gross_weight?: number
  net_weight?: number
  invoice_amount?: number
  invoice_issue_date?: string
}

export interface ImportMetadata {
  supplierGroupId: string // id do grupo de fornecedor selecionado no modal
  tripNumber: string   // texto livre, ex: "023"
  arrivalDate: string  // 'YYYY-MM-DD'
}

export interface ImportResult {
  success: number
  failed: number
  importBatchId: number | null
}

const parseNFeXml = (xmlContent: string): XmlInvoiceData | null => {
  try {
    const parser = new DOMParser()
    const xml = parser.parseFromString(xmlContent, 'text/xml')

    const nNF = xml.getElementsByTagName('nNF')[0]?.textContent
    if (!nNF) return null

    const serie = xml.getElementsByTagName('serie')[0]?.textContent
    const chNFe = xml.getElementsByTagName('chNFe')[0]?.textContent

    const supplierCNPJ = xml.getElementsByTagName('emit')[0]?.getElementsByTagName('CNPJ')[0]?.textContent
    const supplierCPF = xml.getElementsByTagName('emit')[0]?.getElementsByTagName('CPF')[0]?.textContent
    const supplierDoc = supplierCNPJ || supplierCPF

    const destCNPJ = xml.getElementsByTagName('dest')[0]?.getElementsByTagName('CNPJ')[0]?.textContent
    const destCPF = xml.getElementsByTagName('dest')[0]?.getElementsByTagName('CPF')[0]?.textContent
    const destDoc = destCNPJ || destCPF

    const qComElements = xml.getElementsByTagName('qCom')
    const boxQuantity = qComElements.length > 0 ? parseInt(qComElements[0].textContent || '0', 10) : 0

    const pesoB = xml.getElementsByTagName('pesoB')[0]?.textContent
    const pesoL = xml.getElementsByTagName('pesoL')[0]?.textContent

    const vNF = xml.getElementsByTagName('vNF')[0]?.textContent

    const dhEmi = xml.getElementsByTagName('dhEmi')[0]?.textContent
    const dEmi = xml.getElementsByTagName('dEmi')[0]?.textContent

    return {
      invoice_number: nNF,
      serie,
      invoice_access_key: chNFe,
      supplier_doc: supplierDoc,
      customer_doc: destDoc,
      box_quantity: boxQuantity,
      gross_weight: pesoB ? parseFloat(pesoB) : undefined,
      net_weight: pesoL ? parseFloat(pesoL) : undefined,
      invoice_amount: vNF ? parseFloat(vNF) : 0,
      invoice_issue_date: dhEmi || dEmi || undefined,
    }
  } catch (error) {
    console.error('[XmlImport] Error parsing XML:', error)
    return null
  }
}

const findDestinationCompany = async (cnpj: string): Promise<number | null> => {
  if (!cnpj) return null
  try {
    const cleanCnpj = cnpj.replace(/\D/g, '')
    const result = await resolveDestinationByCnpj(cleanCnpj)
    if (result.success && result.company) {
      return result.company.id
    }
    console.error('[XmlImport] Failed to resolve destination company:', result.error)
    return null
  } catch (error) {
    console.error('[XmlImport] Error finding destination company:', error)
    return null
  }
}

const findSupplierCompanyFromGroup = async (groupId: string): Promise<number | null> => {
  const parsedGroupId = Number(groupId)
  if (!Number.isFinite(parsedGroupId)) return null

  // Não filtra por is_active: o id_supplier_company no lote de importação
  // é apenas referência — a company não precisa estar ativa para ser registrada.
  const result = await companyService.listSuppliers({
    groupId: parsedGroupId,
    limit: 1,
  })

  const supplier = result.data[0]
  return supplier?.id ? Number(supplier.id) : null
}

export const xmlImportService = {
  async importFromXml(files: File[], metadata: ImportMetadata): Promise<ImportResult> {
    const isTest = getEnvironment() !== 'production'
    const supplierCompanyId = await findSupplierCompanyFromGroup(metadata.supplierGroupId)

    if (!supplierCompanyId) {
      throw new Error('Nenhum fornecedor ativo encontrado para o grupo selecionado.')
    }

    // 1. Buscar status DISPONÍVEL
    const { data: statusData, error: statusError } = await supabase
      .from('ref_fiscal_invoice_status')
      .select('id')
      .eq('code', 'DISPONIVEL')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (statusError || !statusData) {
      console.error('[XmlImport] Status DISPONIVEL not found:', statusError)
      throw new Error('Status DISPONÍVEL não encontrado em ref_fiscal_invoice_status')
    }
    const fiscalStatusId = String(statusData.id)

    // 2. Criar lote de importação em trx_fiscal_invoice_import
    const originalFileName = files.length === 1 ? files[0].name : null
    const { data: importBatch, error: batchError } = await supabase
      .from('trx_fiscal_invoice_import')
      .insert({
        id_supplier_company: supplierCompanyId,
        trip_number: metadata.tripNumber.trim(),
        bellog_arrival_date: metadata.arrivalDate,
        original_file_name: originalFileName,
        file_path: null,
        is_active: true,
        is_test: isTest,
      })
      .select('id')
      .single()

    if (batchError || !importBatch) {
      console.error('[XmlImport] Error creating import batch:', batchError)
      throw new Error('Erro ao criar lote de importação')
    }
    const importBatchId: number = importBatch.id

    // 3. Processar cada arquivo
    let success = 0
    let failed = 0

    for (const file of files) {
      try {
        const content = await file.text()
        console.log('[XmlImport] Processing file:', file.name, '| length:', content.length)

        const invoiceData = parseNFeXml(content)
        if (!invoiceData) {
          console.error('[XmlImport] Failed to parse XML:', file.name)
          failed++
          continue
        }

        // Resolver destino pelo CNPJ do XML (fornecedor vem do modal)
        let idCustomerCompany: number | null = null
        if (invoiceData.customer_doc) {
          idCustomerCompany = await findDestinationCompany(invoiceData.customer_doc)
        }

        // Verificar duplicidade por invoice_access_key (quando presente)
        if (invoiceData.invoice_access_key) {
          const { data: existingByKey } = await supabase
            .from('trx_fiscal_invoice')
            .select('id')
            .eq('invoice_access_key', invoiceData.invoice_access_key)
            .eq('is_test', isTest)
            .limit(1)
            .maybeSingle()

          if (existingByKey) {
            console.log('[XmlImport] Duplicate by access_key, skipping:', invoiceData.invoice_access_key)
            failed++
            continue
          }
        }

        // Verificar duplicidade por invoice_number + invoice_series
        const { data: existingByNumber } = await supabase
          .from('trx_fiscal_invoice')
          .select('id')
          .eq('invoice_number', invoiceData.invoice_number)
          .eq('invoice_series', invoiceData.serie || '')
          .eq('is_test', isTest)
          .limit(1)
          .maybeSingle()

        if (existingByNumber) {
          console.log('[XmlImport] Duplicate by number+series, skipping:', invoiceData.invoice_number)
          failed++
          continue
        }

        // Inserir nota — fornecedor sempre vem do modal
        const { error: insertError } = await supabase
          .from('trx_fiscal_invoice')
          .insert({
            invoice_number: invoiceData.invoice_number,
            invoice_series: invoiceData.serie,
            invoice_access_key: invoiceData.invoice_access_key,
            id_supplier_company: String(supplierCompanyId),
            id_customer_company: idCustomerCompany ? String(idCustomerCompany) : null,
            box_quantity: invoiceData.box_quantity,
            gross_weight: invoiceData.gross_weight,
            net_weight: invoiceData.net_weight,
            invoice_amount: invoiceData.invoice_amount,
            invoice_issue_date: invoiceData.invoice_issue_date,
            id_fiscal_invoice_import: importBatchId,
            id_fiscal_invoice_status: fiscalStatusId,
            is_test: isTest,
            is_active: true,
          })

        if (insertError) {
          console.error('[XmlImport] Error inserting invoice:', insertError)
          failed++
        } else {
          console.log('[XmlImport] Invoice inserted:', invoiceData.invoice_number)
          success++
        }
      } catch (fileError) {
        console.error('[XmlImport] Error processing file:', file.name, fileError)
        failed++
      }
    }

    // 4. Se nenhuma nota foi importada, marcar lote como inativo
    if (success === 0) {
      await supabase
        .from('trx_fiscal_invoice_import')
        .update({ is_active: false })
        .eq('id', importBatchId)
    }

    return { success, failed, importBatchId }
  },
}
