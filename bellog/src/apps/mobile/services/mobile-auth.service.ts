/**
 * MobileAuthService - Serviço centralizado de autenticação para motoristas mobile
 *
 * Fluxo:
 * 1. Consumir API /providers/external/me
 * 2. Extrair customProps.email
 * 3. Buscar motorista no banco usando email (case insensitive)
 * 4. Montar sessão autenticada
 *
 * Regras:
 * - Nenhum componente UI acessa API ou Supabase diretamente
 * - Validação rigorosa de email
 * - Tratamento de erros específicos
 * - 401/403 invalida sessão
 */

import { externalProviderApi, ProviderApiError } from './external-provider.api'
import {
  driverRepository,
  DriverNotFoundError,
  MultipleDriversFoundError,
  DriverInactiveError,
  EmailNotFoundError
} from './driver.repository'
import type {
  AuthSession,
  AuthenticatedDriver,
  AuthError,
  AuthErrorCode,
  ExternalProviderResponse,
} from './types'

class MobileAuthService {
  private mapError(err: unknown, providerData?: ExternalProviderResponse | null): AuthError {
    console.error('[MobileAuthService] Error:', err)

    if (err instanceof ProviderApiError) {
      if (err.statusCode === 401 || err.statusCode === 403) {
        return {
          code: 'PROVIDER_UNAUTHORIZED',
          message: 'Não autorizado - faça login novamente',
          details: { statusCode: err.statusCode },
        }
      }
      return {
        code: 'PROVIDER_API_ERROR',
        message: err.message,
        details: err.statusCode ? { statusCode: err.statusCode } : undefined,
      }
    }

    if (err instanceof DriverNotFoundError) {
      return {
        code: 'DRIVER_NOT_FOUND',
        message: err.message,
        details: { email: err.email },
      }
    }

    if (err instanceof MultipleDriversFoundError) {
      return {
        code: 'MULTIPLE_DRIVERS_FOUND',
        message: err.message,
        details: { count: err.count, email: err.email },
      }
    }

    if (err instanceof DriverInactiveError) {
      return {
        code: 'DRIVER_INACTIVE',
        message: 'Sua conta está inativa. Entre em contato com o administrador.',
      }
    }

    if (err instanceof EmailNotFoundError) {
      return {
        code: 'EMAIL_NOT_FOUND',
        message: 'Email do provider não encontrado nos dados retornados',
        details: { customProps: providerData?.customProps },
      }
    }

    if (err instanceof Error) {
      return {
        code: 'UNKNOWN',
        message: err.message,
        details: { originalError: err.message },
      }
    }

    return {
      code: 'UNKNOWN',
      message: 'Erro inesperado durante autenticação',
      details: { originalError: String(err) },
    }
  }

  async authenticate(signal?: AbortSignal): Promise<AuthSession> {
    let providerData: ExternalProviderResponse | null = null

    try {
      providerData = await externalProviderApi.getMe(signal)
    } catch (err) {
      throw this.mapError(err)
    }

    const email = providerData.customProps?.email

    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw this.mapError(new EmailNotFoundError(), providerData)
    }

    const normalizedEmail = email.trim().toLowerCase()

    let driverData: Awaited<ReturnType<typeof driverRepository.findByEmail>> | null = null

    try {
      const result = await driverRepository.findActiveByEmail(normalizedEmail)
      driverData = result.driver
    } catch (err) {
      throw this.mapError(err, providerData)
    }

    if (!driverData) {
      throw {
        code: 'DRIVER_NOT_FOUND' as AuthErrorCode,
        message: 'Motorista não encontrado para o email: ' + normalizedEmail,
        details: { email: normalizedEmail },
      }
    }

    const authenticatedDriver: AuthenticatedDriver = {
      id: driverData.id,
      name: driverData.name,
      email: driverData.email,
      tax_id: driverData.tax_id,
      phone: driverData.phone,
      license_number: driverData.license_number,
      is_active: driverData.is_active,
      is_test: driverData.is_test,
    }

    const session: AuthSession = {
      driver: authenticatedDriver,
      provider: providerData,
      authenticatedAt: new Date().toISOString(),
    }

    console.log('[MobileAuthService] Authentication successful for driver:', authenticatedDriver.id)

    return session
  }

  async validateSession(): Promise<boolean> {
    try {
      const isValid = await externalProviderApi.validateToken()
      return isValid
    } catch (err) {
      console.error('[MobileAuthService] Session validation failed:', err)
      return false
    }
  }

  isUnauthorizedError(error: AuthError): boolean {
    return error.code === 'PROVIDER_UNAUTHORIZED' ||
           error.code === 'PROVIDER_API_ERROR' ||
           error.code === 'NETWORK_ERROR'
  }
}

export const mobileAuthService = new MobileAuthService()
export default mobileAuthService
