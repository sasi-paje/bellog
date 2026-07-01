// Feature Import - API Service
import { supabase, IS_TEST, StgIntegrationRouteCsv, StgIntegrationFiscalInvoiceXml, EtlIntegrationExecution, EtlIntegrationError } from '../../../lib/supabase'

export interface ImportExecution {
  id: string
  integration_type: 'route_csv' | 'invoice_xml'
  started_at: string
  finished_at: string | null
  records_processed: number
  records_success: number
  records_error: number
}

export interface ImportError {
  id: string
  id_execution: string
  error_message: string
  line_number: number | null
  data_json: string | null
}

export const importService = {
  async startExecution(integrationType: 'route_csv' | 'invoice_xml'): Promise<EtlIntegrationExecution> {
    const isTest = IS_TEST

    const { data, error } = await supabase
      .from('etl_integration_execution')
      .insert({
        integration_type: integrationType,
        started_at: new Date().toISOString(),
        records_processed: 0,
        records_success: 0,
        records_error: 0,
        is_test: isTest,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async finishExecution(
    executionId: string,
    recordsProcessed: number,
    recordsSuccess: number,
    recordsError: number
  ): Promise<void> {
    const { error } = await supabase
      .from('etl_integration_execution')
      .update({
        finished_at: new Date().toISOString(),
        records_processed: recordsProcessed,
        records_success: recordsSuccess,
        records_error: recordsError,
      })
      .eq('id', executionId)

    if (error) throw new Error(error.message)
  },

  async saveCsvStaging(csvContent: string): Promise<StgIntegrationRouteCsv> {
    const isTest = IS_TEST

    const { data, error } = await supabase
      .from('stg_integration_route_csv')
      .insert({
        csv_content: csvContent,
        is_valid: false,
        is_test: isTest,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async saveXmlStaging(xmlContent: string): Promise<StgIntegrationFiscalInvoiceXml> {
    const isTest = IS_TEST

    const { data, error } = await supabase
      .from('stg_integration_fiscal_invoice_xml')
      .insert({
        xml_content: xmlContent,
        is_valid: false,
        is_test: isTest,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async markCsvStagingProcessed(stagingId: string, isValid: boolean): Promise<void> {
    const { error } = await supabase
      .from('stg_integration_route_csv')
      .update({
        processed_at: new Date().toISOString(),
        is_valid: isValid,
      })
      .eq('id', stagingId)

    if (error) throw new Error(error.message)
  },

  async markXmlStagingProcessed(stagingId: string, isValid: boolean): Promise<void> {
    const { error } = await supabase
      .from('stg_integration_fiscal_invoice_xml')
      .update({
        processed_at: new Date().toISOString(),
        is_valid: isValid,
      })
      .eq('id', stagingId)

    if (error) throw new Error(error.message)
  },

  async logError(
    executionId: string,
    errorMessage: string,
    lineNumber?: number,
    dataJson?: string
  ): Promise<EtlIntegrationError> {
    const isTest = IS_TEST

    const { data, error } = await supabase
      .from('etl_integration_error')
      .insert({
        id_execution: executionId,
        error_message: errorMessage,
        line_number: lineNumber || null,
        data_json: dataJson || null,
        is_test: isTest,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async getExecutionHistory(
    integrationType?: 'route_csv' | 'invoice_xml',
    limit: number = 10
  ): Promise<ImportExecution[]> {
    const isTest = IS_TEST

    let query = supabase
      .from('etl_integration_execution')
      .select('*')
      .eq('is_test', isTest)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (integrationType) {
      query = query.eq('integration_type', integrationType)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  },

  async getExecutionErrors(executionId: string): Promise<ImportError[]> {
    const { data, error } = await supabase
      .from('etl_integration_error')
      .select('*')
      .eq('id_execution', executionId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  },

  async importRoutesFromCsv(executionId: string, csvContent: string): Promise<{ success: number; error: number }> {
    const lines = csvContent.split('\n').filter(line => line.trim())
    let success = 0
    let error = 0

    for (let i = 1; i < lines.length; i++) {
      try {
        success++
      } catch (err) {
        await this.logError(executionId, (err as Error).message, i, lines[i])
        error++
      }
    }

    return { success, error }
  },

  async importInvoicesFromXml(executionId: string, xmlContent: string): Promise<{ success: number; error: number }> {
    let success = 0
    let error = 0
    return { success, error }
  },
}