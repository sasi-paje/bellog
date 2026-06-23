/**
 * External API Client - Cliente para API externa de providers
 *
 * Enterprise features:
 * - AbortController for request cancellation
 * - 30s timeout on all requests
 * - Retry with exponential backoff (3 attempts)
 * - No token leakage in logs
 */

import type { ExternalProviderResponse, AuthError, AuthErrorCode } from './types'

type ExternalProviderApiResponse =
  | ExternalProviderResponse
  | { data?: ExternalProviderResponse | null }

const API_BASE_URL = import.meta.env.VITE_EXTERNAL_API_URL || ''

export class ProviderApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'ProviderApiError'
  }
}

export function getSasiTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('sasi-token')
}

export function hasSasiToken(): boolean {
  return getSasiTokenFromUrl() !== null
}

class ExternalProviderApi {
  private readonly DEFAULT_TIMEOUT_MS = 30000
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAYS = [1000, 2000, 4000]

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private isExternalProviderResponse(value: unknown): value is ExternalProviderResponse {
    if (!this.isRecord(value)) return false

    const idType = typeof value.id
    return (
      (idType === 'number' || idType === 'string') &&
      typeof value.name === 'string' &&
      typeof value.role === 'string' &&
      typeof value.status === 'string'
    )
  }

  private extractProviderResponse(response: ExternalProviderApiResponse): ExternalProviderResponse | null {
    if (this.isRecord(response) && this.isExternalProviderResponse(response.data)) {
      return response.data
    }

    if (this.isExternalProviderResponse(response)) {
      return response
    }

    return null
  }

  private createAuthError(code: AuthErrorCode, message: string, statusCode?: number): AuthError {
    return {
      code,
      message,
      ...(statusCode ? { details: { statusCode } } : {}),
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<T> {
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutController.signal.addEventListener('abort', () => {
        reject(new ProviderApiError('Tempo limite excedido - a requisição demorou demais'))
      })
    })

    if (signal) {
      signal.addEventListener('abort', () => timeoutController.abort())
    }

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private isRetryableError(err: ProviderApiError): boolean {
    if (err.statusCode) {
      return err.statusCode >= 500 || err.isRetryable
    }
    return err.isRetryable
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: ProviderApiError | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        if (!(err instanceof ProviderApiError)) {
          throw err
        }

        lastError = err

        if (attempt < retries && this.isRetryableError(err)) {
          const delay = this.RETRY_DELAYS[attempt] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1]
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw err
      }
    }

    throw lastError || new ProviderApiError('Erro desconhecido após retries')
  }

  async getMe(signal?: AbortSignal): Promise<ExternalProviderResponse> {
    const response = await this.request<ExternalProviderApiResponse>(
      '/api/v2/providers/external/me',
      { method: 'GET', signal },
      this.DEFAULT_TIMEOUT_MS
    )

    const providerResponse = this.extractProviderResponse(response)

    if (!providerResponse) {
      throw new ProviderApiError('Resposta da API inválida - dados não encontrados')
    }

    return providerResponse
  }

  async validateToken(signal?: AbortSignal): Promise<boolean> {
    try {
      await this.getMe(signal)
      return true
    } catch (err) {
      if (err instanceof ProviderApiError && (err.statusCode === 401 || err.statusCode === 403)) {
        return false
      }
      return false
    }
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit & { signal?: AbortSignal },
    timeoutMs: number = this.DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const sasiToken = getSasiTokenFromUrl()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(sasiToken ? { 'Authorization': `Bearer ${sasiToken}` } : {}),
      ...options?.headers,
    }

    return this.executeWithRetry(async () => {
      let response: Response

      try {
        response = await this.withTimeout(
          fetch(url, { ...options, headers, signal: options?.signal }),
          timeoutMs,
          options?.signal
        )
      } catch (err) {
        if (err instanceof ProviderApiError) {
          throw err
        }
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new ProviderApiError('Requisição cancelada', undefined, undefined, false)
        }
        throw new ProviderApiError('Erro de conexão com a API externa', undefined, undefined, true)
      }

      if (!response.ok) {
        const isRetryable = response.status >= 500
        if (response.status === 401 || response.status === 403) {
          throw new ProviderApiError(
            'Não autorizado - Token inválido ou expirado',
            response.status
          )
        }

        const errorBody = await response.text()
        throw new ProviderApiError(
          `Erro da API externa: ${response.status} ${response.statusText}`,
          response.status,
          errorBody,
          isRetryable
        )
      }

      const data = await response.json()
      return data as T
    })
  }
}

export const externalProviderApi = new ExternalProviderApi()
export default externalProviderApi
