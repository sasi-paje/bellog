import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Environment context - determines if we're using test data
export type Environment = 'development' | 'test' | 'production'

// Get current environment from localStorage or default to development
export const getEnvironment = (): Environment => {
  if (typeof window === 'undefined') return 'development'
  const env = localStorage.getItem('bellog-environment')
  if (env === 'test' || env === 'production') return env
  return 'development'
}

// Set environment
export const setEnvironment = (env: Environment): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bellog-environment', env)
  }
}

// Helper to add is_test filter to queries
export const withTestFilter = (query: any, isTest: boolean = true) => {
  return query.eq('is_test', isTest)
}

// Database types
export interface Database {
  public: {
    Tables: {
      // Master tables
      master_person_company: {
        Row: {
          id: string
          cnpj: string | null
          legal_name: string | null
          trade_name: string | null
          state_registration: string | null
          municipal_registration: string | null
          email: string | null
          phone: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['master_person_company']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['master_person_company']['Insert']>
      }
      master_person_company_address: {
        Row: {
          id: string
          id_company: string
          id_company_address_type: string
          street: string | null
          street_number: string | null
          complement: string | null
          district: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          is_primary: boolean
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['master_person_company_address']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['master_person_company_address']['Insert']>
      }
      master_route_area: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['master_route_area']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['master_route_area']['Insert']>
      }
      master_fleet_vehicle: {
        Row: {
          id: string
          plate: string | null
          model: string | null
          brand: string | null
          max_capacity: number | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['master_fleet_vehicle']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['master_fleet_vehicle']['Insert']>
      }
      master_person_driver: {
        Row: {
          id: string
          name: string | null
          tax_id: string | null
          phone: string | null
          email: string | null
          license_number: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['master_person_driver']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['master_person_driver']['Insert']>
      }
      master_person_helper: {
        Row: {
          id: string
          cpf: string | null
          name: string | null
          phone: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['master_person_helper']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['master_person_helper']['Insert']>
      }
      master_person_responsible: {
        Row: {
          id: string
          cpf: string | null
          name: string | null
          phone: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['master_person_responsible']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['master_person_responsible']['Insert']>
      }
      // Reference tables
      ref_person_company_role_type: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_person_company_role_type']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_person_company_role_type']['Insert']>
      }
      ref_person_company_address_type: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_person_company_address_type']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_person_company_address_type']['Insert']>
      }
      ref_route_status: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_route_status']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_route_status']['Insert']>
      }
      ref_route_delivery_status: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_route_delivery_status']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_route_delivery_status']['Insert']>
      }
      ref_route_type: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_route_type']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_route_type']['Insert']>
      }
      ref_route_history_type: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_route_history_type']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_route_history_type']['Insert']>
      }
      ref_fiscal_invoice_status: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_fiscal_invoice_status']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_fiscal_invoice_status']['Insert']>
      }
      ref_fiscal_receipt_status: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_fiscal_receipt_status']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_fiscal_receipt_status']['Insert']>
      }
      ref_fiscal_nfd_status: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_fiscal_nfd_status']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_fiscal_nfd_status']['Insert']>
      }
      ref_fiscal_total_status: {
        Row: {
          id: string
          code: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ref_fiscal_total_status']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ref_fiscal_total_status']['Insert']>
      }
      // Transaction tables
      trx_route: {
        Row: {
          id: string
          route_code: string | null
          departure_date: string | null
          id_route_status: string | null
          id_route_delivery_status: string | null
          id_route_type: string | null
          id_vehicle: string | null
          id_driver: string | null
          starts_at: string | null
          ends_at: string | null
          vehicle_start_photo_path: string | null
          observation: string | null
          daily_count: number | null
          transported_weight: number | null
          nominal_capacity: number | null
          utilization_percent: number | null
          area: string | null
          responsible: string | null
          assistant: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['trx_route']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['trx_route']['Insert']>
      }
      trx_route_history: {
        Row: {
          id: string
          id_route: string
          id_history_type: string | null
          event_at: string | null
          description: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['trx_route_history']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['trx_route_history']['Insert']>
      }
      trx_fiscal_invoice: {
        Row: {
          id: string
          invoice_access_key: string | null
          invoice_number: string
          invoice_series: string | null
          invoice_issue_date: string | null
          id_supplier_company: string | null
          id_customer_company: string | null
          box_quantity: number | null
          gross_weight: number | null
          invoice_amount: number | null
          id_fiscal_invoice_status: string | null
          id_fiscal_receipt_status: string | null
          id_fiscal_nfd_status: string | null
          id_fiscal_total_status: string | null
          xml_file_path: string | null
          id_route: string | null
          id_status: string | null
          id_receipt_status: string | null
          id_nfd_status: string | null
          id_total_status: string | null
          value: number | null
          weight: number | null
          volume: number | null
          issue_date: string | null
          created_at: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['trx_fiscal_invoice']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['trx_fiscal_invoice']['Insert']>
      }
      // Relation tables
      rel_person_company_role_type: {
        Row: {
          id: string
          id_company: string
          id_company_role_type: string
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['rel_person_company_role_type']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rel_person_company_role_type']['Insert']>
      }
      rel_route_invoice: {
        Row: {
          id: string
          id_route: string
          id_fiscal_invoice: string
          assigned_at: string
          assigned_by: string | null
          unassigned_at: string | null
          unassigned_by: string | null
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['rel_route_invoice']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rel_route_invoice']['Insert']>
      }
      rel_route_driver: {
        Row: {
          id: string
          id_route: string
          id_driver: string
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rel_route_driver']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rel_route_driver']['Insert']>
      }
      rel_route_helper: {
        Row: {
          id: string
          id_route: string
          id_helper: string
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rel_route_helper']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rel_route_helper']['Insert']>
      }
      rel_route_responsible: {
        Row: {
          id: string
          id_route: string
          id_responsible: string
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rel_route_responsible']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rel_route_responsible']['Insert']>
      }
      rel_route_destination: {
        Row: {
          id: string
          id_route: string
          id_company: string
          is_active: boolean
          is_test: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rel_route_destination']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rel_route_destination']['Insert']>
      }
      // Staging / ETL tables
      stg_integration_route_csv: {
        Row: {
          id: string
          csv_content: string | null
          processed_at: string | null
          is_valid: boolean
          is_test: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stg_integration_route_csv']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stg_integration_route_csv']['Insert']>
      }
      stg_integration_fiscal_invoice_xml: {
        Row: {
          id: string
          xml_content: string | null
          processed_at: string | null
          is_valid: boolean
          is_test: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stg_integration_fiscal_invoice_xml']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stg_integration_fiscal_invoice_xml']['Insert']>
      }
      etl_integration_execution: {
        Row: {
          id: string
          integration_type: string | null
          started_at: string | null
          finished_at: string | null
          records_processed: number | null
          records_success: number | null
          records_error: number | null
          is_test: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['etl_integration_execution']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['etl_integration_execution']['Insert']>
      }
      etl_integration_error: {
        Row: {
          id: string
          id_execution: string
          error_message: string | null
          line_number: number | null
          data_json: string | null
          is_test: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['etl_integration_error']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['etl_integration_error']['Insert']>
      }
      // Staging tables for drag-drop route building
      stg_route_card: {
        Row: {
          id: string
          id_vehicle: string | null
          vehicle_plate: string | null
          capacidade: number | null
          is_test: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stg_route_card']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stg_route_card']['Insert']>
      }
      stg_route_card_notes: {
        Row: {
          id: string
          id_route_card: string | null
          id_invoice: string | null
          invoice_number: string | null
          peso: number | null
          order_index: number | null
          is_test: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stg_route_card_notes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stg_route_card_notes']['Insert']>
      }
    }
  }
}

// Type aliases for easier usage
export type MasterPersonCompany = Database['public']['Tables']['master_person_company']['Row']
export type MasterPersonCompanyAddress = Database['public']['Tables']['master_person_company_address']['Row']
export type MasterRouteArea = Database['public']['Tables']['master_route_area']['Row']
export type MasterFleetVehicle = Database['public']['Tables']['master_fleet_vehicle']['Row']
export type MasterPersonDriver = Database['public']['Tables']['master_person_driver']['Row']
export type MasterPersonHelper = Database['public']['Tables']['master_person_helper']['Row']
export type MasterPersonResponsible = Database['public']['Tables']['master_person_responsible']['Row']

export type RefPersonCompanyRoleType = Database['public']['Tables']['ref_person_company_role_type']['Row']
export type RefPersonCompanyAddressType = Database['public']['Tables']['ref_person_company_address_type']['Row']
export type RefRouteStatus = Database['public']['Tables']['ref_route_status']['Row']
export type RefRouteDeliveryStatus = Database['public']['Tables']['ref_route_delivery_status']['Row']
export type RefRouteType = Database['public']['Tables']['ref_route_type']['Row']
export type RefRouteHistoryType = Database['public']['Tables']['ref_route_history_type']['Row']
export type RefFiscalInvoiceStatus = Database['public']['Tables']['ref_fiscal_invoice_status']['Row']
export type RefFiscalReceiptStatus = Database['public']['Tables']['ref_fiscal_receipt_status']['Row']
export type RefFiscalNfdStatus = Database['public']['Tables']['ref_fiscal_nfd_status']['Row']
export type RefFiscalTotalStatus = Database['public']['Tables']['ref_fiscal_total_status']['Row']

export type TrxRoute = Database['public']['Tables']['trx_route']['Row']
export type TrxRouteHistory = Database['public']['Tables']['trx_route_history']['Row']
export type TrxFiscalInvoice = Database['public']['Tables']['trx_fiscal_invoice']['Row']

export type RelPersonCompanyRoleType = Database['public']['Tables']['rel_person_company_role_type']['Row']
export type RelRouteInvoice = Database['public']['Tables']['rel_route_invoice']['Row']
export type RelRouteDriver = Database['public']['Tables']['rel_route_driver']['Row']
export type RelRouteHelper = Database['public']['Tables']['rel_route_helper']['Row']
export type RelRouteResponsible = Database['public']['Tables']['rel_route_responsible']['Row']
export type RelRouteDestination = Database['public']['Tables']['rel_route_destination']['Row']

export type StgIntegrationRouteCsv = Database['public']['Tables']['stg_integration_route_csv']['Row']
export type StgIntegrationFiscalInvoiceXml = Database['public']['Tables']['stg_integration_fiscal_invoice_xml']['Row']
export type EtlIntegrationExecution = Database['public']['Tables']['etl_integration_execution']['Row']
export type EtlIntegrationError = Database['public']['Tables']['etl_integration_error']['Row']
export type StgRouteCard = Database['public']['Tables']['stg_route_card']['Row']
export type StgRouteCardNotes = Database['public']['Tables']['stg_route_card_notes']['Row']
