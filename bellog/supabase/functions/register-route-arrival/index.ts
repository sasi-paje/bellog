import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKET_NAME = 'route-arrivals'
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

type JsonBody = Record<string, unknown>

interface ProviderResponse {
  id: number | string
  name: string
  role: string
  status: string
  customProps?: {
    email?: string
    [key: string]: unknown
  }
  profileProps?: {
    email?: string
    [key: string]: unknown
  }
}

interface Driver {
  id: number | string
  name: string | null
  email: string | null
  is_active: boolean
}

interface Route {
  id: number | string
  id_driver: number | string | null
  is_active: boolean
}

interface RouteStop {
  id: number
  id_route: number
  id_company: number
  arrived_at: string | null
  is_active: boolean
}

const json = (body: JsonBody, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const badRequest = (message: string, status = 400): Response =>
  json({ success: false, error: message }, status)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const extractProviderResponse = (payload: unknown): ProviderResponse | null => {
  const candidate = isRecord(payload) && isRecord(payload.data)
    ? payload.data
    : payload

  if (!isRecord(candidate)) return null

  const idType = typeof candidate.id
  if (
    (idType !== 'number' && idType !== 'string') ||
    typeof candidate.name !== 'string' ||
    typeof candidate.role !== 'string' ||
    typeof candidate.status !== 'string'
  ) {
    return null
  }

  return candidate as unknown as ProviderResponse
}

const getProviderEmail = (provider: ProviderResponse): string | null => {
  const email = provider.customProps?.email || provider.profileProps?.email
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
}

const getSasiApiBaseUrl = (): string => {
  const apiBaseUrl = Deno.env.get('SASI_API_URL')

  if (!apiBaseUrl) {
    throw new Error('SASI_API_URL não configurada. Defina a variável SASI_API_URL nas configurações da Edge Function.')
  }

  return apiBaseUrl.replace(/\/$/, '')
}

const validateSasiToken = async (token: string): Promise<ProviderResponse> => {
  const apiBaseUrl = getSasiApiBaseUrl()

  const response = await fetch(`${apiBaseUrl}/api/v2/providers/external/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Token SASI inválido ou expirado.')
    }
    throw new Error(`Erro ao validar token SASI: ${response.status} ${response.statusText}`)
  }

const provider = extractProviderResponse(await response.json())
  console.log('[register-route-arrival] Provider response:', provider)
  if (!provider) {
    throw new Error('Resposta da API SASI inválida.')
  }

  const providerEmail = getProviderEmail(provider)
  console.log('[register-route-arrival] Provider email:', providerEmail)
  if (!providerEmail) {
      return badRequest('Email do motorista não encontrado no retorno da SASI.', 401)
    }

    const { data: drivers, error: driverError } = await supabase
      .from('master_person_driver')
      .select('id, name, email, is_active')
      .ilike('email', providerEmail)
      .eq('is_active', true)
      .limit(2)

    if (driverError) {
      console.error('[register-route-arrival] driver lookup failed:', driverError)
      return badRequest('Erro ao buscar motorista vinculado ao token SASI.', 500)
    }

    if (!drivers || drivers.length === 0) {
      return badRequest('Motorista não encontrado para o email retornado pela SASI.', 403)
    }

    if (drivers.length > 1) {
      return badRequest('Mais de um motorista encontrado para o email retornado pela SASI.', 409)
    }

    const driver = drivers[0] as Driver

    const { data: route, error: routeError } = await supabase
      .from('trx_route')
      .select('id, id_driver, is_active')
      .eq('id', routeId)
      .eq('is_active', true)
      .maybeSingle<Route>()

    if (routeError) {
      console.error('[register-route-arrival] route lookup failed:', routeError)
      return badRequest('Erro ao buscar rota informada.', 500)
    }

    if (!route) {
      return badRequest('Rota informada não encontrada.', 404)
    }

    const hasDirectRouteAccess = idsMatch(route.id_driver, driver.id)
    const hasRelationRouteAccess = hasDirectRouteAccess
      ? true
      : await hasRouteDriverRelation(supabase, routeId, driver.id)

    if (!hasDirectRouteAccess && !hasRelationRouteAccess) {
      return badRequest('Motorista não possui acesso a esta rota.', 403)
    }

    console.log('[register-route-arrival] Buscando parada: routeId=', routeId, 'companyId=', companyId)

    const { data: routeStop, error: stopError } = await supabase
      .from('trx_route_stop')
      .select('id, id_route, id_company, arrived_at, is_active')
      .eq('id_route', routeId)
      .eq('id_company', companyId)
      .eq('is_active', true)
      .maybeSingle<RouteStop>()

    console.log('[register-route-arrival] routeStop resultado:', routeStop)

    if (stopError) {
      console.error('[register-route-arrival] route stop lookup failed:', stopError)
      return badRequest('Erro ao buscar parada da rota.', 500)
    }

    if (!routeStop) {
      return badRequest('Paradas da rota ainda não foram geradas. Inicie a rota primeiro para sincronizar as paradas.', 404)
    }

    if (routeStop.arrived_at && !justification) {
      return badRequest('Justificativa é obrigatória para alterar uma chegada já registrada.', 409)
    }

    const timestamp = Date.now()
    const fileName = sanitizeFileName(fileEntry.name)
    const storagePath = `route-${routeId}/company-${companyId}/${timestamp}-${fileName}`
    const fileBytes = new Uint8Array(await fileEntry.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBytes, {
        cacheControl: '3600',
        contentType: fileEntry.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[register-route-arrival] upload failed:', uploadError)
      return badRequest(`Não foi possível enviar a foto da chegada: ${uploadError.message}`, 500)
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('register_route_stop_arrival', {
      p_id_route_stop: routeStop.id,
      p_arrived_at: new Date(arrivedAt).toISOString(),
      p_arrival_photo_path: storagePath,
      p_justification: justification || null,
      p_user_id: toNullableNumber(driver.id),
    })

    if (rpcError) {
      console.error('[register-route-arrival] rpc failed:', rpcError)
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return badRequest(`Não foi possível registrar a chegada: ${rpcError.message}`, 500)
    }

    const record = Array.isArray(rpcData) ? rpcData[0] : rpcData
    const responseData = {
      id_route_stop: record?.id_route_stop ?? routeStop.id,
      arrival_photo_path: record?.arrival_photo_path ?? storagePath,
      arrived_at: record?.arrived_at ?? new Date(arrivedAt).toISOString(),
    }

    return json({
      success: true,
      data: responseData,
      ...responseData,
    })
  } catch (error) {
    console.error('[register-route-arrival] unhandled error:', error)
    return badRequest(error instanceof Error ? error.message : 'Erro inesperado.', 500)
  }
})
