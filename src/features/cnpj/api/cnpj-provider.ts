/**
 * CNPJ Provider - Módulo responsável por consultar a API externa de CNPJ
 *
 * Este módulo encapsula toda a lógica de comunicação com APIs externas,
 * normalização de dados e tratamento de erros.
 *
 * Arquitetura: Backend-first - toda chamada à API externa acontece no backend
 */

import { supabase } from '../../../lib/supabase'

// ============================================================================
// Types
// ============================================================================

/**
 * Dados normalizados de empresa vindos da API externa
 */
export interface CNPJProviderData {
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  telefone?: string
  email?: string
  data_source: 'receitaws' | 'receitanet' | 'fallback'
}

/**
 * Resultado da operação de consulta
 */
export interface CNPJConsultResult {
  success: boolean
  data?: CNPJProviderData
  error?: string
  source: 'edge_function' | 'direct_api' | 'fallback'
}

// ============================================================================
// Configuração
// ============================================================================

const TIMEOUT_MS = 15000 // 15 segundos de timeout
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000 // 1 segundo entre tentativas

// ============================================================================
// Utilitários
// ============================================================================

/**
 * Normaliza CNPJ - remove caracteres não numéricos
 */
export function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

/**
 * Valida se CNPJ tem 14 dígitos
 */
export function isValidCNPJ(cnpj: string): boolean {
  const clean = normalizeCNPJ(cnpj)
  return clean.length === 14
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Espera MS milissegundos
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Função de retry com exponencial backoff
 */
async function withRetry<T>(
  fn: () => Promise<T | null>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T | null> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[CNPJ Provider] Attempt ${attempt}/${maxRetries}`)
    try {
      const result = await fn()
      if (result) return result
    } catch (error) {
      lastError = error as Error
      console.log(`[CNPJ Provider] Attempt ${attempt} failed:`, lastError.message)
    }

    if (attempt < maxRetries) {
      const waitTime = delayMs * attempt // Exponential backoff
      console.log(`[CNPJ Provider] Waiting ${waitTime}ms before retry...`)
      await delay(waitTime)
    }
  }

  console.log('[CNPJ Provider] All retries exhausted')
  return null
}

// ============================================================================
// Provider - Edge Function (Backend)
// ============================================================================

/**
 * Consulta CNPJ via Edge Function do Supabase (Backend-first)
 */
async function consultViaEdgeFunction(cnpj: string): Promise<CNPJProviderData | null> {
  console.log('[CNPJ Provider] Consulting Edge Function for:', cnpj)

  try {
    const { data, error } = await supabase.functions.invoke('consult-cnpj', {
      body: { cnpj },
    })

    if (error) {
      console.log('[CNPJ Provider] Edge Function error:', error.message)
      return null
    }

    if (data?.error) {
      console.log('[CNPJ Provider] Edge Function returned error:', data.error)
      return null
    }

    if (data?.razao_social) {
      console.log('[CNPJ Provider] Edge Function success:', data.razao_social)
      return {
        cnpj: data.cnpj || cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,
        cep: data.cep,
        telefone: data.telefone,
        email: data.email,
        data_source: data.data_source || 'receitaws',
      }
    }

    return null
  } catch (error) {
    console.log('[CNPJ Provider] Edge Function exception:', error)
    return null
  }
}

// ============================================================================
// Provider - Consulta API Externa (Fallback apenas em emergência)
// ============================================================================

/**
 * Consulta CNPJ na API Receitaws (FALLBACK - não usar diretamente)
 * Esta função só deve ser chamada se a Edge Function falhar completamente
 */
async function consultReceitaws(cnpj: string): Promise<CNPJProviderData | null> {
  console.log('[CNPJ Provider] [FALLBACK] Trying Receitaws for:', cnpj)

  try {
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      console.log('[CNPJ Provider] Receitaws not ok:', response.status)
      return null
    }

    const data = await response.json()

    if (data.status === 'ERROR' || !data.cnpj) {
      console.log('[CNPJ Provider] Receitaws error:', data.message)
      return null
    }

    console.log('[CNPJ Provider] Receitaws found:', data.nome)

    return {
      cnpj,
      razao_social: data.nome || '',
      nome_fantasia: data.fantasia || '',
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep?.replace(/\D/g, '') || '',
      telefone: data.telefone || '',
      email: data.email || '',
      data_source: 'receitaws',
    }
  } catch (error) {
    console.log('[CNPJ Provider] Receitaws failed:', error)
    return null
  }
}

/**
 * Consulta CNPJ na API Receitanet (oficial da Receita Federal)
 */
async function consultReceitanet(cnpj: string): Promise<CNPJProviderData | null> {
  console.log('[CNPJ Provider] Trying Receitanet for:', cnpj)

  try {
    const response = await fetch(
      `https://www.receitanet.gov.br/externo/cnpj/json/${cnpj}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    )

    if (!response.ok) {
      console.log('[CNPJ Provider] Receitanet not ok:', response.status)
      return null
    }

    const data = await response.json()

    if (!data?.cnpj_raiz) {
      console.log('[CNPJ Provider] Receitanet no data')
      return null
    }

    console.log('[CNPJ Provider] Receitanet found:', data.razao_social)

    return {
      cnpj,
      razao_social: data.razao_social || '',
      nome_fantasia: data.nome_fantasia || '',
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep?.replace(/\D/g, '') || '',
      telefone: (data.ddd1 || '') + (data.telefone1 || ''),
      email: data.email || '',
      data_source: 'receitanet',
    }
  } catch (error) {
    console.log('[CNPJ Provider] Receitanet failed:', error)
    return null
  }
}

/**
 * Função principal de consulta - Backend-first com retry
 * Fluxo: Edge Function (c/ retry) → Fallback apenas em último caso
 */
export async function fetchCNPJData(cnpj: string): Promise<CNPJConsultResult> {
  console.log('[CNPJ Provider] === Starting CNPJ consultation (Backend-first) ===')
  console.log('[CNPJ Provider] Input CNPJ:', cnpj)

  // Validar CNPJ
  const cleanCnpj = normalizeCNPJ(cnpj)
  if (!isValidCNPJ(cleanCnpj)) {
    return {
      success: false,
      error: 'CNPJ inválido',
      source: 'fallback'
    }
  }

  // ========================================================================
  // STEP 1: Tentar Edge Function com Retry (Backend-first)
  // ========================================================================
  console.log('[CNPJ Provider] Step 1: Trying Edge Function with retry...')
  const edgeResult = await withRetry(
    () => consultViaEdgeFunction(cleanCnpj),
    MAX_RETRIES,
    RETRY_DELAY_MS
  )

  if (edgeResult) {
    console.log('[CNPJ Provider] Edge Function succeeded:', edgeResult.razao_social)
    return {
      success: true,
      data: edgeResult,
      source: 'edge_function'
    }
  }

  // ========================================================================
  // STEP 2: Fallback - apenas se Edge Function falhar completamente
  // ========================================================================
  console.log('[CNPJ Provider] Step 2: Edge Function failed, trying fallback (direct API)...')

  // Tentar Receitaws com retry
  const receitawsResult = await withRetry(
    () => consultReceitaws(cleanCnpj),
    2, // Menos retries para fallback
    500
  )

  if (receitawsResult) {
    console.log('[CNPJ Provider] Fallback (Receitaws) succeeded:', receitawsResult.razao_social)
    return {
      success: true,
      data: receitawsResult,
      source: 'direct_api'
    }
  }

  // Tentar Receitanet como último recurso
  console.log('[CNPJ Provider] Receitaws failed, trying Receitanet...')
  const receitanetResult = await withRetry(
    () => consultReceitanet(cleanCnpj),
    2,
    500
  )

  if (receitanetResult) {
    console.log('[CNPJ Provider] Fallback (Receitanet) succeeded:', receitanetResult.razao_social)
    return {
      success: true,
      data: receitanetResult,
      source: 'direct_api'
    }
  }

  // ========================================================================
  // STEP 3: Ultimate Fallback - dados mínimos apenas se tudo falhar
  // ========================================================================
  console.log('[CNPJ Provider] Step 3: All APIs failed, returning ultimate fallback')
  return {
    success: true,
    data: {
      cnpj: cleanCnpj,
      razao_social: `CNPJ ${cleanCnpj}`,
      data_source: 'fallback'
    },
    error: 'Todas as APIs indisponíveis - dados limitados',
    source: 'fallback'
  }
}
