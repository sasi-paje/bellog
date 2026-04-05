import { supabase, getEnvironment, MasterPersonCompany, MasterPersonCompanyAddress, RefPersonCompanyRoleType } from '../lib/supabase'

// Company types
export interface CompanyWithAddress extends MasterPersonCompany {
  addresses?: MasterPersonCompanyAddress[]
}

// Company option for select dropdown
export interface CompanyOption {
  id: string
  label: string // display name
}

export interface CreateCompanyDTO {
  cnpj?: string
  legal_name?: string
  trade_name?: string
  email?: string
  phone?: string
}

export interface UpdateCompanyDTO extends Partial<CreateCompanyDTO> {
  is_active?: boolean
}

// Company address form data (for UI)
export interface CompanyAddressFormData {
  zipCode: string
  city: string
  district: string
  street: string
  number: string
  complement: string
}

export interface CompanyFormData {
  cnpj: string
  corporateName: string
  tradeName: string
  address: CompanyAddressFormData
}

// Address type codes
export const ADDRESS_TYPES = {
  DELIVERY: 'DELIVERY',
} as const

// Company Service - direct operations on master_person_company
export const companyService = {
  // List all companies (generic)
  async list(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: CompanyWithAddress[]; total: number }> {
    const { search, isActive, page = 1, limit = 20 } = params || {}
    const isTest = getEnvironment() !== 'production'

    let query = supabase
      .from('master_person_company')
      .select('*', { count: 'exact' })

    // Apply test filter
    query = query.eq('is_test', isTest)

    // Apply is_active filter
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    // Apply search
    if (search) {
      query = query.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%,cnpj.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('legal_name', { ascending: true })

    const { data, error, count } = await query

    if (error) throw new Error(error.message)

    // Get addresses for all companies
    const companyIds = data?.map(c => c.id) || []
    let addresses: MasterPersonCompanyAddress[] = []

    if (companyIds.length > 0) {
      const { data: addressData } = await supabase
        .from('master_person_company_address')
        .select('*')
        .in('id_company', companyIds)
        .eq('is_test', isTest)
        .eq('is_active', true)
      addresses = addressData || []
    }

    // Map addresses to companies
    const result = (data || []).map(company => ({
      ...company,
      addresses: addresses.filter(a => a.id_company === company.id)
    }))

    return { data: result, total: count || 0 }
  },

  // List destinations - filtered by DESTINATION role type
  async listDestinations(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: CompanyWithAddress[]; total: number }> {
    const { search, isActive = true, page = 1, limit = 20 } = params || {}
    const isTest = getEnvironment() !== 'production'
    console.log('[listDestinations] isTest:', isTest, 'environment:', getEnvironment())

    try {
      // Get DESTINATION role type ID
      const { data: roleType, error: roleTypeError } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code')
        .eq('code', 'DESTINATION')
        .maybeSingle()

      console.log('[listDestinations] roleType:', roleType, 'error:', roleTypeError)

      if (!roleType) {
        console.log('[listDestinations] NO roleType found for DESTINATION - falling back to all companies')
        // Fallback: return all active companies if no role found
        return this.list({ ...params, isActive: true })
      }

      // Get companies with DESTINATION role - simplified query
      const { data: roleRelations, error: relationsError } = await supabase
        .from('rel_person_company_role_type')
        .select('id_company')
        .eq('id_company_role_type', roleType.id)

      console.log('[listDestinations] roleRelations:', roleRelations, 'error:', relationsError)

      // If error or no relations, return empty
      if (relationsError || !roleRelations || roleRelations.length === 0) {
        console.log('[listDestinations] NO companies found with DESTINATION role')
        return { data: [], total: 0 }
      }

      const companyIds = roleRelations.map(r => r.id_company)
      console.log('[listDestinations] companyIds:', companyIds)

      // Build query for these companies
      let query = supabase
        .from('master_person_company')
        .select('*', { count: 'exact' })
        .in('id', companyIds)
        .eq('is_test', isTest)

    // Apply is_active filter
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    // Apply search
    if (search) {
      query = query.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('trade_name', { ascending: true })

    const { data, error, count } = await query
    console.log('[listDestinations] query result:', { data, error, count })
    if (error) throw new Error(error.message)

    // Get addresses
    const addresses = await this.getAddressesForCompanies(data?.map(c => c.id) || [], isTest)

    const result = (data || []).map(company => ({
      ...company,
      addresses: addresses.filter(a => a.id_company === company.id)
    }))

    return { data: result, total: count || 0 }
    } catch (err) {
      console.error('[listDestinations] Error:', err)
      return { data: [], total: 0 }
    }
  },

  // List suppliers - filtered by SUPPLIER role type
  async listSuppliers(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: CompanyWithAddress[]; total: number }> {
    const { search, isActive = true, page = 1, limit = 20 } = params || {}
    const isTest = getEnvironment() !== 'production'
    console.log('[listSuppliers] isTest:', isTest, 'environment:', getEnvironment())

    try {
      // Get SUPPLIER role type ID
      const { data: roleType, error: roleTypeError } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code')
        .eq('code', 'SUPPLIER')
        .maybeSingle()

      console.log('[listSuppliers] roleType:', roleType, 'error:', roleTypeError)

      if (!roleType) {
        console.log('[listSuppliers] NO roleType found for SUPPLIER - falling back to all companies')
        return this.list({ ...params, isActive: true })
      }

      // Get companies with SUPPLIER role - simplified query
      const { data: roleRelations, error: relationsError } = await supabase
        .from('rel_person_company_role_type')
        .select('id_company')
        .eq('id_company_role_type', roleType.id)

      console.log('[listSuppliers] roleRelations:', roleRelations, 'error:', relationsError)

      if (relationsError || !roleRelations || roleRelations.length === 0) {
        console.log('[listSuppliers] NO companies found with SUPPLIER role')
        return { data: [], total: 0 }
      }

      const companyIds = roleRelations.map(r => r.id_company)
      console.log('[listSuppliers] companyIds:', companyIds)

    // Build query for these companies
    let query = supabase
      .from('master_person_company')
      .select('*', { count: 'exact' })
      .in('id', companyIds)
      .eq('is_test', isTest)

    // Apply is_active filter
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    // Apply search
    if (search) {
      query = query.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('trade_name', { ascending: true })

    const { data, error, count } = await query
    console.log('[listDestinations] query result:', { data, error, count })
    if (error) throw new Error(error.message)

    // Get addresses
    const addresses = await this.getAddressesForCompanies(data?.map(c => c.id) || [], isTest)

    const result = (data || []).map(company => ({
      ...company,
      addresses: addresses.filter(a => a.id_company === company.id)
    }))

    return { data: result, total: count || 0 }
    } catch (err) {
      console.error('[listSuppliers] Error:', err)
      return { data: [], total: 0 }
    }
  },

  // Helper to get addresses for multiple companies
  async getAddressesForCompanies(companyIds: string[], isTest: boolean): Promise<MasterPersonCompanyAddress[]> {
    if (companyIds.length === 0) return []

    const { data } = await supabase
      .from('master_person_company_address')
      .select('*')
      .in('id_company', companyIds)
      .eq('is_test', isTest)
      .eq('is_active', true)

    return data || []
  },

  // Get company by ID
  async getById(id: string): Promise<CompanyWithAddress | null> {
    const isTest = getEnvironment() !== 'production'

    const { data: company, error } = await supabase
      .from('master_person_company')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .single()

    if (error) throw new Error(error.message)
    if (!company) return null

    // Get addresses
    const { data: addresses } = await supabase
      .from('master_person_company_address')
      .select('*')
      .eq('id_company', id)
      .eq('is_test', isTest)
      .eq('is_active', true)

    return { ...company, addresses: addresses || [] }
  },

  // Get company by CNPJ
  async getCompanyByCnpj(cnpj: string): Promise<CompanyWithAddress | null> {
    const isTest = getEnvironment() !== 'production'

    const { data: company, error } = await supabase
      .from('master_person_company')
      .select('*')
      .eq('cnpj', cnpj)
      .eq('is_test', isTest)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }

    // Get addresses
    const { data: addresses } = await supabase
      .from('master_person_company_address')
      .select('*')
      .eq('id_company', company.id)
      .eq('is_test', isTest)
      .eq('is_active', true)

    return { ...company, addresses: addresses || [] }
  },

  // Create company
  async createCompany(dto: CreateCompanyDTO): Promise<MasterPersonCompany> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_company')
      .insert({
        ...dto,
        is_test: isTest,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  // Update company
  async updateCompany(id: string, dto: UpdateCompanyDTO): Promise<MasterPersonCompany> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_company')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_test', isTest)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  // Save company (create or update)
  async saveCompany(id: string | null, dto: CreateCompanyDTO): Promise<MasterPersonCompany> {
    if (id) {
      return this.updateCompany(id, dto)
    } else {
      return this.createCompany(dto)
    }
  },

  // Delete (soft) company
  async deleteCompany(id: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('master_person_company')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_test', isTest)

    if (error) throw new Error(error.message)
  },

  // Get address type by code
  async getAddressTypeByCode(code: string): Promise<{ id: string; code: string } | null> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('ref_person_company_address_type')
      .select('*')
      .eq('code', code)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }
    return data
  },

  // Create company with address
  async createWithAddress(
    formData: CompanyFormData,
    addressTypeCode: string = 'DELIVERY',
    roleTypeCode?: string
  ): Promise<CompanyWithAddress> {
    console.log('[companyService] createWithAddress called:', { formData, addressTypeCode })
    const isTest = getEnvironment() !== 'production'

    // Get address type ID
    const addressType = await this.getAddressTypeByCode(addressTypeCode)
    console.log('[companyService] addressType:', addressType)
    if (!addressType) throw new Error(`Address type ${addressTypeCode} not found`)

    // Normalize CNPJ (remove mask)
    const normalizedCnpj = formData.cnpj.replace(/\D/g, '')

    // Create company
    console.log('[companyService] Inserting company:', {
      cnpj: normalizedCnpj,
      legal_name: formData.corporateName,
      trade_name: formData.tradeName,
      is_active: true,
      is_test: isTest,
    })
    const { data: company, error: companyError } = await supabase
      .from('master_person_company')
      .insert({
        cnpj: normalizedCnpj,
        legal_name: formData.corporateName,
        trade_name: formData.tradeName || null,
        is_active: true,
        is_test: isTest,
      })
      .select()
      .single()

    if (companyError) {
      console.error('[companyService] Company insert error:', companyError)
      console.error('[companyService] Error code:', companyError.code)
      console.error('[companyService] Error details:', companyError.details)
      console.error('[companyService] Error hint:', companyError.hint)
      throw new Error(companyError.message)
    }
    console.log('[companyService] Company created:', company)

    // Create address
    console.log('[companyService] Creating address...')
    const { data: address, error: addressError } = await supabase
      .from('master_person_company_address')
      .insert({
        id_company: company.id,
        id_company_address_type: addressType.id,
        street: formData.address.street,
        street_number: formData.address.number || null,
        complement: formData.address.complement || null,
        district: formData.address.district,
        city: formData.address.city,
        state: null,
        zip_code: formData.address.zipCode.replace(/\D/g, ''),
        is_active: true,
        is_test: isTest,
      })
      .select()
      .single()

    if (addressError) {
      console.error('[companyService] Address insert error:', addressError)
      console.error('[companyService] Error code:', addressError.code)
      console.error('[companyService] Error details:', addressError.details)
      throw new Error(addressError.message)
    }
    console.log('[companyService] Address created:', address)

    // Create role type relationship if provided
    if (roleTypeCode) {
      console.log('[companyService] Creating role type relationship:', roleTypeCode, 'isTest:', isTest)
      const { data: roleType, error: roleTypeError } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code, is_test, is_active')
        .eq('code', roleTypeCode)
        .eq('is_test', isTest)
        .eq('is_active', true)
        .single()

      console.log('[companyService] Role type lookup result:', roleType, 'error:', roleTypeError)

      if (roleType) {
        console.log('[companyService] Inserting into rel_person_company_role_type:', {
          id_company: company.id,
          id_company_role_type: roleType.id,
          is_active: true,
          is_test: isTest,
        })
        const { error: roleError } = await supabase
          .from('rel_person_company_role_type')
          .insert({
            id_company: company.id,
            id_company_role_type: roleType.id,
            is_active: true,
            is_test: isTest,
          })

        if (roleError) {
          console.error('[companyService] Role insert error:', roleError)
        } else {
          console.log('[companyService] Role created successfully')
        }
      } else {
        console.error('[companyService] Role type not found for code:', roleTypeCode)
      }
    }

    return {
      ...company,
      addresses: address ? [address] : [],
    }
  },

  // Update company with address
  async updateWithAddress(
    companyId: string,
    formData: CompanyFormData,
    addressTypeCode: string = 'DELIVERY'
  ): Promise<CompanyWithAddress> {
    console.log('[companyService] updateWithAddress called:', { companyId, formData, addressTypeCode })
    const isTest = getEnvironment() !== 'production'

    // Get address type ID
    const addressType = await this.getAddressTypeByCode(addressTypeCode)
    if (!addressType) throw new Error(`Address type ${addressTypeCode} not found`)

    // Normalize CNPJ
    const normalizedCnpj = formData.cnpj.replace(/\D/g, '')

    // Update company
    const { data: company, error: companyError } = await supabase
      .from('master_person_company')
      .update({
        cnpj: normalizedCnpj,
        legal_name: formData.corporateName,
        trade_name: formData.tradeName || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .eq('is_test', isTest)
      .select()
      .single()

    if (companyError) {
      console.error('[companyService] Company update error:', companyError)
      throw new Error(companyError.message)
    }
    console.log('[companyService] Company updated:', company)

    // Check for existing address
    const { data: existingAddress } = await supabase
      .from('master_person_company_address')
      .select('*')
      .eq('id_company', companyId)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .maybeSingle()

    let address: MasterPersonCompanyAddress | undefined

    if (existingAddress) {
      // Update existing address
      console.log('[companyService] Updating existing address:', existingAddress.id)
      const { data: updatedAddress, error: addressError } = await supabase
        .from('master_person_company_address')
        .update({
          id_company_address_type: addressType.id,
          street: formData.address.street,
          street_number: formData.address.number || null,
          complement: formData.address.complement || null,
          district: formData.address.district,
          city: formData.address.city,
          state: null,
          zip_code: formData.address.zipCode.replace(/\D/g, ''),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAddress.id)
        .select()
        .single()

      if (addressError) {
        console.error('[companyService] Address update error:', addressError)
        throw new Error(addressError.message)
      }
      address = updatedAddress || undefined
    } else {
      // Create new address
      console.log('[companyService] Creating new address...')
      const { data: newAddress, error: addressError } = await supabase
        .from('master_person_company_address')
        .insert({
          id_company: companyId,
          id_company_address_type: addressType.id,
          street: formData.address.street,
          street_number: formData.address.number || null,
          complement: formData.address.complement || null,
          district: formData.address.district,
          city: formData.address.city,
          state: null,
          zip_code: formData.address.zipCode.replace(/\D/g, ''),
          is_active: true,
          is_test: isTest,
        })
        .select()
        .single()

      if (addressError) {
        console.error('[companyService] Address insert error:', addressError)
        throw new Error(addressError.message)
      }
      address = newAddress || undefined
    }
    console.log('[companyService] Address processed:', address)

    return {
      ...company,
      addresses: address ? [address] : [],
    }
  },

  // Check CNPJ exists
  async cnpjExists(cnpj: string, excludeCompanyId?: string): Promise<boolean> {
    const isTest = getEnvironment() !== 'production'
    const normalizedCnpj = cnpj.replace(/\D/g, '')

    let query = supabase
      .from('master_person_company')
      .select('id')
      .eq('cnpj', normalizedCnpj)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (excludeCompanyId) {
      query = query.neq('id', excludeCompanyId)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data?.length || 0) > 0
  },

  // List companies by role type (for dropdowns)
  async listByRoleType(params?: {
    roleTypeCode: string // e.g., 'SUPPLIER', 'DESTINATION'
    isActive?: boolean
  }): Promise<CompanyOption[]> {
    const { roleTypeCode, isActive = true } = params || {}
    const isTest = getEnvironment() !== 'production'
    console.log('[listByRoleType] roleTypeCode:', roleTypeCode, 'isTest:', isTest)

    if (!roleTypeCode) {
      console.log('[listByRoleType] NO roleTypeCode provided')
      return []
    }

    try {
      // Get the role type ID - simplified query
      const { data: roleType, error: roleTypeError } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code')
        .eq('code', roleTypeCode)
        .maybeSingle()

      console.log('[listByRoleType] roleType:', roleType, 'error:', roleTypeError)

      if (roleTypeError || !roleType) {
        console.warn('[companyService] Role type not found:', roleTypeCode)
        return []
      }

      // Get companies with this role type - simplified query
      const { data: roleRelations, error: relationsError } = await supabase
        .from('rel_person_company_role_type')
        .select('id_company')
        .eq('id_company_role_type', roleType.id)

      console.log('[listByRoleType] roleRelations:', roleRelations, 'error:', relationsError)

      if (relationsError) {
        console.error('[companyService] Error fetching role relations:', relationsError)
        return []
      }

      const companyIds = roleRelations?.map(r => r.id_company) || []

      if (companyIds.length === 0) {
        console.log('[listByRoleType] No company IDs found')
        return []
      }

      console.log('[listByRoleType] companyIds:', companyIds)

      // Get the companies
      let query = supabase
        .from('master_person_company')
        .select('id, legal_name, trade_name')
        .in('id', companyIds)
        .eq('is_test', isTest)
        .eq('is_active', isActive)
        .order('trade_name', { ascending: true })

    const { data: companies, error } = await query
    if (error) {
      console.error('[companyService] Error fetching companies:', error)
      return []
    }

    // Map to options
    return (companies || []).map(company => ({
      id: company.id,
      label: company.trade_name || company.legal_name || '-',
    }))
    } catch (err) {
      console.error('[listByRoleType] Error:', err)
      return []
    }
  },

  // List delivery locations (DESTINATION role)
  async listDeliveryLocations(): Promise<CompanyOption[]> {
    return this.listByRoleType({ roleTypeCode: 'DESTINATION', isActive: true })
  },

  // List suppliers (SUPPLIER role)
  async listSuppliersByRole(): Promise<CompanyOption[]> {
    return this.listByRoleType({ roleTypeCode: 'SUPPLIER', isActive: true })
  },
}
