/**
 * MobileAuthService - Serviço de autenticação para motoristas mobile via SASI
 *
 * Fluxo:
 * 1. Lê sasi-token da URL (JWT de acesso)
 * 2. GET /v2/profile/self com Bearer token → profile (id numérico + email)
 * 3. Busca motorista no banco pelo email do perfil SASI
 * 4. Monta sessão autenticada
 *
 * Regras:
 * - Nenhum componente UI acessa API ou Supabase diretamente
 * - Validação rigorosa do perfil SASI
 * - Tratamento de erros tipado
 */

import {
  getSasiTokenFromUrl,
  getSasiProfile,
  SasiProfileFetchError,
  SasiProfileError,
  externalProviderApi,
} from './external-provider.api'
import {
  driverRepository,
  DriverNotFoundError,
  MultipleDriversFoundError,
  DriverInactiveError,
  EmailNotFoundError,
} from './driver.repository'
import type {
  AuthSession,
  AuthenticatedDriver,
  AuthError,
  SasiProfile,
} from './types'

class MobileAuthService {
  private mapError(err: unknown): AuthError {
    if (err instanceof SasiProfileFetchError) {
      return {
        code: 'profile-failed',
        message: err.message,
        details: err.statusCode ? { statusCode: err.statusCode } : undefined,
      }
    }

    if (err instanceof SasiProfileError) {
      return {
        code: 'profile-id-missing',
        message: err.message,
      }
    }

    if (
      err instanceof DriverNotFoundError ||
      err instanceof MultipleDriversFoundError ||
      err instanceof DriverInactiveError ||
      err instanceof EmailNotFoundError
    ) {
      return {
        code: 'load-failed',
        message: (err as Error).message,
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
    const accessToken = getSasiTokenFromUrl()

    if (!accessToken) {
      throw {
        code: 'missing-token',
        message: 'Token de acesso não encontrado na URL (sasi-token)',
      } as AuthError
    }

    // Busca perfil SASI com o token da URL
    let profile: SasiProfile
    try {
      profile = await getSasiProfile(accessToken, signal)
    } catch (err) {
      throw this.mapError(err)
    }

    // email vem em customProps.email (campo principal do SASI)
    const email =
      profile.customProps?.email ||
      profile.email ||
      profile.profileProps?.email

    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw {
        code: 'profile-id-missing',
        message: 'Email não encontrado no perfil SASI',
        details: { profileId: profile.id },
      } as AuthError
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Busca motorista ativo pelo email
    let driverData: Awaited<ReturnType<typeof driverRepository.findByEmail>> | null = null

    try {
      const result = await driverRepository.findActiveByEmail(normalizedEmail)
      driverData = result.driver
    } catch (err) {
      throw this.mapError(err)
    }

    if (!driverData) {
      throw {
        code: 'load-failed',
        message: `Motorista não encontrado para o email: ${normalizedEmail}`,
        details: { email: normalizedEmail, sasiProfileId: profile.id },
      } as AuthError
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
      sasiProfileId: profile.id,
      authenticatedAt: new Date().toISOString(),
    }

    return session
  }

  async validateSession(): Promise<boolean> {
    try {
      return await externalProviderApi.validateToken()
    } catch {
      return false
    }
  }

  isUnauthorizedError(error: AuthError): boolean {
    return error.code === 'auth-failed' || error.code === 'missing-token'
  }
}

export const mobileAuthService = new MobileAuthService()
export default mobileAuthService
