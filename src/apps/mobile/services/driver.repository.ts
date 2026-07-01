/**
 * DriverRepository - Repositório para operações com motoristas no banco
 * Ninguém deve acessar Supabase diretamente além deste repositório
 */

import { supabase, IS_TEST, type MasterPersonDriver } from '../../../lib/supabase'

export class DriverNotFoundError extends Error {
  constructor(public readonly email: string) {
    super(`Nenhum motorista encontrado com o email: ${email}`)
    this.name = 'DriverNotFoundError'
  }
}

export class MultipleDriversFoundError extends Error {
  constructor(public readonly count: number, public readonly email: string) {
    super(`Encontrados ${count} motoristas com o email: ${email}`)
    this.name = 'MultipleDriversFoundError'
  }
}

export class DriverInactiveError extends Error {
  constructor() {
    super('Motorista encontrado mas está inativo')
    this.name = 'DriverInactiveError'
  }
}

export class EmailNotFoundError extends Error {
  constructor() {
    super('Email é obrigatório para busca')
    this.name = 'EmailNotFoundError'
  }
}

class DriverRepository {
  async findByEmail(email: string): Promise<MasterPersonDriver> {
    const isTest = IS_TEST

    if (!email || typeof email !== 'string') {
      throw new EmailNotFoundError()
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase
      .from('master_person_driver')
      .select('*')
      .ilike('email', normalizedEmail)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('[DriverRepository.findByEmail] Database error:', error)
      throw new Error('Erro ao buscar motorista no banco de dados')
    }

    if (!data) {
      throw new DriverNotFoundError(normalizedEmail)
    }

    const driver = data as MasterPersonDriver

    if (!driver.is_active) {
      throw new DriverInactiveError()
    }

    return driver
  }

  async findById(id: string): Promise<MasterPersonDriver | null> {
    const isTest = IS_TEST

    if (!id) {
      return null
    }

    const { data, error } = await supabase
      .from('master_person_driver')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .maybeSingle()

    if (error) {
      console.error('[DriverRepository.findById] Database error:', error)
      return null
    }

    return data as MasterPersonDriver | null
  }

  async findActiveByEmail(email: string): Promise<{ driver: MasterPersonDriver; isUnique: boolean }> {
    const isTest = IS_TEST

    if (!email || typeof email !== 'string') {
      throw new EmailNotFoundError()
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase
      .from('master_person_driver')
      .select('*')
      .ilike('email', normalizedEmail)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (error) {
      console.error('[DriverRepository.findActiveByEmail] Database error:', error)
      throw new Error('Erro ao buscar motorista no banco de dados')
    }

    if (!data || data.length === 0) {
      throw new DriverNotFoundError(normalizedEmail)
    }

    if (data.length > 1) {
      throw new MultipleDriversFoundError(data.length, normalizedEmail)
    }

    return {
      driver: data[0] as MasterPersonDriver,
      isUnique: true,
    }
  }
}

export const driverRepository = new DriverRepository()
export default driverRepository
