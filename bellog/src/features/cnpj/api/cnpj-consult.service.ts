import { supabase } from '../../../lib/supabase'

interface CompanyData {
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
}

// Consultar CNPJ via Edge Function do Supabase (desabilitada por enquanto)
const fetchCnpjFromEdgeFunction = async (cnpj: string): Promise<CompanyData | null> => {
  // Edge function desabilitada - precisa ser deployada e configurada corretamente
  console.log('[CNPJ Edge] Edge Function disabled - skipping')
  return null
}

// API pública do Receitaws (funciona no navegador!)
const fetchCnpjFromReceitaws = async (cnpj: string): Promise<CompanyData | null> => {
  const RECEITAWS_URL = 'https://receitaws.com.br/v1/cnpj/'

  try {
    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (cleanCnpj.length !== 14) {
      console.log('[CNPJ Receitaws] Invalid CNPJ length:', cleanCnpj.length)
      return null
    }

    console.log('[CNPJ Receitaws] Fetching CNPJ:', cleanCnpj)

    const response = await fetch(`${RECEITAWS_URL}${cleanCnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    console.log('[CNPJ Receitaws] Response status:', response.status)

    if (!response.ok) {
      console.error('[CNPJ Receitaws] Response not ok:', response.status)
      return null
    }

    const data = await response.json()
    console.log('[CNPJ Receitaws] Raw response:', JSON.stringify(data).substring(0, 500))

    // Receitaws returns { status: "OK" } on success, or { status: "ERROR" } on failure
    if (data.status === 'ERROR' || !data.cnpj) {
      console.log('[CNPJ Receitaws] CNPJ not found or API error:', data.message)
      return null
    }

    console.log('[CNPJ Receitaws] Found company:', data.nome, data.fantasia, data.municipio)

    // Map receitaws response to CompanyData
    return {
      cnpj: cleanCnpj,
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
    }
  } catch (error) {
    console.log('[CNPJ Receitaws] API call failed:', error)
    return null
  }
}

// Direct API call (fallback - usually doesn't work due to CORS)
const fetchCnpjFromApi = async (cnpj: string): Promise<CompanyData | null> => {
  const RECEITANET_URL = 'https://www.receitanet.gov.br/externo/cnpj/json/'

  try {
    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (cleanCnpj.length !== 14) {
      console.log('[CNPJ API] Invalid CNPJ length:', cleanCnpj.length)
      return null
    }

    console.log('[CNPJ API] Attempting to fetch CNPJ from API:', cleanCnpj)

    const response = await fetch(`${RECEITANET_URL}${cleanCnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[CNPJ API] Response not ok:', response.status)
      return null
    }

    const data = await response.json()

    if (data && data.cnpj_raiz) {
      return {
        cnpj: cleanCnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep?.replace(/\D/g, '') || '',
        telefone: data.ddd1 + data.telefone1 || '',
        email: data.email || '',
      }
    }

    return null
  } catch (error) {
    console.log('[CNPJ API] API call failed:', error)
    return null
  }
}

// Export unified function - use Receitaws directly (skip edge function for now)
export const fetchCompanyData = async (cnpj: string): Promise<CompanyData | null> => {
  // Skip edge function for now - use Receitaws directly
  console.log('[CNPJ] Using Receitaws API directly')

  // Try Receitaws first (most reliable public API that works in browser)
  const receitawsResult = await fetchCnpjFromReceitaws(cnpj)
  if (receitawsResult) {
    console.log('[CNPJ] Got data from Receitaws:', receitawsResult.razao_social)
    return receitawsResult
  }

  // Last fallback to direct API (rarely works due to CORS)
  console.log('[CNPJ] Falling back to direct API')
  return fetchCnpjFromApi(cnpj)
}

export { CompanyData }
