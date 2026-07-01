/**
 * SASI External API Client
 *
 * Fluxo:
 * 1. Lê sasi-token da URL (JWT de acesso)
 * 2. GET ${VITE_EXTERNAL_API_URL}/api/v2/providers/external/me → perfil com id e email
 */

import type { SasiProfile } from './types'

const SASI_BASE_URL = import.meta.env.VITE_EXTERNAL_API_URL || 'https://api.sasi.io'
const DEFAULT_TIMEOUT_MS = 30000

// --- Erros ---

export class SasiProfileFetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'SasiProfileFetchError'
  }
}

export class SasiProfileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SasiProfileError'
  }
}

// --- Helpers de URL ---

export function getSasiTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null

  // Caso normal: token na query string (?sasi-token=...)
  const urlParams = new URLSearchParams(window.location.search)
  const tokenFromQuery = urlParams.get('sasi-token')
  if (tokenFromQuery) return tokenFromQuery

  // Fallback: SASI usa & em vez de ? — token embutido no path (/my-routes&sasi-token=...)
  const match = window.location.pathname.match(/&sasi-token=([^&]+)/)
  if (match) return decodeURIComponent(match[1])

  return null
}

export function hasSasiToken(): boolean {
  return getSasiTokenFromUrl() !== null
}

// --- Timeout helper ---

function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), ms)

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutController.signal.addEventListener('abort', () => {
      reject(new SasiProfileFetchError('Tempo limite excedido'))
    })
  })

  if (signal) {
    signal.addEventListener('abort', () => timeoutController.abort())
  }

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

// --- Chamada à API SASI ---

export async function getSasiProfile(accessToken: string, signal?: AbortSignal): Promise<SasiProfile> {
  let response: Response

  try {
    response = await withTimeout(
      fetch(`${SASI_BASE_URL}/api/v2/providers/external/me`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        signal,
      }),
      DEFAULT_TIMEOUT_MS,
      signal
    )
  } catch (err) {
    if (err instanceof SasiProfileFetchError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new SasiProfileFetchError('Requisição cancelada')
    }
    throw new SasiProfileFetchError('Erro de conexão ao buscar perfil SASI')
  }

  if (!response.ok) {
    throw new SasiProfileFetchError(
      `Falha ao buscar perfil SASI: ${response.status}`,
      response.status
    )
  }

  const data = (await response.json()) as SasiProfile

  if (data?.id == null) {
    throw new SasiProfileError('Perfil SASI inválido — id não encontrado')
  }

  return data
}

// Mantido para validação de sessão
export const externalProviderApi = {
  async validateToken(): Promise<boolean> {
    const token = getSasiTokenFromUrl()
    if (!token) return false
    try {
      await getSasiProfile(token)
      return true
    } catch {
      return false
    }
  },
}

export default externalProviderApi
