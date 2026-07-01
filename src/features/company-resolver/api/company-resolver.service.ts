// Feature Company Resolver - API Service
import { supabase, IS_TEST } from '../../../lib/supabase'
import { fetchCNPJData, CNPJProviderData } from '../../cnpj/api/cnpj-provider'

export interface ResolvedCompany {
  id: number
  cnpj: string
  legal_name: string
  trade_name: string | null
  is_enriched: boolean
  data_source: 'database' | 'receitaws' | 'receitanet' | 'fallback'
}

export interface ResolveCompanyResult {
  success: boolean
  company?: ResolvedCompany
  error?: string
}

function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

async function findExistingCompany(cnpj: string, isTest: boolean): Promise<number | null> {
  console.log('[Company Resolve] Searching for existing company with CNPJ:', cnpj, 'isTest:', isTest)

  const { data, error } = await supabase
    .from('master_person_company')
    .select('id')
    .eq('cnpj', cnpj)
    .eq('is_test', isTest)
    .maybeSingle()

  if (error) {
    console.error('[Company Resolve] Error searching company:', error)
    return null
  }

  if (data) {
    console.log('[Company Resolve] Found existing company ID:', data.id)
    return data.id
  }

  console.log('[Company Resolve] No existing company found')
  return null
}

async function getCompanyById(companyId: number): Promise<ResolvedCompany | null> {
  console.log('[Company Resolve] Getting company by ID:', companyId)

  const { data, error } = await supabase
    .from('master_person_company')
    .select('id, cnpj, legal_name, trade_name')
    .eq('id', companyId)
    .single()

  if (error || !data) {
    console.error('[Company Resolve] Error getting company:', error)
    return null
  }

  return {
    id: data.id,
    cnpj: data.cnpj,
    legal_name: data.legal_name,
    trade_name: data.trade_name,
    is_enriched: true,
    data_source: 'database',
  }
}

async function createCompany(params: {
  cnpj: string
  providerData: CNPJProviderData
  roleTypeCode?: string
  isTest: boolean
}): Promise<number | null> {
  const { cnpj, providerData, roleTypeCode, isTest } = params

  console.log('[Company Resolve] Creating company with data:', providerData.razao_social)

  const { data: company, error: companyError } = await supabase
    .from('master_person_company')
    .insert({
      cnpj: cnpj,
      legal_name: providerData.razao_social,
      trade_name: providerData.nome_fantasia || providerData.razao_social,
      phone: providerData.telefone || null,
      email: providerData.email || null,
      is_test: isTest,
      is_active: true,
    })
    .select('id')
    .single()

  if (companyError) {
    console.error('[Company Resolve] Error creating company:', companyError)
    return null
  }

  const companyId = company.id
  console.log('[Company Resolve] Company created with ID:', companyId)

  const hasAddressData = providerData.logradouro || providerData.cidade || providerData.uf
  if (hasAddressData) {
    console.log('[Company Resolve] Creating company address')

    const { data: addressType } = await supabase
      .from('ref_person_company_address_type')
      .select('id')
      .eq('code', 'COMMERCIAL')
      .eq('is_active', true)
      .maybeSingle()

    if (addressType) {
      const { error: addressError } = await supabase
        .from('master_person_company_address')
        .insert({
          id_company: companyId,
          id_company_address_type: addressType.id,
          street: providerData.logradouro || null,
          street_number: providerData.numero || null,
          complement: providerData.complemento || null,
          district: providerData.bairro || null,
          city: providerData.cidade || null,
          state: providerData.uf || null,
          zip_code: providerData.cep || null,
          is_primary: true,
          is_active: true,
          is_test: isTest,
        })

      if (addressError) {
        console.error('[Company Resolve] Error creating address:', addressError)
      }
    }
  }

  if (roleTypeCode) {
    console.log('[Company Resolve] Creating role relationship:', roleTypeCode)

    const { data: roleType } = await supabase
      .from('ref_person_company_role_type')
      .select('id')
      .eq('code', roleTypeCode)
      .eq('is_active', true)
      .single()

    if (roleType) {
      const { error: roleError } = await supabase
        .from('rel_person_company_role_type')
        .insert({
          id_company: companyId,
          id_company_role_type: roleType.id,
          is_test: isTest,
        })

      if (roleError) {
        console.error('[Company Resolve] Error creating role:', roleError)
      }
    }
  }

  return companyId
}

async function addRoleToCompany(companyId: number, roleTypeCode: string, isTest: boolean): Promise<void> {
  console.log('[Company Resolve] Adding role to existing company:', companyId, roleTypeCode)

  const { data: roleType } = await supabase
    .from('ref_person_company_role_type')
    .select('id')
    .eq('code', roleTypeCode)
    .eq('is_active', true)
    .single()

  if (!roleType) {
    console.error('[Company Resolve] Role type not found:', roleTypeCode)
    return
  }

  const { data: existing } = await supabase
    .from('rel_person_company_role_type')
    .select('id')
    .eq('id_company', companyId)
    .eq('id_company_role_type', Number(roleType.id))
    .eq('is_test', isTest)
    .maybeSingle()

  if (existing) {
    console.log('[Company Resolve] Role already exists')
    return
  }

  const { error } = await supabase
    .from('rel_person_company_role_type')
    .insert({
      id_company: companyId,
      id_company_role_type: Number(roleType.id),
      is_test: isTest,
    })

  if (error) {
    console.error('[Company Resolve] Error adding role:', error)
  }
}

export async function findOrCreateCompanyByCnpj(
  cnpj: string,
  roleTypeCode?: string
): Promise<ResolveCompanyResult> {
  console.log('[Company Resolve] === Starting findOrCreateCompanyByCnpj ===')
  console.log('[Company Resolve] CNPJ:', cnpj, 'Role:', roleTypeCode)

  const isTest = IS_TEST
  const cleanCnpj = normalizeCNPJ(cnpj)

  const existingId = await findExistingCompany(cleanCnpj, isTest)

  if (existingId) {
    console.log('[Company Resolve] Company exists in database, ID:', existingId)

    if (roleTypeCode) {
      await addRoleToCompany(existingId, roleTypeCode, isTest)
    }

    const company = await getCompanyById(existingId)
    if (company) {
      return {
        success: true,
        company,
      }
    }
  }

  console.log('[Company Resolve] Company not found, consulting external API...')
  const providerResult = await fetchCNPJData(cleanCnpj)

  if (!providerResult.success || !providerResult.data) {
    console.error('[Company Resolve] Provider consultation failed:', providerResult.error)
    return {
      success: false,
      error: providerResult.error || 'Erro ao consultar CNPJ',
    }
  }

  console.log('[Company Resolve] Provider data received:', providerResult.data.razao_social)

  const newCompanyId = await createCompany({
    cnpj: cleanCnpj,
    providerData: providerResult.data,
    roleTypeCode,
    isTest,
  })

  if (!newCompanyId) {
    return {
      success: false,
      error: 'Erro ao criar empresa',
    }
  }

  const company = await getCompanyById(newCompanyId)
  if (!company) {
    return {
      success: false,
      error: 'Erro ao obter dados da empresa criada',
    }
  }

  company.is_enriched = providerResult.data.data_source !== 'fallback'
  company.data_source = providerResult.source === 'edge_function'
    ? 'database'
    : (providerResult.data.data_source === 'fallback' ? 'fallback' : 'database')

  console.log('[Company Resolve] === Company resolved successfully ===')

  return {
    success: true,
    company,
  }
}

export async function resolveSupplierByCnpj(cnpj: string): Promise<ResolveCompanyResult> {
  return findOrCreateCompanyByCnpj(cnpj, 'SUPPLIER')
}

export async function resolveDestinationByCnpj(cnpj: string): Promise<ResolveCompanyResult> {
  return findOrCreateCompanyByCnpj(cnpj, 'DESTINATION')
}
