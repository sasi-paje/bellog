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

// Mesmo bucket usado pela register-route-arrival para manter leitura e escrita em sincronia.
const ARRIVAL_PHOTO_BUCKET = Deno.env.get('ARRIVAL_PHOTO_BUCKET') ?? 'bellog-files'
const LEGACY_ARRIVAL_PHOTO_BUCKET = 'route-arrivals'
const SIGNED_URL_TTL_SECONDS = 60 * 60

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
  arrival_photo_path: string | null
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
    console.error('[get-route-arrival] rel_route_driver lookup failed:', error)
    return false
  }

  return Boolean(data?.length)
}

// Gera a URL da foto a partir do bucket configurado, adaptando-se a visibilidade:
// bucket publico -> getPublicUrl; bucket privado -> createSignedUrl temporaria.
const buildPhotoUrl = async (
  supabase: SupabaseClient,
  path: string | null
): Promise<string | null> => {
  if (!path) return null

  const isLegacyArrivalPath = /^(prod|test)?\/?route-\d+\/company-\d+\//.test(path)
  const buckets = isLegacyArrivalPath
    ? [LEGACY_ARRIVAL_PHOTO_BUCKET, ARRIVAL_PHOTO_BUCKET]
    : [ARRIVAL_PHOTO_BUCKET, LEGACY_ARRIVAL_PHOTO_BUCKET]

  for (const bucket of buckets) {
    const { error: bucketError } = await supabase.storage.getBucket(bucket)

    if (bucketError) {
      if (bucket === ARRIVAL_PHOTO_BUCKET) {
        console.error(`[get-route-arrival] Bucket de fotos nao encontrado: ${bucket}`, bucketError)
      }
      continue
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }

    if (error && !/object not found/i.test(error.message)) {
      console.error('[get-route-arrival] createSignedUrl failed:', error)
    }
  }

  return null
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
    const body = await req.json().catch(() => null)

    if (!isRecord(body)) {
      return fail('Corpo da requisicao invalido.')
    }

    const token = String(body.token || '').trim()
    const routeId = String(body.routeId || '').trim()
    const companyId = String(body.companyId || '').trim()

    if (!token) return fail('Token de acesso nao informado.', 401)
    if (!routeId) return fail('Rota nao informada.')
    if (!companyId) return fail('Cliente nao informado.')

    const provider = await validateSasiToken(token)
    const providerEmail = getProviderEmail(provider)

    if (!providerEmail) {
      return fail('Email do motorista nao encontrado no retorno da SASI.', 401)
    }

    // Ambiente (is_test) derivado da PRÓPRIA rota — não de APP_ENV — para
    // funcionar num projeto Supabase único (staging is_test=true / prod false).
    const { data: route, error: routeError } = await supabase
      .from('trx_route')
      .select('id, id_driver, is_active, is_test')
      .eq('id', routeId)
      .eq('is_active', true)
      .maybeSingle<Route>()

    if (routeError) {
      console.error('[get-route-arrival] route lookup failed:', routeError)
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
      console.error('[get-route-arrival] driver lookup failed:', driverError)
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
      .select('id, id_route, id_company, arrived_at, arrival_photo_path, is_active')
      .eq('id_route', routeId)
      .eq('id_company', companyId)
      .eq('is_active', true)
      .eq('is_test', routeIsTest)
      .maybeSingle<RouteStop>()

    if (stopError) {
      console.error('[get-route-arrival] route stop lookup failed:', stopError)
      return fail('Erro ao buscar parada da rota.', 500)
    }

    if (!routeStop) {
      return json({
        success: true,
        data: {
          id_route_stop: null,
          id_route: Number(routeId),
          id_company: Number(companyId),
          arrived_at: null,
          arrival_photo_path: null,
          arrival_photo_url: null,
          already_registered: false,
        },
      })
    }

    const alreadyRegistered = Boolean(routeStop.arrived_at)
    const photoUrl = alreadyRegistered
      ? await buildPhotoUrl(supabase, routeStop.arrival_photo_path)
      : null

    return json({
      success: true,
      data: {
        id_route_stop: routeStop.id,
        id_route: routeStop.id_route,
        id_company: routeStop.id_company,
        arrived_at: routeStop.arrived_at,
        arrival_photo_path: routeStop.arrival_photo_path,
        arrival_photo_url: photoUrl,
        already_registered: alreadyRegistered,
      },
    })
  } catch (error) {
    console.error('[get-route-arrival] unhandled error:', error)
    return fail('Nao foi possivel consultar a chegada. Tente novamente.', 500)
  }
})
