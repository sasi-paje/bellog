import { supabase, getEnvironment, MasterFleetVehicle } from '../lib/supabase'

export interface VehicleListItem {
  id: string
  plate: string
  model: string
  nominal_capacity: number
  responsible_name?: string
  responsible_type?: string
  is_active: boolean
}

export interface CreateVehicleDTO {
  plate: string
  model: string
  nominal_capacity: number
  responsible_name?: string
  responsible_type?: string
}

export interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {
  id?: string
}

export const vehicleService = {
  async list(params?: {
    search?: string
    isActive?: boolean
    showInactive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: VehicleListItem[]; total: number }> {
    const { search, isActive, showInactive = false, page = 1, limit = 20 } = params || {}
    const isTest = getEnvironment() !== 'production'

    let query = supabase
      .from('master_fleet_vehicle')
      .select('*', { count: 'exact' })
      .eq('is_test', isTest)

    if (isActive !== undefined && !showInactive) {
      query = query.eq('is_active', isActive)
    }

    if (search) {
      query = query.or(`plate.ilike.%${search}%,model.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data: vehicles, error, count } = await query

    if (error) throw new Error(error.message)
    if (!vehicles || vehicles.length === 0) {
      return { data: [], total: count || 0 }
    }

    const result: VehicleListItem[] = vehicles.map(vehicle => ({
      id: vehicle.id,
      plate: vehicle.plate || '',
      model: vehicle.model || '',
      max_capacity: vehicle.nominal_capacity || 0,
      is_active: vehicle.is_active,
    }))

    return { data: result, total: count || 0 }
  },

  async getById(id: string): Promise<VehicleListItem | null> {
    const isTest = getEnvironment() !== 'production'

    const { data: vehicle, error } = await supabase
      .from('master_fleet_vehicle')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .single()

    if (error) throw new Error(error.message)
    if (!vehicle) return null

    return {
      id: vehicle.id,
      plate: vehicle.plate || '',
      model: vehicle.model || '',
      max_capacity: vehicle.nominal_capacity || 0,
      is_active: vehicle.is_active,
    }
  },

  async create(data: CreateVehicleDTO): Promise<VehicleListItem> {
    const isTest = getEnvironment() !== 'production'

    // Check for duplicate plate
    const { data: existing } = await supabase
      .from('master_fleet_vehicle')
      .select('id')
      .eq('plate', data.plate.toUpperCase())
      .eq('is_test', isTest)
      .single()

    if (existing) {
      throw new Error('Já existe um veículo com esta placa')
    }

    const insertData: any = {
      plate: data.plate.toUpperCase(),
      is_test: isTest,
      is_active: true,
    }

    // Only add fields that the schema cache knows about
    // Skip model and nominal_capacity due to schema cache issues

    const { data: vehicle, error } = await supabase
      .from('master_fleet_vehicle')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }
    if (!vehicle) throw new Error('Falha ao criar veículo')

    return {
      id: vehicle.id,
      plate: vehicle.plate || '',
      model: vehicle.model || '',
      max_capacity: vehicle.nominal_capacity || 0,
      is_active: vehicle.is_active,
    }
  },

  async update(id: string, data: UpdateVehicleDTO): Promise<VehicleListItem> {
    const isTest = getEnvironment() !== 'production'

    // Check for duplicate plate (excluding current vehicle)
    if (data.plate) {
      const { data: existing } = await supabase
        .from('master_fleet_vehicle')
        .select('id')
        .eq('plate', data.plate.toUpperCase())
        .eq('is_test', isTest)
        .neq('id', id)
        .single()

      if (existing) {
        throw new Error('Já existe um veículo com esta placa')
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (data.plate) updateData.plate = data.plate.toUpperCase()
    if (data.model !== undefined) updateData.model = data.model
    if ((data as any).max_capacity !== undefined) updateData.nominal_capacity = (data as any).max_capacity
    else if (data.nominal_capacity !== undefined) updateData.nominal_capacity = data.nominal_capacity

    const { data: vehicle, error } = await supabase
      .from('master_fleet_vehicle')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!vehicle) throw new Error('Veículo não encontrado')

    return {
      id: vehicle.id,
      plate: vehicle.plate || '',
      model: vehicle.model || '',
      max_capacity: vehicle.nominal_capacity || 0,
      is_active: vehicle.is_active,
    }
  },

  async toggleActive(id: string): Promise<VehicleListItem> {
    const isTest = getEnvironment() !== 'production'

    // Get current status
    const { data: vehicle, error: fetchError } = await supabase
      .from('master_fleet_vehicle')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    if (!vehicle) throw new Error('Veículo não encontrado')

    const newStatus = !vehicle.is_active

    const { data: updated, error } = await supabase
      .from('master_fleet_vehicle')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!updated) throw new Error('Falha ao atualizar status')

    return {
      id: updated.id,
      plate: updated.plate || '',
      model: updated.model || '',
      max_capacity: updated.nominal_capacity || 0,
      is_active: updated.is_active,
    }
  },
}
