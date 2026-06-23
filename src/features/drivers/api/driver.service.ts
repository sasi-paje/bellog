// Feature Drivers - API Service
import { supabase, getEnvironment, MasterPersonDriver } from '../../../lib/supabase'

// Driver types
export interface DriverWithAddress extends MasterPersonDriver {}

export interface DriverFormData {
  name: string
  cpfCnpj: string
  email: string
  phone: string
}

export interface CreateDriverDTO {
  name?: string
  tax_id?: string
  phone?: string
  email?: string
  license_number?: string
}

export interface UpdateDriverDTO extends Partial<CreateDriverDTO> {
  is_active?: boolean
}

// Driver Service
export const driverService = {
  // List all drivers
  async list(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
    taxId?: string
    email?: string
    phone?: string
  }): Promise<{ data: DriverWithAddress[]; total: number }> {
    const { search, isActive, page = 1, limit = 20, taxId, email, phone } = params || {}
    const isTest = getEnvironment() !== 'production'

    let query = supabase
      .from('master_person_driver')
      .select('*', { count: 'exact' })

    query = query.eq('is_test', isTest)

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (taxId) {
      const digits = taxId.replace(/\D/g, '')
      const masked11 = digits.length === 11
        ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
        : digits
      const masked14 = digits.length === 14
        ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
        : digits
      query = query.or(`tax_id.ilike.%${digits}%,tax_id.ilike.%${masked11}%,tax_id.ilike.%${masked14}%`)
    }

    if (email) {
      query = query.ilike('email', `%${email}%`)
    }

    if (phone) {
      const digits = phone.replace(/\D/g, '')
      query = query.ilike('phone', `%${digits}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('name', { ascending: true })

    const { data, error, count } = await query

    if (error) {
      console.error('[driverService.list] Error:', error)
      throw new Error(error.message)
    }

    return { data: data || [], total: count || 0 }
  },

  // Get driver by ID
  async getById(id: string): Promise<DriverWithAddress | null> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_driver')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return data
  },

  // Create driver
  async create(dto: CreateDriverDTO): Promise<MasterPersonDriver> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_driver')
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

  // Update driver
  async update(id: string, dto: UpdateDriverDTO): Promise<MasterPersonDriver> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_driver')
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

  // Toggle active status
  async toggleActive(id: string, isActive: boolean): Promise<MasterPersonDriver> {
    return this.update(id, { is_active: isActive })
  },

  // Check if CPF exists
  async cpfExists(cpf: string, excludeDriverId?: string): Promise<boolean> {
    const isTest = getEnvironment() !== 'production'
    const normalizedCpf = cpf.replace(/\D/g, '')

    let query = supabase
      .from('master_person_driver')
      .select('id')
      .eq('tax_id', normalizedCpf)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (excludeDriverId) {
      query = query.neq('id', excludeDriverId)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data?.length || 0) > 0
  },

  // Check if driver can be inactivated
  async canInactivateDriver(driverId: string): Promise<{ canInactivate: boolean; reason?: string }> {
    const isTest = getEnvironment() !== 'production'

    const { data: driver, error: driverError } = await supabase
      .from('master_person_driver')
      .select('id, is_active')
      .eq('id', driverId)
      .single()

    if (driverError || !driver) throw new Error('Motorista não encontrado.')
    if (!driver.is_active) return { canInactivate: false, reason: 'Este motorista já está inativo.' }

    // Check for active routes linked to this driver
    const { data: activeRoutes, error: routeError } = await supabase
      .from('trx_route')
      .select('id')
      .eq('id_driver', driverId)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .limit(1)

    if (routeError || activeRoutes === null) {
      return { canInactivate: false, reason: 'Não foi possível verificar as rotas. Tente novamente.' }
    }

    if (activeRoutes.length > 0) {
      return { canInactivate: false, reason: 'Este motorista possui rota em andamento e não pode ser inativado.' }
    }

    return { canInactivate: true }
  },

  // Create driver with form data
  async createWithForm(formData: DriverFormData): Promise<DriverWithAddress> {
    const digits = formData.cpfCnpj.replace(/\D/g, '')

    const dto: CreateDriverDTO = {
      name: formData.name,
      tax_id: digits || null,
      phone: formData.phone.replace(/\D/g, '') || null,
      email: formData.email || null,
    }

    return this.create(dto)
  },

  // Update driver with form data
  async updateWithForm(id: string, formData: DriverFormData): Promise<DriverWithAddress> {
    const digits = formData.cpfCnpj.replace(/\D/g, '')

    const dto: UpdateDriverDTO = {
      name: formData.name,
      tax_id: digits || null,
      phone: formData.phone.replace(/\D/g, '') || null,
      email: formData.email || null,
    }

    return this.update(id, dto)
  },
}