import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// O ambiente (is_test) é derivado da própria rota (trx_route.is_test) em cada
// requisição — não de APP_ENV — para suportar staging (is_test=true) e produção
// (is_test=false) no mesmo projeto Supabase.

const ARRIVAL_PHOTO_BUCKET = Deno.env.get('ARRIVAL_PHOTO_BUCKET') ?? 'bellog-files'
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

type JsonBody = Record<string, unknown>
type DbId = number | string

interface ProviderResponse {
  id: DbId
  name?: string
  role?: string
  status?: string
  email?: string
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
  id: DbId
  name: string | null
  email: string | null
  is_active: boolean
}

interface Route {
  id: DbId
  id_driver: DbId | null
  is_active: boolean
  is_test: boolean
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

const fail = (message: string, status = 400): Response =>
  json({ success: false, error: message }, status)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const idsMatch = (left: unknown, right: unknown): boolean =>
  left !== null && left !== undefined && right !== null && right !== undefined && String(left) === String(right)

const toNullableNumber = (value: DbId | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const sanitizeFileName = (fileName: string): string => {
  const fallback = 'arrival-photo'
  const sanitized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return sanitized || fallback
}

const extractProviderResponse = (payload: unknown): ProviderResponse | null => {
  const candidate = isRecord(payload) && isRecord(payload.data)
    ? payload.data
    : payload

  if (!isRecord(candidate)) return null

  const idType = typeof candidate.id
  if (idType !== 'number' && idType !== 'string') {
    return null
  }

  return candidate as unknown as ProviderResponse
}

const getProviderEmail = (provider: ProviderResponse): string | null => {
  const email = provider.customProps?.email || provider.email || provider.profileProps?.email
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
}

const getSasiApiBaseUrl = (): string => {
  const apiBaseUrl = Deno.env.get('SASI_API_URL') || 'https://api.sasi.io'

  return apiBaseUrl
    .replace(/\/+$/, '')
    .replace(/\/api\/v2\/providers\/external\/me$/, '')
    .replace(/\/api\/v2$/, '')
}

const getSupabaseAdmin = (): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

const validateSasiToken = async (token: string): Promise<ProviderResponse> => {
  const response = await fetch(`${getSasiApiBaseUrl()}/api/v2/providers/external/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Token SASI invalido ou expirado.')
    }
    throw new Error(`Erro ao validar token SASI: ${response.status} ${response.statusText}`)
  }

  const provider = extractProviderResponse(await response.json())
  if (!provider) {
    throw new Error('Resposta da API SASI invalida.')
  }

  return provider
}

const hasRouteDriverRelation = async (
  supabase: SupabaseClient,
  routeId: string,
  driverId: DbId,
  isTest: boolean
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('rel_route_driver')
    .select('id')
    .eq('id_route', routeId)
    .eq('id_driver', driverId)
    .eq('is_active', true)
    .eq('is_test', isTest)
    .limit(1)

  if (error) {
    console.error('[register-route-arrival] rel_route_driver lookup failed:', error)
    return false
  }

  return Boolean(data?.length)
}

const ensureArrivalBucketExists = async (supabase: SupabaseClient): Promise<boolean> => {
  const { data, error } = await supabase.storage.getBucket(ARRIVAL_PHOTO_BUCKET)

  if (!error && data) return true

  console.error(
    `[register-route-arrival] Bucket de fotos de chegada nao encontrado: ${ARRIVAL_PHOTO_BUCKET}`,
    error,
  )

  return false
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return fail('Metodo nao permitido.', 405)
  }

  try {
    const supabase = getSupabaseAdmin()
    const formData = await req.formData()

    const token = String(formData.get('token') || '').trim()
    const routeId = String(formData.get('routeId') || '').trim()
    const companyId = String(formData.get('companyId') || '').trim()
    const arrivedAt = String(formData.get('arrivedAt') || '').trim()
    const justification = String(formData.get('justification') || '').trim()
    const fileEntry = formData.get('file')

    if (!token) return fail('Token de acesso nao informado.', 401)
    if (!routeId) return fail('Rota nao informada.')
    if (!companyId) return fail('Cliente nao informado.')
    if (!arrivedAt || Number.isNaN(new Date(arrivedAt).getTime())) {
      return fail('Horario de chegada invalido.')
    }
    if (!(fileEntry instanceof File)) {
      return fail('Foto de chegada nao enviada.')
    }
    if (!ALLOWED_MIME_TYPES.has(fileEntry.type)) {
      return fail('Formato de imagem invalido. Envie JPG, PNG, WebP, HEIC ou HEIF.')
    }
    if (fileEntry.size > MAX_IMAGE_SIZE_BYTES) {
      return fail('A foto de chegada deve ter no maximo 10MB.')
    }

    const provider = await validateSasiToken(token)
    const providerEmail = getProviderEmail(provider)
    console.log('[register-route-arrival] Provider email:', providerEmail)

    if (!providerEmail) {
      return fail('Email do motorista nao encontrado no retorno da SASI.', 401)
    }

    // Ambiente (is_test) é derivado da PRÓPRIA rota — não de APP_ENV — para
    // funcionar num projeto Supabase único compartilhado por staging (is_test=true)
    // e produção (is_test=false). A rota é única por id.
    const { data: route, error: routeError } = await supabase
      .from('trx_route')
      .select('id, id_driver, is_active, is_test')
      .eq('id', routeId)
      .eq('is_active', true)
      .maybeSingle<Route>()

    if (routeError) {
      console.error('[register-route-arrival] route lookup failed:', routeError)
      return fail('Erro ao buscar rota informada.', 500)
    }
    if (!route) {
      return fail('Rota informada nao encontrada.', 404)
    }

    const routeIsTest = route.is_test

    const { data: drivers, error: driverError } = await supabase
      .from('master_person_driver')
      .select('id, name, email, is_active')
      .ilike('email', providerEmail)
      .eq('is_active', true)
      .eq('is_test', routeIsTest)
      .limit(2)

    if (driverError) {
      console.error('[register-route-arrival] driver lookup failed:', driverError)
      return fail('Erro ao buscar motorista vinculado ao token SASI.', 500)
    }
    if (!drivers?.length) {
      return fail('Motorista nao encontrado para o email retornado pela SASI.', 403)
    }
    if (drivers.length > 1) {
      return fail('Mais de um motorista encontrado para o email retornado pela SASI.', 409)
    }

    const driver = drivers[0] as Driver

    const hasDirectRouteAccess = idsMatch(route.id_driver, driver.id)
    const hasRelationRouteAccess = hasDirectRouteAccess
      ? true
      : await hasRouteDriverRelation(supabase, routeId, driver.id, routeIsTest)

    if (!hasDirectRouteAccess && !hasRelationRouteAccess) {
      return fail('Motorista nao possui acesso a esta rota.', 403)
    }

    const { data: routeStop, error: stopError } = await supabase
      .from('trx_route_stop')
      .select('id, id_route, id_company, arrived_at, is_active')
      .eq('id_route', routeId)
      .eq('id_company', companyId)
      .eq('is_active', true)
      .eq('is_test', routeIsTest)
      .maybeSingle<RouteStop>()

    if (stopError) {
      console.error('[register-route-arrival] route stop lookup failed:', stopError)
      return fail('Erro ao buscar parada da rota.', 500)
    }
    if (!routeStop) {
      return fail('Paradas da rota ainda nao foram geradas. Inicie a rota primeiro para sincronizar as paradas.', 404)
    }
    if (routeStop.arrived_at && !justification) {
      return fail('Justificativa obrigatoria para alterar uma chegada ja registrada.', 409)
    }

    const bucketExists = await ensureArrivalBucketExists(supabase)
    if (!bucketExists) {
      return fail('Nao foi possivel enviar a foto da chegada. Tente novamente.', 500)
    }

    const timestamp = Date.now()
    const fileName = sanitizeFileName(fileEntry.name)
    const storagePath = `rota/${routeId}/destino/${companyId}/chegada/${timestamp}-${fileName}`
    const fileBytes = new Uint8Array(await fileEntry.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(ARRIVAL_PHOTO_BUCKET)
      .upload(storagePath, fileBytes, {
        cacheControl: '3600',
        contentType: fileEntry.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[register-route-arrival] upload failed:', uploadError)
      return fail('Nao foi possivel enviar a foto da chegada. Tente novamente.', 500)
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
      await supabase.storage.from(ARRIVAL_PHOTO_BUCKET).remove([storagePath])
      return fail(`Nao foi possivel registrar a chegada: ${rpcError.message}`, 500)
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
    return fail('Nao foi possivel registrar a chegada. Tente novamente.', 500)
  }
})
