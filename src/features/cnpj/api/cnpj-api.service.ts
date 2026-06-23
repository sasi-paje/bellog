// Feature CNPJ - API Service
import { supabase, getEnvironment } from '../../../lib/supabase'
import { fetchCompanyData, CompanyData } from './cnpj-consult.service'

export const findCompanyByCnpj = async (cnpj: string): Promise<number | null> => {
  try {
    const cleanCnpj = cnpj.replace(/\D/g, '')
    console.log('[CNPJ API] Searching for CNPJ:', cleanCnpj)

    const { data, error } = await supabase
      .from('master_person_company')
      .select('id')
      .eq('cnpj', cleanCnpj)
      .limit(1)
      .maybeSingle()

    console.log('[CNPJ API] Search result:', data, 'error:', error)
    if (error || !data) return null
    return data.id
  } catch (error) {
    console.log('[CNPJ API] Search error:', error)
    return null
  }
}

const fetchCnpjFromApi = async (cnpj: string): Promise<CompanyData | null> => {
  console.log('[CNPJ API] Fetching CNPJ data for:', cnpj)
  const companyData = await fetchCompanyData(cnpj)

  if (companyData) {
    console.log('[CNPJ API] Got company data:', companyData.razao_social)
  } else {
    console.log('[CNPJ API] No data from API')
  }

  return companyData
}

const createCompany = async (companyData: CompanyData, roleTypeCode?: string): Promise<number | null> => {
  const isTest = getEnvironment() !== 'production'
  console.log('[CNPJ API] Creating company, isTest:', isTest, 'CNPJ:', companyData.cnpj, 'roleType:', roleTypeCode)

  try {
    const { data, error } = await supabase
      .from('master_person_company')
      .insert({
        cnpj: companyData.cnpj.replace(/\D/g, ''),
        legal_name: companyData.razao_social,
        trade_name: companyData.nome_fantasia || companyData.razao_social,
        phone: companyData.telefone,
        email: companyData.email,
        is_test: isTest,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[CNPJ API] Error creating company:', error)
      return null
    }

    const companyId = data?.id
    console.log('[CNPJ API] Company created with ID:', companyId)

    if (companyId && (companyData.logradouro || companyData.cidade || companyData.uf)) {
      console.log('[CNPJ API] Creating company address')

      const { data: addressType } = await supabase
        .from('ref_person_company_address_type')
        .select('id')
        .eq('code', 'COMMERCIAL')
        .eq('is_active', true)
        .single()

      if (addressType) {
        const { error: addressError } = await supabase
          .from('master_person_company_address')
          .insert({
            id_company: companyId,
            id_company_address_type: addressType.id,
            street: companyData.logradouro,
            street_number: companyData.numero,
            complement: companyData.complemento,
            district: companyData.bairro,
            city: companyData.cidade,
            state: companyData.uf,
            zip_code: companyData.cep,
            is_primary: true,
            is_active: true,
            is_test: isTest,
          })

        if (addressError) {
          console.error('[CNPJ API] Error creating address:', addressError)
        } else {
          console.log('[CNPJ API] Address created successfully')
        }
      }
    }

    if (roleTypeCode && companyId) {
      console.log('[CNPJ API] Creating role type relationship:', roleTypeCode)
      const { data: roleType } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code, description')
        .eq('code', roleTypeCode)
        .eq('is_active', true)
        .single()

      console.log('[CNPJ API] Role type lookup result:', { roleType })

      if (roleType) {
        const roleTypeId = Number(roleType.id)
        console.log('[CNPJ API] Role type ID:', roleTypeId, 'type:', typeof roleTypeId)

        const { error: roleError } = await supabase
          .from('rel_person_company_role_type')
          .insert({
            id_company: Number(companyId),
            id_company_role_type: roleTypeId,
            is_test: isTest,
          })

        console.log('[CNPJ API] Role insert:', { roleError })

        if (roleError) {
          console.error('[CNPJ API] Error creating role relationship:', roleError.message, roleError.details)
        } else {
          console.log('[CNPJ API] Role relationship created successfully')
        }
      }
    }

    return companyId
  } catch (error) {
    console.error('[CNPJ API] Error creating company:', error)
    return null
  }
}

const addRoleToCompany = async (companyId: number, roleTypeCode: string): Promise<void> => {
  const isTest = getEnvironment() !== 'production'

  try {
    const { data: roleType } = await supabase
      .from('ref_person_company_role_type')
      .select('id')
      .eq('code', roleTypeCode)
      .eq('is_active', true)
      .single()

    console.log('[CNPJ API] addRoleToCompany - roleType lookup:', { roleType })

    if (!roleType) {
      console.error('[CNPJ API] Role type not found:', roleTypeCode)
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
      console.log('[CNPJ API] Role already exists for company')
      return
    }

    const { error: roleError } = await supabase
      .from('rel_person_company_role_type')
      .insert({
        id_company: companyId,
        id_company_role_type: Number(roleType.id),
        is_test: isTest,
      })

    console.log('[CNPJ API] addRoleToCompany - insert result:', { roleError })

    if (roleError) {
      console.error('[CNPJ API] Error adding role to company:', roleError.message, roleError.details)
    } else {
      console.log('[CNPJ API] Role added to existing company')
    }
  } catch (error) {
    console.error('[CNPJ API] Error adding role to company:', error)
  }
}

export const cnpjApiService = {
  async findOrCreateCompany(cnpj: string, roleTypeCode?: string): Promise<number | null> {
    console.log('[CNPJ API] findOrCreateCompany called with:', cnpj, 'roleType:', roleTypeCode)

    const existingId = await findCompanyByCnpj(cnpj)
    if (existingId) {
      console.log('[CNPJ API] Company found in database:', existingId)

      if (roleTypeCode) {
        console.log('[CNPJ API] Adding role to existing company:', roleTypeCode)
        await addRoleToCompany(existingId, roleTypeCode)
      }

      return existingId
    }

    console.log('[CNPJ API] Company not found in database, fetching from API...')
    const companyData = await fetchCnpjFromApi(cnpj)

    console.log('[CNPJ API] API result:', companyData)

    if (!companyData) {
      console.log('[CNPJ API] API failed, creating company with minimal data (CNPJ only)')
      const cleanCnpj = cnpj.replace(/\D/g, '')
      const minimalData: CompanyData = {
        cnpj: cleanCnpj,
        razao_social: `CNPJ ${cleanCnpj}`,
      }
      const newId = await createCompany(minimalData, roleTypeCode)
      if (!newId) {
        console.error('[CNPJ API] Failed to create company')
        return null
      }
      console.log('[CNPJ API] Company created with minimal data, ID:', newId)
      return newId
    }

    console.log('[CNPJ API] Creating company in database with data:', companyData.razao_social)
    const newId = await createCompany(companyData, roleTypeCode)

    if (!newId) {
      console.error('[CNPJ API] Failed to create company')
      return null
    }

    console.log('[CNPJ API] Company created with ID:', newId)
    return newId
  },
}
