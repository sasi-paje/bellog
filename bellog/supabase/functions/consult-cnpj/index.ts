// supabase/functions/consult-cnpj/index.ts
// Edge Function para consultar CNPJ na API externa
// Arquitetura: Backend-first - toda lógica de consulta à API externa fica aqui

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CNPJResponse {
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
  data_source?: 'receitaws' | 'receitanet' | 'fallback'
}

// Timeout para a requisição (10 segundos)
const TIMEOUT_MS = 10000

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// Consultar na API Receitaws (funciona bem)
async function consultReceitaws(cnpj: string): Promise<CNPJResponse | null> {
  console.log('[Edge] Trying Receitaws API for:', cnpj)

  try {
    const response = await fetchWithTimeout(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.log('[Edge] Receitaws response not ok:', response.status)
      return null
    }

    const data = await response.json()

    if (data.status === 'ERROR' || !data.cnpj) {
      console.log('[Edge] Receitaws error:', data.message)
      return null
    }

    console.log('[Edge] Receitaws found:', data.nome)

    return {
      cnpj: cnpj,
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
    console.log('[Edge] Receitaws error:', error.message)
    return null
  }
}

// Consultar na API Receitanet (oficial, mas pode não funcionar)
async function consultReceitanet(cnpj: string): Promise<CNPJResponse | null> {
  console.log('[Edge] Trying Receitanet API for:', cnpj)

  try {
    const response = await fetchWithTimeout(
      `https://www.receitanet.gov.br/externo/cnpj/json/${cnpj}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.log('[Edge] Receitanet response not ok:', response.status)
      return null
    }

    const data = await response.json()

    if (!data || !data.cnpj_raiz) {
      console.log('[Edge] Receitanet no data')
      return null
    }

    console.log('[Edge] Receitanet found:', data.razao_social)

    return {
      cnpj: cnpj,
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
    console.log('[Edge] Receitanet error:', error.message)
    return null
  }
}

// Handler principal
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cnpj } = await req.json()

    // Validar CNPJ
    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ não informado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const cleanCnpj = cnpj.replace(/\D/g, '')

    if (cleanCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('[Edge] Processing CNPJ:', cleanCnpj)

    // Tentar Receitaws primeiro (mais confiável)
    let result = await consultReceitaws(cleanCnpj)

    // Se falhar, tentar Receitanet
    if (!result) {
      console.log('[Edge] Receitaws failed, trying Receitanet')
      result = await consultReceitanet(cleanCnpj)
    }

    // Se nenhuma API funcionar, retornar fallback
    if (!result) {
      console.log('[Edge] All APIs failed, returning minimal data')
      return new Response(
        JSON.stringify({
          cnpj: cleanCnpj,
          razao_social: `CNPJ ${cleanCnpj}`,
          data_source: 'fallback',
        } as CNPJResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Edge] Success, returning:', result.razao_social)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Edge] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})