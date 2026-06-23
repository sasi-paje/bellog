// Feature Companies - API Service
import { supabase, getEnvironment, MasterPersonCompany, MasterPersonCompanyAddress, MasterPersonCompanyGroup } from '../../../lib/supabase'

// Company types
export interface CompanyGroup {
  id: number
  name: string
}

export interface CompanyWithAddress extends MasterPersonCompany {
  addresses?: MasterPersonCompanyAddress[]
  company_group?: CompanyGroup | null
}

export interface CompanyOption {
  value: string
  label: string
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

export interface CompanyAddressFormData {
  zipCode: string
  city: string
  state: string
  district: string
  street: string
  number: string
  complement: string
}

export interface CompanyFormData {
  cnpj: string
  corporateName: string
  tradeName: string
  email?: string
  address: CompanyAddressFormData
  id_company_group?: number | null
}

export const ADDRESS_TYPES = {
  DELIVERY: 'DELIVERY',
} as const

export const companyService = {
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
      .eq('is_test', isTest)

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    if (search) {
      query = query.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%,cnpj.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('legal_name', { ascending: true })

    const { data, error, count } = await query

    if (error) throw new Error(error.message)

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

    const result = (data || []).map(company => ({
      ...company,
      addresses: addresses.filter(a => a.id_company === company.id)
    }))

    return { data: result, total: count || 0 }
  },

  async listDestinations(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
    groupId?: number | null
    cnpj?: string
    zipCode?: string
    street?: string
    district?: string
  }): Promise<{ data: CompanyWithAddress[]; total: number }> {
    const { search, isActive, page = 1, limit = 20, groupId, cnpj, zipCode, street, district } = params || {}
    const isTest = getEnvironment() !== 'production'

    try {
      const { data: roleType } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code')
        .eq('code', 'DESTINATION')
        .maybeSingle()

      if (!roleType) {
        return this.list({ ...params, isActive: true })
      }

      const { data: roleRelations } = await supabase
        .from('rel_person_company_role_type')
        .select('id_company')
        .eq('id_company_role_type', roleType.id)
        .eq('is_test', isTest)

      if (!roleRelations || roleRelations.length === 0) {
        return { data: [], total: 0 }
      }

      let filteredIds = roleRelations.map(r => r.id_company)

      if (zipCode || street || district) {
        let addrQuery = supabase
          .from('master_person_company_address')
          .select('id_company')
          .in('id_company', filteredIds)
          .eq('is_test', isTest)
          .eq('is_active', true)

        if (zipCode) {
          const d = zipCode.replace(/\D/g, '')
          const formatted = d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
          addrQuery = addrQuery.or(`zip_code.ilike.%${d}%,zip_code.ilike.%${formatted}%`)
        }
        if (street) addrQuery = addrQuery.ilike('street', `%${street}%`)
        if (district) addrQuery = addrQuery.ilike('district', `%${district}%`)

        const { data: matchingAddr } = await addrQuery
        filteredIds = (matchingAddr || []).map((a: { id_company: string }) => a.id_company)

        if (filteredIds.length === 0) return { data: [], total: 0 }
      }

      let query = supabase
        .from('master_person_company')
        .select('*', { count: 'exact' })
        .in('id', filteredIds)
        .eq('is_test', isTest)

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive)
      }

      if (search) {
        query = query.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%`)
      }

      if (groupId != null) {
        query = query.eq('id_company_group', groupId)
      }

      if (cnpj) {
        const digits = cnpj.replace(/\D/g, '')
        const masked = digits.length === 14
          ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
          : digits
        query = query.or(`cnpj.ilike.%${digits}%,cnpj.ilike.%${masked}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to).order('trade_name', { ascending: true })

      const { data, error, count } = await query
      if (error) throw new Error(error.message)

      const addresses = await this.getAddressesForCompanies(data?.map(c => c.id) || [], isTest)
      const groups = await this.getGroupsForCompanies(data || [], isTest)

      const result = (data || []).map(company => ({
        ...company,
        addresses: addresses.filter(a => a.id_company === company.id),
        company_group: groups.get(company.id_company_group ?? 0) ?? null,
      }))

      return { data: result, total: count || 0 }
    } catch (err) {
      console.error('[listDestinations] Error:', err)
      return { data: [], total: 0 }
    }
  },

  async listSuppliers(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
    groupId?: number | null
    cnpj?: string
    zipCode?: string
    street?: string
    district?: string
  }): Promise<{ data: CompanyWithAddress[]; total: number }> {
    const { search, isActive, page = 1, limit = 20, groupId, cnpj, zipCode, street, district } = params || {}
    const isTest = getEnvironment() !== 'production'

    try {
      const { data: roleType } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code')
        .eq('code', 'SUPPLIER')
        .maybeSingle()

      if (!roleType) {
        return this.list({ ...params, isActive: true })
      }

      const { data: roleRelations } = await supabase
        .from('rel_person_company_role_type')
        .select('id_company')
        .eq('id_company_role_type', roleType.id)
        .eq('is_test', isTest)

      if (!roleRelations || roleRelations.length === 0) {
        return { data: [], total: 0 }
      }

      let filteredIds = roleRelations.map(r => r.id_company)

      if (zipCode || street || district) {
        let addrQuery = supabase
          .from('master_person_company_address')
          .select('id_company')
          .in('id_company', filteredIds)
          .eq('is_test', isTest)
          .eq('is_active', true)

        if (zipCode) {
          const d = zipCode.replace(/\D/g, '')
          const formatted = d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
          addrQuery = addrQuery.or(`zip_code.ilike.%${d}%,zip_code.ilike.%${formatted}%`)
        }
        if (street) addrQuery = addrQuery.ilike('street', `%${street}%`)
        if (district) addrQuery = addrQuery.ilike('district', `%${district}%`)

        const { data: matchingAddr } = await addrQuery
        filteredIds = (matchingAddr || []).map((a: { id_company: string }) => a.id_company)

        if (filteredIds.length === 0) return { data: [], total: 0 }
      }

      let query = supabase
        .from('master_person_company')
        .select('*', { count: 'exact' })
        .in('id', filteredIds)
        .eq('is_test', isTest)

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive)
      }

      if (search) {
        query = query.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%`)
      }

      if (groupId != null) {
        query = query.eq('id_company_group', groupId)
      }

      if (cnpj) {
        const digits = cnpj.replace(/\D/g, '')
        const masked = digits.length === 14
          ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
          : digits
        query = query.or(`cnpj.ilike.%${digits}%,cnpj.ilike.%${masked}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to).order('trade_name', { ascending: true })

      const { data, error, count } = await query
      if (error) throw new Error(error.message)

      const addresses = await this.getAddressesForCompanies(data?.map(c => c.id) || [], isTest)
      const groups = await this.getGroupsForCompanies(data || [], isTest)

      const result = (data || []).map(company => ({
        ...company,
        addresses: addresses.filter(a => a.id_company === company.id),
        company_group: groups.get(company.id_company_group ?? 0) ?? null,
      }))

      return { data: result, total: count || 0 }
    } catch (err) {
      console.error('[listSuppliers] Error:', err)
      return { data: [], total: 0 }
    }
  },

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

    const { data: addresses } = await supabase
      .from('master_person_company_address')
      .select('*')
      .eq('id_company', id)
      .eq('is_test', isTest)
      .eq('is_active', true)

    let company_group: CompanyGroup | null = null
    if (company.id_company_group) {
      const { data: group } = await supabase
        .from('master_person_company_group')
        .select('id, name')
        .eq('id', company.id_company_group)
        .maybeSingle()
      if (group) company_group = { id: group.id, name: group.name }
    }

    return { ...company, addresses: addresses || [], company_group }
  },

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

    const { data: addresses } = await supabase
      .from('master_person_company_address')
      .select('*')
      .eq('id_company', company.id)
      .eq('is_test', isTest)
      .eq('is_active', true)

    return { ...company, addresses: addresses || [] }
  },

  async canInactivateDestination(destinationId: string): Promise<{ canInactivate: boolean; reason?: string }> {
    const isTest = getEnvironment() !== 'production'

    // 1. Verify current state
    const { data: company, error: companyError } = await supabase
      .from('master_person_company')
      .select('id, is_active')
      .eq('id', destinationId)
      .single()

    if (companyError || !company) throw new Error('Destino não encontrado.')
    if (!company.is_active) return { canInactivate: false, reason: 'Este destino já está inativo.' }

    // 2. Find active fiscal invoices for this destination
    const { data: activeInvoices, error: invoiceError } = await supabase
      .from('trx_fiscal_invoice')
      .select('id')
      .eq('id_customer_company', destinationId)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .limit(1)

    if (invoiceError) {
      return { canInactivate: false, reason: 'Não foi possível validar as notas fiscais. Tente novamente.' }
    }

    if (!activeInvoices || activeInvoices.length === 0) return { canInactivate: true }

    // 3. Check for unreleased route assignments on those invoices
    const invoiceIds = activeInvoices.map(i => i.id)

    const { data: openAssignments, error: assignError } = await supabase
      .from('rel_route_invoice')
      .select('id, id_route')
      .in('id_fiscal_invoice', invoiceIds)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .is('released_at', null)
      .limit(1)

    if (assignError) {
      return { canInactivate: false, reason: 'Não foi possível validar as rotas vinculadas. Tente novamente.' }
    }

    if (openAssignments && openAssignments.length > 0) {
      // 4. Confirm route is still active (fail-safe: block if can't determine)
      const routeIds = [...new Set(openAssignments.map(a => a.id_route))]

      const { data: activeRoutes, error: routeError } = await supabase
        .from('trx_route')
        .select('id')
        .in('id', routeIds)
        .eq('is_active', true)
        .eq('is_test', isTest)
        .limit(1)

      if (routeError || activeRoutes === null) {
        return { canInactivate: false, reason: 'Não foi possível verificar as rotas. Tente novamente.' }
      }

      if (activeRoutes.length > 0) {
        return { canInactivate: false, reason: 'Este destino possui rota em andamento e não pode ser inativado.' }
      }
    }

    // 5. Active invoices without active route - still pending
    return { canInactivate: false, reason: 'Este destino possui notas fiscais em aberto e não pode ser inativado.' }
  },

  async canInactivateSupplier(supplierId: string): Promise<{ canInactivate: boolean; reason?: string }> {
    const isTest = getEnvironment() !== 'production'

    const { data: company, error: companyError } = await supabase
      .from('master_person_company')
      .select('id, is_active')
      .eq('id', supplierId)
      .single()

    if (companyError || !company) throw new Error('Fornecedor não encontrado.')
    if (!company.is_active) return { canInactivate: false, reason: 'Este fornecedor já está inativo.' }

    const { data: activeInvoices, error: invoiceError } = await supabase
      .from('trx_fiscal_invoice')
      .select('id')
      .eq('id_supplier_company', supplierId)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .limit(1)

    if (invoiceError) {
      return { canInactivate: false, reason: 'Não foi possível validar as notas fiscais. Tente novamente.' }
    }

    if (!activeInvoices || activeInvoices.length === 0) return { canInactivate: true }

    const invoiceIds = activeInvoices.map(i => i.id)

    const { data: openAssignments, error: assignError } = await supabase
      .from('rel_route_invoice')
      .select('id, id_route')
      .in('id_fiscal_invoice', invoiceIds)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .is('released_at', null)
      .limit(1)

    if (assignError) {
      return { canInactivate: false, reason: 'Não foi possível validar as rotas vinculadas. Tente novamente.' }
    }

    if (openAssignments && openAssignments.length > 0) {
      const routeIds = [...new Set(openAssignments.map(a => a.id_route))]

      const { data: activeRoutes, error: routeError } = await supabase
        .from('trx_route')
        .select('id')
        .in('id', routeIds)
        .eq('is_active', true)
        .eq('is_test', isTest)
        .limit(1)

      if (routeError || activeRoutes === null) {
        return { canInactivate: false, reason: 'Não foi possível verificar as rotas. Tente novamente.' }
      }

      if (activeRoutes.length > 0) {
        return { canInactivate: false, reason: 'Este fornecedor possui rota em andamento e não pode ser inativado.' }
      }
    }

    return { canInactivate: false, reason: 'Este fornecedor possui notas fiscais em aberto e não pode ser inativado.' }
  },

  async createCompany(dto: CreateCompanyDTO): Promise<MasterPersonCompany> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_company')
      .insert({ ...dto, is_test: isTest, is_active: true })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async updateCompany(id: string, dto: UpdateCompanyDTO): Promise<MasterPersonCompany> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_company')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_test', isTest)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async saveCompany(id: string | null, dto: CreateCompanyDTO): Promise<MasterPersonCompany> {
    if (id) {
      return this.updateCompany(id, dto)
    } else {
      return this.createCompany(dto)
    }
  },

  async deleteCompany(id: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('master_person_company')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_test', isTest)

    if (error) throw new Error(error.message)
  },

  async getAddressTypeByCode(code: string): Promise<{ id: string; code: string } | null> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('ref_person_company_address_type')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }
    return data
  },

  async createWithAddress(
    formData: CompanyFormData,
    addressTypeCode: string = 'DELIVERY',
    roleTypeCode?: string
  ): Promise<CompanyWithAddress> {
    const isTest = getEnvironment() !== 'production'
    const normalizedCnpj = formData.cnpj.replace(/\D/g, '')
    const entity = roleTypeCode === 'DESTINATION' ? 'destino'
      : roleTypeCode === 'SUPPLIER' ? 'fornecedor'
      : 'empresa'

    // 1. Validate address type
    const addressType = await this.getAddressTypeByCode(addressTypeCode)
    if (!addressType) throw new Error(`Address type ${addressTypeCode} not found`)

    // 2. Resolve role type FIRST — fail early before any insert
    let roleType: { id: string; code: string | null } | null = null
    if (roleTypeCode) {
      const { data, error: roleTypeError } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code')
        .eq('code', roleTypeCode)
        .maybeSingle()

      if (roleTypeError) throw new Error(`Erro ao buscar tipo de papel: ${roleTypeError.message}`)
      if (!data) throw new Error(`Tipo de cadastro "${roleTypeCode}" não encontrado. Verifique a tabela ref_person_company_role_type.`)
      roleType = data
    }

    // 3. Check for existing company with same CNPJ
    const { data: existingCompany } = await supabase
      .from('master_person_company')
      .select('id, is_active')
      .eq('cnpj', normalizedCnpj)
      .eq('is_test', isTest)
      .maybeSingle()

    let companyId: string

    if (existingCompany) {
      if (roleType) {
        // Check if this company already has the target role
        const { data: existingRoleLink } = await supabase
          .from('rel_person_company_role_type')
          .select('id')
          .eq('id_company', existingCompany.id)
          .eq('id_company_role_type', roleType.id)
          .maybeSingle()

        if (existingRoleLink) {
          // Already registered with this role — block
          if (!existingCompany.is_active) {
            throw new Error(`Já existe um ${entity} inativo com este CNPJ. Ative "Exibir inativos" para localizar o cadastro.`)
          }
          throw new Error(`Já existe um ${entity} cadastrado com este CNPJ.`)
        }
        // Company exists but does NOT have this role — reuse it
        companyId = existingCompany.id
      } else {
        if (!existingCompany.is_active) {
          throw new Error(`Já existe um cadastro inativo com este CNPJ. Ative "Exibir inativos" para localizar o cadastro.`)
        }
        throw new Error('Já existe um cadastro com este CNPJ.')
      }
    } else {
      // 4. Create new company
      const { data: newCompany, error: companyError } = await supabase
        .from('master_person_company')
        .insert({
          cnpj: normalizedCnpj,
          legal_name: formData.corporateName,
          trade_name: formData.tradeName || null,
          email: formData.email || null,
          id_company_group: formData.id_company_group ?? null,
          is_active: true,
          is_test: isTest,
        })
        .select()
        .single()

      if (companyError) {
        if (companyError.code === '23505' || companyError.message?.includes('tax_id')) {
          throw new Error(`Já existe um ${entity} cadastrado com este CNPJ.`)
        }
        throw new Error(companyError.message)
      }
      companyId = newCompany.id
    }

    // 5. Upsert address (create or update)
    const { data: existingAddress } = await supabase
      .from('master_person_company_address')
      .select('id')
      .eq('id_company', companyId)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .maybeSingle()

    if (existingAddress) {
      const { error: addrUpdateError } = await supabase
        .from('master_person_company_address')
        .update({
          id_company_address_type: addressType.id,
          street: formData.address.street,
          street_number: formData.address.number || null,
          complement: formData.address.complement || null,
          district: formData.address.district,
          city: formData.address.city,
          state: formData.address.state || null,
          zip_code: formData.address.zipCode.replace(/\D/g, ''),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAddress.id)
      if (addrUpdateError) throw new Error(addrUpdateError.message)
    } else {
      const { error: addrInsertError } = await supabase
        .from('master_person_company_address')
        .insert({
          id_company: companyId,
          id_company_address_type: addressType.id,
          street: formData.address.street,
          street_number: formData.address.number || null,
          complement: formData.address.complement || null,
          district: formData.address.district,
          city: formData.address.city,
          state: formData.address.state || null,
          zip_code: formData.address.zipCode.replace(/\D/g, ''),
          is_active: true,
          is_test: isTest,
        })
      if (addrInsertError) throw new Error(addrInsertError.message)
    }

    // 6. Upsert role link — safe against unique constraint and race conditions
    if (roleType) {
      const { error: roleError } = await supabase
        .from('rel_person_company_role_type')
        .upsert(
          {
            id_company: companyId,
            id_company_role_type: roleType.id,
            is_test: isTest,
          },
          { onConflict: 'id_company,id_company_role_type,is_test', ignoreDuplicates: true }
        )
      if (roleError) {
        console.error('[createWithAddress] role link error:', roleError)
        throw new Error('Erro ao vincular o tipo de cadastro. Tente novamente.')
      }
    }

    // 7. Return full company with addresses
    const result = await this.getById(companyId)
    if (!result) throw new Error('Erro ao buscar empresa criada.')
    return result
  },

  async updateWithAddress(
    companyId: string,
    formData: CompanyFormData,
    addressTypeCode: string = 'DELIVERY'
  ): Promise<CompanyWithAddress> {
    const isTest = getEnvironment() !== 'production'

    const addressType = await this.getAddressTypeByCode(addressTypeCode)
    if (!addressType) throw new Error(`Address type ${addressTypeCode} not found`)

    const normalizedCnpj = formData.cnpj.replace(/\D/g, '')

    const { data: company, error: companyError } = await supabase
      .from('master_person_company')
      .update({
        cnpj: normalizedCnpj,
        legal_name: formData.corporateName,
        trade_name: formData.tradeName || null,
        email: formData.email || null,
        id_company_group: formData.id_company_group ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .eq('is_test', isTest)
      .select()
      .single()

    if (companyError) throw new Error(companyError.message)

    const { data: existingAddress } = await supabase
      .from('master_person_company_address')
      .select('*')
      .eq('id_company', companyId)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .maybeSingle()

    let address: MasterPersonCompanyAddress | undefined

    if (existingAddress) {
      const { data: updatedAddress, error: addressError } = await supabase
        .from('master_person_company_address')
        .update({
          id_company_address_type: addressType.id,
          street: formData.address.street,
          street_number: formData.address.number || null,
          complement: formData.address.complement || null,
          district: formData.address.district,
          city: formData.address.city,
          state: formData.address.state || null,
          zip_code: formData.address.zipCode.replace(/\D/g, ''),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAddress.id)
        .select()
        .single()

      if (addressError) throw new Error(addressError.message)
      address = updatedAddress || undefined
    } else {
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
          state: formData.address.state || null,
          zip_code: formData.address.zipCode.replace(/\D/g, ''),
          is_active: true,
          is_test: isTest,
        })
        .select()
        .single()

      if (addressError) throw new Error(addressError.message)
      address = newAddress || undefined
    }

    return {
      ...company,
      addresses: address ? [address] : [],
    }
  },

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

  async listDeliveryLocations(): Promise<CompanyOption[]> {
    return this.listByRoleType({ roleTypeCode: 'DESTINATION', isActive: true })
  },

  async listSuppliersByRole(): Promise<CompanyOption[]> {
    return this.listByRoleType({ roleTypeCode: 'SUPPLIER', isActive: true })
  },

  async listByRoleType(params?: {
    roleTypeCode: string
    isActive?: boolean
  }): Promise<CompanyOption[]> {
    const { roleTypeCode, isActive = true } = params || {}
    const isTest = getEnvironment() !== 'production'

    if (!roleTypeCode) return []

    try {
      const { data: roleType } = await supabase
        .from('ref_person_company_role_type')
        .select('id, code')
        .eq('code', roleTypeCode)
        .maybeSingle()

      if (!roleType) return []

      const { data: roleRelations } = await supabase
        .from('rel_person_company_role_type')
        .select('id_company')
        .eq('id_company_role_type', roleType.id)
        .eq('is_test', isTest)

      const companyIds = roleRelations?.map(r => r.id_company) || []
      if (companyIds.length === 0) return []

      const { data: companies } = await supabase
        .from('master_person_company')
        .select('id, legal_name, trade_name')
        .in('id', companyIds)
        .eq('is_test', isTest)
        .eq('is_active', isActive)
        .order('trade_name', { ascending: true })

      return (companies || []).map(company => ({
        value: String(company.id),
        label: company.trade_name || company.legal_name || '-',
      }))
    } catch (err) {
      console.error('[companyService.listByRoleType] Error:', err)
      return []
    }
  },

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

  async getGroupsForCompanies(companies: MasterPersonCompany[], _isTest: boolean): Promise<Map<number, CompanyGroup>> {
    const groupIds = [...new Set(companies.map(c => c.id_company_group).filter((id): id is number => id != null))]
    const map = new Map<number, CompanyGroup>()
    if (groupIds.length === 0) return map

    const { data } = await supabase
      .from('master_person_company_group')
      .select('id, name')
      .in('id', groupIds)

    for (const g of data || []) map.set(g.id, { id: g.id, name: g.name })
    return map
  },

  async listGroups(context: 'supplier' | 'destination'): Promise<MasterPersonCompanyGroup[]> {
    const isTest = getEnvironment() !== 'production'
    const roleCode = context === 'supplier' ? 'SUPPLIER' : 'DESTINATION'

    // Resolve role type ID
    const { data: roleType } = await supabase
      .from('ref_person_company_role_type')
      .select('id')
      .eq('code', roleCode)
      .maybeSingle()

    if (!roleType) return []

    // Get company IDs with this role
    const { data: roleRelations } = await supabase
      .from('rel_person_company_role_type')
      .select('id_company')
      .eq('id_company_role_type', roleType.id)
      .eq('is_test', isTest)

    if (!roleRelations || roleRelations.length === 0) return []

    const companyIds = roleRelations.map(r => r.id_company)

    // Get distinct group IDs used by these companies (apenas ativas)
    const { data: companies } = await supabase
      .from('master_person_company')
      .select('id_company_group')
      .in('id', companyIds)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .not('id_company_group', 'is', null)

    const groupIds = [...new Set(
      (companies || []).map(c => c.id_company_group).filter((id): id is number => id != null)
    )]

    if (groupIds.length === 0) return []

    const { data, error } = await supabase
      .from('master_person_company_group')
      .select('*')
      .in('id', groupIds)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  },

  async findOrCreateGroup(name: string): Promise<number> {
    const isTest = getEnvironment() !== 'production'
    const trimmed = name.trim()

    const { data: existing } = await supabase
      .from('master_person_company_group')
      .select('id')
      .ilike('name', trimmed)
      .eq('is_test', isTest)
      .maybeSingle()

    if (existing) return existing.id

    const { data: created, error } = await supabase
      .from('master_person_company_group')
      .insert({ name: trimmed, is_active: true, is_test: isTest })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return created.id
  },
}
