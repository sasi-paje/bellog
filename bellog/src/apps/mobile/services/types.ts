/**
 * Tipos para a autenticação mobile de motoristas
 */

export interface ExternalProviderCustomProps {
  email?: string
  phone?: string
  code?: string
  isTestTeam?: boolean
  [key: string]: unknown
}

export interface ExternalProviderResponse {
  id: number
  name: string
  role: string
  status: string
  TeamId?: number
  ClientId?: number
  customProps?: ExternalProviderCustomProps
  profileProps?: {
    name?: string
    email?: string
    phone?: string
  }
  App?: {
    id: number
    name: string
    versionNumber: number
    description: string
    status: string
  }
  Terms?: unknown
  deactivatedReason?: unknown
}

export interface AuthSession {
  driver: AuthenticatedDriver
  provider: ExternalProviderResponse
  authenticatedAt: string
  expiresAt?: string
}

export interface AuthenticatedDriver {
  id: string
  name: string | null
  email: string | null
  tax_id: string | null
  phone: string | null
  license_number: string | null
  is_active: boolean
  is_test: boolean
}

export interface AuthError {
  code: AuthErrorCode
  message: string
  details?: Record<string, unknown>
}

export type AuthErrorCode =
  | 'PROVIDER_API_ERROR'
  | 'PROVIDER_UNAUTHORIZED'
  | 'EMAIL_NOT_FOUND'
  | 'DRIVER_NOT_FOUND'
  | 'MULTIPLE_DRIVERS_FOUND'
  | 'DRIVER_INACTIVE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  session: AuthSession | null
  driver: AuthenticatedDriver | null
}

export interface MobileAuthProviderProps {
  children: React.ReactNode
}
