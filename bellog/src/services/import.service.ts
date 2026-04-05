import { supabase, getEnvironment, StgIntegrationRouteCsv, StgIntegrationFiscalInvoiceXml, EtlIntegrationExecution, EtlIntegrationError } from '../lib/supabase'

// Import types
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

// Import Service
export const importService = {
  // Start a new import execution
  async startExecution(integrationType: 'route_csv' | 'invoice_xml'): Promise<EtlIntegrationExecution> {
    const isTest = getEnvironment() !== 'production'

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

  // Finish execution
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

  // Save CSV staging
  async saveCsvStaging(csvContent: string): Promise<StgIntegrationRouteCsv> {
    const isTest = getEnvironment() !== 'production'

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

  // Save XML staging
  async saveXmlStaging(xmlContent: string): Promise<StgIntegrationFiscalInvoiceXml> {
    const isTest = getEnvironment() !== 'production'

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

  // Mark staging as processed
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

  // Log error
  async logError(
    executionId: string,
    errorMessage: string,
    lineNumber?: number,
    dataJson?: string
  ): Promise<EtlIntegrationError> {
    const isTest = getEnvironment() !== 'production'

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

  // Get execution history
  async getExecutionHistory(
    integrationType?: 'route_csv' | 'invoice_xml',
    limit: number = 10
  ): Promise<ImportExecution[]> {
    const isTest = getEnvironment() !== 'production'

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

  // Get errors for an execution
  async getExecutionErrors(executionId: string): Promise<ImportError[]> {
    const { data, error } = await supabase
      .from('etl_integration_error')
      .select('*')
      .eq('id_execution', executionId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  },

  // Import routes from CSV (logic to be implemented based on requirements)
  async importRoutesFromCsv(executionId: string, csvContent: string): Promise<{ success: number; error: number }> {
    // Parse CSV and process each row
    // This is a placeholder - actual implementation depends on CSV structure
    const lines = csvContent.split('\n').filter(line => line.trim())
    let success = 0
    let error = 0

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      try {
        // TODO: Parse and validate each line
        // Insert into trx_route if valid
        success++
      } catch (err) {
        await this.logError(executionId, (err as Error).message, i, lines[i])
        error++
      }
    }

    return { success, error }
  },

  // Import invoices from XML (logic to be implemented based on requirements)
  async importInvoicesFromXml(executionId: string, xmlContent: string): Promise<{ success: number; error: number }> {
    // Parse XML and process each invoice
    // This is a placeholder - actual implementation depends on XML structure
    let success = 0
    let error = 0

    // TODO: Implement XML parsing
    // Insert into trx_fiscal_invoice if valid

    return { success, error }
  },
}
