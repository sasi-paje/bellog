// Feature Vehicles - API Service
import { supabase, IS_TEST, MasterFleetVehicle } from '../../../lib/supabase'

export interface VehicleListItem {
  id: string
  plate: string
  code: string
  model: string
  nominal_capacity: number
  max_capacity: number
  responsible_name?: string
  responsible_type?: string
  is_active: boolean
}

export interface CreateVehicleDTO {
  plate: string
  code?: string
  model?: string
  nominal_capacity?: number
  responsible_name?: string
  responsible_type?: string
}

export interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {
  id?: string
  max_capacity?: number
}

const mapVehicle = (vehicle: MasterFleetVehicle): VehicleListItem => ({
  id: vehicle.id,
  plate: vehicle.plate || '',
  code: vehicle.code || '',
  model: vehicle.name || '',
  nominal_capacity: vehicle.nominal_capacity || 0,
  max_capacity: vehicle.nominal_capacity || 0,
  responsible_name: vehicle.responsible_name || undefined,
  responsible_type: vehicle.responsible_type || undefined,
  is_active: vehicle.is_active,
})

export const vehicleService = {
  async list(params?: {
    search?: string
    isActive?: boolean
    showInactive?: boolean
    page?: number
    limit?: number
    max_capacity?: number
    responsible_name?: string
    responsible_type?: string
  }): Promise<{ data: VehicleListItem[]; total: number }> {
    const { search, isActive, showInactive = false, page = 1, limit = 20, max_capacity, responsible_name, responsible_type } = params || {}
    const isTest = IS_TEST

    let query = supabase
      .from('master_fleet_vehicle')
      .select('*', { count: 'exact' })
      .eq('is_test', isTest)

    if (isActive !== undefined && !showInactive) {
      query = query.eq('is_active', isActive)
    }

    if (search) {
      query = query.ilike('plate', `%${search}%`)
    }

    if (max_capacity != null && !Number.isNaN(max_capacity)) {
      query = query.eq('nominal_capacity', max_capacity)
    }

    if (responsible_name) {
      query = query.ilike('responsible_name', `%${responsible_name}%`)
    }

    if (responsible_type) {
      query = query.ilike('responsible_type', `%${responsible_type}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data: vehicles, error, count } = await query

    if (error) throw new Error(error.message)

    return { data: (vehicles || []).map(mapVehicle), total: count || 0 }
  },

  async getById(id: string): Promise<VehicleListItem | null> {
    const isTest = IS_TEST

    const { data: vehicle, error } = await supabase
      .from('master_fleet_vehicle')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .single()

    if (error) throw new Error(error.message)
    if (!vehicle) return null

    return mapVehicle(vehicle)
  },

  async create(data: CreateVehicleDTO): Promise<VehicleListItem> {
    const isTest = IS_TEST

    if (data.plate) {
      const { data: existing } = await supabase
        .from('master_fleet_vehicle')
        .select('id')
        .eq('plate', data.plate.toUpperCase())
        .eq('is_test', isTest)
        .single()

      if (existing) throw new Error('Já existe um veículo com esta placa')
    }

    const { data: vehicle, error } = await supabase
      .from('master_fleet_vehicle')
      .insert({
        plate: data.plate ? data.plate.toUpperCase() : null,
        code: data.code || null,
        name: data.model || null,
        nominal_capacity: data.nominal_capacity ?? null,
        responsible_name: data.responsible_name || null,
        responsible_type: data.responsible_type || null,
        is_test: isTest,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!vehicle) throw new Error('Falha ao criar veículo')

    return mapVehicle(vehicle)
  },

  async update(id: string, data: UpdateVehicleDTO): Promise<VehicleListItem> {
    const isTest = IS_TEST

    if (data.plate) {
      const { data: existing } = await supabase
        .from('master_fleet_vehicle')
        .select('id')
        .eq('plate', data.plate.toUpperCase())
        .eq('is_test', isTest)
        .neq('id', id)
        .single()

      if (existing) throw new Error('Já existe um veículo com esta placa')
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (data.plate !== undefined) updateData.plate = data.plate.toUpperCase()
    if (data.code !== undefined) updateData.code = data.code
    if (data.model !== undefined) updateData.name = data.model
    const capacity = data.nominal_capacity ?? data.max_capacity
    if (capacity !== undefined) updateData.nominal_capacity = capacity
    if (data.responsible_name !== undefined) updateData.responsible_name = data.responsible_name || null
    if (data.responsible_type !== undefined) updateData.responsible_type = data.responsible_type || null

    const { data: vehicle, error } = await supabase
      .from('master_fleet_vehicle')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!vehicle) throw new Error('Veículo não encontrado')

    return mapVehicle(vehicle)
  },

  // Explicit activate/inactivate (does not auto-toggle)
  async setActive(id: string, isActive: boolean): Promise<void> {
    const isTest = IS_TEST
    const { error } = await supabase
      .from('master_fleet_vehicle')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_test', isTest)
    if (error) throw new Error(error.message)
  },

  // Legacy toggle (kept for backward compat with useVehicles hook)
  async toggleActive(id: string): Promise<VehicleListItem> {
    const isTest = IS_TEST

    const { data: current, error: fetchError } = await supabase
      .from('master_fleet_vehicle')
      .select('is_active')
      .eq('id', id)
      .eq('is_test', isTest)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    if (!current) throw new Error('Veículo não encontrado')

    // update() não mapeia is_active — alterna direto aqui (soft-delete)
    const { data: vehicle, error } = await supabase
      .from('master_fleet_vehicle')
      .update({ is_active: !current.is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_test', isTest)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!vehicle) throw new Error('Veículo não encontrado')

    return mapVehicle(vehicle)
  },

  async canInactivateVehicle(id: string): Promise<{ canInactivate: boolean; reason?: string }> {
    const isTest = IS_TEST

    const { data: vehicle, error: vehicleError } = await supabase
      .from('master_fleet_vehicle')
      .select('id, is_active')
      .eq('id', id)
      .single()

    if (vehicleError || !vehicle) throw new Error('Veículo não encontrado.')
    if (!vehicle.is_active) return { canInactivate: false, reason: 'Este veículo já está inativo.' }

    const { data: activeRoutes, error: routeError } = await supabase
      .from('trx_route')
      .select('id')
      .eq('id_vehicle', id)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .limit(1)

    if (routeError || activeRoutes === null) {
      return { canInactivate: false, reason: 'Não foi possível verificar as rotas. Tente novamente.' }
    }

    if (activeRoutes.length > 0) {
      return { canInactivate: false, reason: 'Este veículo possui rota em andamento e não pode ser inativado.' }
    }

    return { canInactivate: true }
  },
}
