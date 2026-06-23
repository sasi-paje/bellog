// =====================================================
// ASSIGN-NOTES SERVICE - Lógica de negócio centralizada
// =====================================================
// Arquivo: src/modules/assign-notes/services/assign-notes.service.ts

import { supabase, getEnvironment, applyRefFilter } from '../../../lib/supabase'
import { companyService } from '../../../features/companies/api/company.service'
import { AssignedNote, NoteItem, RouteListItem, FleetVehicle, DriverOption, StatusOption, ResponsibleOption } from '../types/assign-notes.types'

export interface FilterOption {
  value: string
  label: string
}

function getTodayDateOnly(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toStringArray(value: string[] | string | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export async function getRouteResponsibles(): Promise<ResponsibleOption[]> {
  const { data, error } = await applyRefFilter(
    supabase
      .from('ref_route_responsible')
      .select('id, name, slug, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })
  )

  if (error) {
    console.error('[getRouteResponsibles] error:', error)
    throw error
  }

  return (data ?? []).map((item: any) => ({
    id: Number(item.id),
    name: item.name || '',
    slug: item.slug || null,
  }))
}

// Retorna IDs de empresas que pertencem ao grupo E possuem o papel (role) especificado.
// Fail-closed: retorna [] quando nenhuma empresa satisfaz os critérios.
// CRÍTICO: rel_person_company_role_type NÃO tem is_active — nunca filtrar por is_active nessa tabela.
async function getCompanyIdsByGroupAndRole(
  groupId: string,
  roleCode: 'SUPPLIER' | 'DESTINATION',
  isTest: boolean
): Promise<string[]> {
  const { data: roleTypes } = await applyRefFilter(
    supabase
      .from('ref_person_company_role_type')
      .select('id')
      .eq('code', roleCode)
      .eq('is_active', true)
  )
  if (!roleTypes?.length) return []
  const roleTypeIds = (roleTypes as any[]).map(r => r.id)

  const { data: roleLinks } = await supabase
    .from('rel_person_company_role_type')
    .select('id_company')
    .in('id_company_role_type', roleTypeIds)
    .eq('is_test', isTest)
  if (!roleLinks?.length) return []
  const roleCompanyIds = (roleLinks as any[]).map(r => r.id_company)

  const { data: companies } = await supabase
    .from('master_person_company')
    .select('id')
    .eq('id_company_group', groupId)
    .eq('is_active', true)
    .in('id', roleCompanyIds)

  return ((companies as any[]) || []).map(c => String(c.id))
}

// Versão multi-grupo: recebe vários groupIds e retorna a união dos IDs de empresa.
async function getCompanyIdsByGroupsAndRole(
  groupIds: string[],
  roleCode: 'SUPPLIER' | 'DESTINATION',
  isTest: boolean
): Promise<string[]> {
  if (groupIds.length === 0) return []

  const { data: roleTypes } = await applyRefFilter(
    supabase
      .from('ref_person_company_role_type')
      .select('id')
      .eq('code', roleCode)
      .eq('is_active', true)
  )
  if (!roleTypes?.length) return []
  const roleTypeIds = (roleTypes as any[]).map(r => r.id)

  const { data: roleLinks } = await supabase
    .from('rel_person_company_role_type')
    .select('id_company')
    .in('id_company_role_type', roleTypeIds)
    .eq('is_test', isTest)
  if (!roleLinks?.length) return []
  const roleCompanyIds = (roleLinks as any[]).map(r => r.id_company)

  const { data: companies } = await supabase
    .from('master_person_company')
    .select('id')
    .in('id_company_group', groupIds)
    .eq('is_active', true)
    .in('id', roleCompanyIds)

  return [...new Set(((companies as any[]) || []).map(c => String(c.id)))]
}

// Retorna empresas pelo grupo, sem depender do vínculo de papel.
// Usado para o Grupo Cliente porque a nota fiscal filtra diretamente por id_supplier_company.
async function getCompanyIdsByGroups(
  groupIds: string[],
  isTest: boolean
): Promise<string[]> {
  if (groupIds.length === 0) return []

  const { data: companies } = await supabase
    .from('master_person_company')
    .select('id')
    .in('id_company_group', groupIds)
    .eq('is_active', true)
    .eq('is_test', isTest)

  return [...new Set(((companies as any[]) || []).map(c => String(c.id)))]
}

export const assignNotesService = {
  // =====================================================
  // BUSCA DE DADOS - Otimizado para evitar N+1
  // =====================================================

  /**
   * Busca todas as rotas ativas com seus dados básicos
   */
  async getActiveRoutes(params?: {
    departureDate?: string
    limit?: number
  }): Promise<{ data: RouteListItem[]; total: number }> {
    const isTest = getEnvironment() !== 'production'

    const limit = params?.limit || 50
    const departureDate = params?.departureDate || getTodayDateOnly()

    const query = supabase
      .from('trx_route')
      .select('*', { count: 'exact' })
      .eq('is_test', isTest)
      .eq('is_active', true)
      .eq('departure_date', departureDate)
      .order('created_at', { ascending: false })
      .limit(limit)

    const { data: routes, error, count } = await query

    if (error) throw new Error(error.message)
    if (!routes || routes.length === 0) return { data: [], total: 0 }

    return { data: routes as unknown as RouteListItem[], total: count || 0 }
  },

  /**
   * Busca todas as notas de todas as rotas em duas queries simples (evita join PostgREST)
   */
  async getAllRouteNotes(routeIds: string[]): Promise<Record<string, AssignedNote[]>> {
    if (routeIds.length === 0) return {}

    const isTest = getEnvironment() !== 'production'

    // Passo 1: vínculos rota-nota
    const { data: relData, error: relError } = await supabase
      .from('rel_route_invoice')
      .select('id_route, id_fiscal_invoice, attempt_number')
      .in('id_route', routeIds)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (relError) throw new Error(relError.message)
    if (!relData || relData.length === 0) return {}

    // Passo 2: detalhes das notas fiscais
    const invoiceIds = [...new Set(relData.map((r: any) => r.id_fiscal_invoice).filter(Boolean))]

    const { data: invoices, error: invError } = await supabase
      .from('trx_fiscal_invoice')
      .select('id, invoice_number, net_weight, gross_weight, box_quantity, id_customer_company, id_supplier_company')
      .in('id', invoiceIds)

    if (invError) throw new Error(invError.message)

    // Passo 3: nomes de fornecedores e clientes
    const companyIds = [...new Set(
      (invoices || [])
        .flatMap((inv: any) => [inv.id_supplier_company, inv.id_customer_company])
        .filter(Boolean)
        .map(String)
    )]

    let companyMap = new Map<string, string>()
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('master_person_company')
        .select('id, trade_name, legal_name')
        .in('id', companyIds)

      companyMap = new Map(
        (companies || []).map((c: any) => [
          String(c.id),
          (c.trade_name || c.legal_name || '').trim(),
        ])
      )
    }

    const invoiceMap = new Map((invoices || []).map((inv: any) => [String(inv.id), inv]))

    // Agrupar por routeId
    const notesByRoute: Record<string, AssignedNote[]> = {}

    for (const rel of relData as any[]) {
      const routeId = String(rel.id_route)
      const invoice = invoiceMap.get(String(rel.id_fiscal_invoice))

      if (!notesByRoute[routeId]) notesByRoute[routeId] = []

      if (invoice) {
        const weight = Number(invoice.net_weight) || Number(invoice.gross_weight) || 0
        const supplierName = invoice.id_supplier_company
          ? companyMap.get(String(invoice.id_supplier_company)) || ''
          : ''
        const customerName = invoice.id_customer_company
          ? companyMap.get(String(invoice.id_customer_company)) || ''
          : ''

        notesByRoute[routeId].push({
          id: String(invoice.id),
          invoice_number: invoice.invoice_number || '',
          peso: weight,
          supplier_name: supplierName || undefined,
          fornecedor: supplierName || undefined,
          customer_name: customerName || undefined,
          destination_name: customerName || undefined,
          volume: invoice.box_quantity || 0,
          attempt_number: (rel as any).attempt_number || 0,
        })
      }
    }

    return notesByRoute
  },

  /**
   * Busca veículos ativos com capacidade
   */
  async getActiveVehicles(): Promise<FleetVehicle[]> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_fleet_vehicle')
      .select('id, plate, nominal_capacity, is_active')
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('plate')

    if (error) throw new Error(error.message)
    return (data || []) as unknown as FleetVehicle[]
  },

  async getRouteResponsibles(): Promise<ResponsibleOption[]> {
    return getRouteResponsibles()
  },

  /**
   * Busca dados de referência (status, motoristas, responsáveis)
   */
  async getReferenceData(): Promise<{
    drivers: DriverOption[]
    routeStatuses: StatusOption[]
    deliveryStatuses: StatusOption[]
    responsibles: ResponsibleOption[]
  }> {
    const isTest = getEnvironment() !== 'production'

    const [driversResult, statusesResult, deliveryResult, responsibles] = await Promise.all([
      supabase
        .from('master_person_driver')
        .select('id, name')
        .eq('is_test', isTest)
        .eq('is_active', true)
        .order('name'),
      applyRefFilter(
        supabase
          .from('ref_route_status')
          .select('id, description, code')
          .eq('is_active', true)
          .order('description')
      ),
      applyRefFilter(
        supabase
          .from('ref_route_delivery_status')
          .select('id, description, code, allows_route_edition')
          .eq('is_active', true)
          .order('description')
      ),
      getRouteResponsibles(),
    ])

    return {
      drivers: (driversResult.data || []).map(d => ({ id: String(d.id), name: d.name || '' })),
      routeStatuses: (statusesResult.data || []).map(s => ({
        id: String(s.id),
        description: s.description || s.code || '',
        code: s.code || '',
        name: s.description || '',
      })),
      deliveryStatuses: (deliveryResult.data || []).map(s => ({
        id: String(s.id),
        description: s.description || s.code || '',
        code: s.code || '',
        name: s.description || '',
        allows_route_edition: (s as any).allows_route_edition === true,
      })),
      responsibles,
    }
  },

  /**
   * Busca opções reais para os filtros avançados.
   * Grupos são separados por papel/função da empresa:
   *   supplierGroups    → grupos ativos disponíveis para filtrar fornecedores da nota
   *   destinationGroups → grupos de empresas com role DESTINATION
   */
  async getAdvancedFilterOptions(): Promise<{
    supplierGroups: FilterOption[]
    destinationGroups: FilterOption[]
    cities: FilterOption[]
    neighborhoods: FilterOption[]
    neighborhoodsByCity: Record<string, FilterOption[]>
    availableAttempts: FilterOption[]
  }> {
    const isTest = getEnvironment() !== 'production'

    // Passo 1: buscar roles, fornecedores reais das notas, endereços e tentativas (paralelo)
    const [supplierRoleResult, destinationRoleResult, supplierInvoiceResult, addressesResult, maxAttemptResult] = await Promise.all([
      applyRefFilter(
        supabase
          .from('ref_person_company_role_type')
          .select('id')
          .eq('code', 'SUPPLIER')
          .eq('is_active', true)
      ),
      applyRefFilter(
        supabase
          .from('ref_person_company_role_type')
          .select('id')
          .eq('code', 'DESTINATION')
          .eq('is_active', true)
      ),
      supabase
        .from('trx_fiscal_invoice')
        .select('id_supplier_company')
        .eq('is_test', isTest)
        .eq('is_active', true)
        .not('id_supplier_company', 'is', null),
      supabase
        .from('master_person_company_address')
        .select('city, district')
        .eq('is_active', true)
        .eq('is_test', isTest)
        .not('city', 'is', null),
      // Passo 1d: maior attempt_number observado (para gerar opções de tentativa)
      supabase
        .from('rel_route_invoice')
        .select('attempt_number')
        .eq('is_test', isTest)
        .order('attempt_number', { ascending: false })
        .limit(1),
    ])

    const supplierRoleIds = (supplierRoleResult.data || []).map((r: any) => r.id)
    const destinationRoleIds = (destinationRoleResult.data || []).map((r: any) => r.id)

    // Passo 2: buscar IDs das empresas vinculadas a cada role (paralelo)
    const [supplierRelResult, destinationRelResult] = await Promise.all([
      supplierRoleIds.length > 0
        ? supabase
            .from('rel_person_company_role_type')
            .select('id_company')
            .in('id_company_role_type', supplierRoleIds)
            .eq('is_test', isTest)
        : Promise.resolve({ data: [] as any[] }),
      destinationRoleIds.length > 0
        ? supabase
            .from('rel_person_company_role_type')
            .select('id_company')
            .in('id_company_role_type', destinationRoleIds)
            .eq('is_test', isTest)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const supplierRoleCompanyIds = (supplierRelResult.data || []).map((r: any) => r.id_company).filter(Boolean)
    const supplierInvoiceCompanyIds = (supplierInvoiceResult.data || []).map((r: any) => r.id_supplier_company).filter(Boolean)
    const supplierCompanyIds = [...new Set([...supplierRoleCompanyIds, ...supplierInvoiceCompanyIds])]
    const destinationCompanyIds = [...new Set((destinationRelResult.data || []).map((r: any) => r.id_company).filter(Boolean))]

    // Passo 3: buscar id_company_group das empresas de cada papel (paralelo)
    const [supplierCompanyResult, destinationCompanyResult] = await Promise.all([
      supplierCompanyIds.length > 0
        ? supabase
            .from('master_person_company')
            .select('id_company_group')
            .in('id', supplierCompanyIds)
            .eq('is_active', true)
            .not('id_company_group', 'is', null)
        : Promise.resolve({ data: [] as any[] }),
      destinationCompanyIds.length > 0
        ? supabase
            .from('master_person_company')
            .select('id_company_group')
            .in('id', destinationCompanyIds)
            .eq('is_active', true)
            .not('id_company_group', 'is', null)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const supplierGroupIds = [...new Set((supplierCompanyResult.data || []).map((c: any) => c.id_company_group).filter(Boolean))]
    const destinationGroupIds = [...new Set((destinationCompanyResult.data || []).map((c: any) => c.id_company_group).filter(Boolean))]

    // Passo 4: buscar nomes dos grupos em uma única query (paralelo não necessário)
    const allGroupIds = [...new Set([...supplierGroupIds, ...destinationGroupIds])]
    const { data: allGroupsData } = allGroupIds.length > 0
      ? await supabase
          .from('master_person_company_group')
          .select('id, name')
          .in('id', allGroupIds)
          .eq('is_active', true)
          .order('name', { ascending: true })
      : { data: [] as any[] }

    const groupNameMap = new Map<string, string>(
      (allGroupsData || []).map((g: any) => [String(g.id), (g.name || '') as string])
    )

    const toOptions = (ids: any[]): FilterOption[] =>
      ids
        .map(id => ({ value: String(id), label: groupNameMap.get(String(id)) || '' }))
        .filter(o => o.label)
        .sort((a, b) => a.label.localeCompare(b.label))

    let supplierGroups = toOptions(supplierGroupIds)
    if (supplierGroups.length === 0) {
      try {
        const settingsSupplierGroups = await companyService.listGroups('supplier')
        supplierGroups = (settingsSupplierGroups || [])
          .map((g: any) => ({ value: String(g.id), label: (g.name || '') as string }))
          .filter(o => o.label)
          .sort((a, b) => a.label.localeCompare(b.label))
      } catch {
        supplierGroups = []
      }
    }
    if (supplierGroups.length === 0 && supplierCompanyIds.length === 0) {
      try {
        const { data: fallbackGroups } = await supabase
          .from('master_person_company_group')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true })

        supplierGroups = (fallbackGroups || [])
          .map((g: any) => ({ value: String(g.id), label: (g.name || '') as string }))
          .filter(o => o.label)
          .sort((a, b) => a.label.localeCompare(b.label))
      } catch {
        supplierGroups = []
      }
    }
    const destinationGroups = toOptions(destinationGroupIds)

    // Processar cidades e bairros
    const citySet = new Set<string>()
    const neighborhoodsByCity: Record<string, Set<string>> = {}

    for (const addr of addressesResult.data || []) {
      const city = (addr.city || '').trim()
      if (!city) continue
      citySet.add(city)
      const district = (addr.district || '').trim()
      if (district) {
        if (!neighborhoodsByCity[city]) neighborhoodsByCity[city] = new Set()
        neighborhoodsByCity[city].add(district)
      }
    }

    const cities: FilterOption[] = [...citySet]
      .sort()
      .map(c => ({ value: c, label: c }))

    const allNeighborhoods = new Set<string>()
    for (const set of Object.values(neighborhoodsByCity)) set.forEach(n => allNeighborhoods.add(n))
    const neighborhoods: FilterOption[] = [...allNeighborhoods]
      .sort()
      .map(n => ({ value: n, label: n }))

    const neighborhoodsByCityResult: Record<string, FilterOption[]> = {}
    for (const [city, set] of Object.entries(neighborhoodsByCity)) {
      neighborhoodsByCityResult[city] = [...set].sort().map(n => ({ value: n, label: n }))
    }

    // Gerar opções de tentativa: 1ª … N+1ª (mínimo 3)
    const maxObservedAttempt = Number(maxAttemptResult.data?.[0]?.attempt_number ?? 0)
    const numAttemptOptions = Math.max(maxObservedAttempt + 1, 3)
    const availableAttempts: FilterOption[] = Array.from({ length: numAttemptOptions }, (_, i) => ({
      value: String(i + 1),
      label: `${i + 1}ª tentativa`,
    }))

    return { supplierGroups, destinationGroups, cities, neighborhoods, neighborhoodsByCity: neighborhoodsByCityResult, availableAttempts }
  },

  /**
   * Busca notas não atribuídas com paginação
   */
  async getUnassignedNotes(params?: {
    page?: number
    search?: string
    limit?: number
    minWeight?: number
    maxWeight?: number
    // Filtros avançados — arrays (multi-select)
    grupoCliente?: string[] | string   // grupos do fornecedor da nota
    razaoSocial?: string
    grupoDestino?: string[] | string
    nomeDestino?: string
    cidade?: string[] | string
    bairro?: string[] | string
    minDiasNaCasa?: number     // mínimo de dias desde a importação no sistema
    maxDiasNaCasa?: number     // máximo de dias desde a importação no sistema
    referenceDate?: string     // data de referência para o cálculo (padrão: hoje)
    reentrega?: boolean        // false = sem histórico; true = já teve tentativa anterior
    tentativas?: number[]      // próximas tentativas das notas (1 = nunca tentada, 2 = 2ª vez, ...)
  }): Promise<{ data: NoteItem[]; total: number }> {
    const isTest = getEnvironment() !== 'production'
    const page = params?.page || 1
    const limit = params?.limit || 50
    const start = (page - 1) * limit
    const end = start + limit - 1

    // Buscar IDs de notas bloqueadas (ativas e não liberadas)
    const { data: assignedInvoices } = await supabase
      .from('rel_route_invoice')
      .select('id_fiscal_invoice')
      .eq('is_test', isTest)
      .eq('is_active', true)
      .is('released_at', null)

    const assignedIds = Array.from(
      new Set((assignedInvoices || []).map(a => a.id_fiscal_invoice).filter(Boolean))
    )

    // ── Pré-computar IDs de fornecedores (papel SUPPLIER) ──
    // grupoCliente filtra pelo grupo do fornecedor; razaoSocial filtra pelo nome
    let supplierIdsFilter: string[] | null = null
    const supplierGroupIds = [...new Set(toStringArray(params?.grupoCliente))]

    if (supplierGroupIds.length > 0) {
      const ids = await getCompanyIdsByGroups(
        supplierGroupIds,
        isTest
      )
      supplierIdsFilter = ids
    }

    if (params?.razaoSocial) {
      const { data } = await supabase
        .from('master_person_company')
        .select('id')
        .eq('is_active', true)
        .ilike('trade_name', `%${params.razaoSocial}%`)
      const nameIds = (data || []).map(s => String(s.id))
      if (supplierIdsFilter !== null) {
        // Intersecção: fornecedor deve pertencer ao grupo E ter o nome buscado
        const groupSet = new Set(supplierIdsFilter)
        supplierIdsFilter = nameIds.filter(id => groupSet.has(id))
      } else {
        supplierIdsFilter = nameIds
      }
    }

    // ── Pré-computar IDs de clientes (papel DESTINATION) ──
    // grupoDestino filtra pelo grupo do destino/cliente da nota
    const destGroupIds = [...new Set(toStringArray(params?.grupoDestino))]
    const cidades = toStringArray(params?.cidade)
    const bairros = toStringArray(params?.bairro)
    const needsCustomerFilter = !!(
      destGroupIds.length > 0 ||
      params?.nomeDestino ||
      cidades.length > 0 ||
      bairros.length > 0
    )

    let customerIdsFilter: string[] | null = null
    if (needsCustomerFilter) {
      let byGroupName: string[] | null = null
      let byAddress: string[] | null = null

      if (destGroupIds.length > 0) {
        const roleIds = await getCompanyIdsByGroupsAndRole(destGroupIds, 'DESTINATION', isTest)
        if (params?.nomeDestino && roleIds.length > 0) {
          const { data } = await supabase
            .from('master_person_company')
            .select('id')
            .eq('is_active', true)
            .ilike('trade_name', `%${params.nomeDestino}%`)
            .in('id', roleIds)
          byGroupName = (data || []).map(c => String(c.id))
        } else {
          byGroupName = roleIds
        }
      } else if (params?.nomeDestino) {
        const { data } = await supabase
          .from('master_person_company')
          .select('id')
          .eq('is_active', true)
          .ilike('trade_name', `%${params.nomeDestino}%`)
        byGroupName = (data || []).map(c => String(c.id))
      }

      if (cidades.length > 0 || bairros.length > 0) {
        let q = supabase
          .from('master_person_company_address')
          .select('id_company')
          .eq('is_active', true)
          .eq('is_test', isTest)
        if (cidades.length > 0) q = q.in('city', cidades)
        if (bairros.length > 0) q = q.in('district', bairros)
        const { data } = await q
        byAddress = [...new Set((data || []).map(a => String(a.id_company)))]
      }

      if (byGroupName && byAddress) {
        const groupSet = new Set(byGroupName)
        customerIdsFilter = byAddress.filter(id => groupSet.has(id))
      } else {
        customerIdsFilter = byGroupName ?? byAddress
      }
    }

    // ── Pré-computar filtro de tentativas ──
    // Para cada nota disponível, próxima tentativa = MAX(attempt_number no histórico) + 1
    // Notas nunca tentadas = tentativa 1; notas com max attempt 1 = tentativa 2; etc.
    type TentativaFilter =
      | { type: 'exclude'; ids: string[] }   // excluir notas com histórico (para tentativa 1)
      | { type: 'include'; ids: string[] }   // incluir apenas IDs específicos (re-tentativas)
      | { type: 'include-with-first'; excludeIds: string[] } // 1ª + re-tentativas específicas
      | null
    let tentativaFilter: TentativaFilter = null

    if (params?.reentrega !== undefined) {
      const { data: relData } = await supabase
        .from('rel_route_invoice')
        .select('id_fiscal_invoice')
        .eq('is_test', isTest)

      const historyIds = [...new Set((relData || []).map(row => String(row.id_fiscal_invoice)).filter(Boolean))]

      if (params.reentrega) {
        if (historyIds.length === 0) return { data: [], total: 0 }
        tentativaFilter = { type: 'include', ids: historyIds }
      } else {
        tentativaFilter = { type: 'exclude', ids: historyIds }
      }
    } else if (params?.tentativas && params.tentativas.length > 0) {
      const { data: relData } = await supabase
        .from('rel_route_invoice')
        .select('id_fiscal_invoice, attempt_number')
        .eq('is_test', isTest)

      // MAX(attempt_number) por nota (histórico completo, independente de is_active)
      const maxAttemptByInvoice: Record<string, number> = {}
      for (const row of relData || []) {
        const id = String(row.id_fiscal_invoice)
        maxAttemptByInvoice[id] = Math.max(maxAttemptByInvoice[id] || 0, row.attempt_number)
      }

      const wantsFirstAttempt = params.tentativas.includes(1)
      const reAttemptTargets = params.tentativas.filter(n => n > 1)

      // IDs cujo próximo attempt = algum dos reAttemptTargets
      const reAttemptIds = new Set<string>()
      for (const [id, max] of Object.entries(maxAttemptByInvoice)) {
        if (reAttemptTargets.includes(max + 1)) reAttemptIds.add(id)
      }

      if (wantsFirstAttempt && reAttemptTargets.length > 0) {
        // Quer notas sem histórico E notas em reAttemptIds → excluir o restante
        const allWithHistory = new Set(Object.keys(maxAttemptByInvoice))
        const excludeIds = [...allWithHistory].filter(id => !reAttemptIds.has(id))
        tentativaFilter = { type: 'include-with-first', excludeIds }
      } else if (wantsFirstAttempt) {
        // Apenas 1ª tentativa → excluir todas notas com qualquer histórico
        tentativaFilter = { type: 'exclude', ids: Object.keys(maxAttemptByInvoice) }
      } else {
        // Apenas re-tentativas
        if (reAttemptIds.size === 0) return { data: [], total: 0 }
        tentativaFilter = { type: 'include', ids: [...reAttemptIds] }
      }
    }

    // Se algum filtro retornou lista vazia → nenhuma nota satisfaz
    if (supplierIdsFilter !== null && supplierIdsFilter.length === 0) return { data: [], total: 0 }
    if (customerIdsFilter !== null && customerIdsFilter.length === 0) return { data: [], total: 0 }

    // ── Query principal de notas fiscais ──
    let query = supabase
      .from('trx_fiscal_invoice')
      .select('*', { count: 'exact' })
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (assignedIds.length > 0) {
      query = query.not('id', 'in', `(${assignedIds.join(',')})`)
    }
    if (supplierIdsFilter !== null) query = query.in('id_supplier_company', supplierIdsFilter)
    if (customerIdsFilter !== null) query = query.in('id_customer_company', customerIdsFilter)

    // Filtro de tentativas
    if (tentativaFilter !== null) {
      if (tentativaFilter.type === 'include') {
        query = query.in('id', tentativaFilter.ids)
      } else if (tentativaFilter.type === 'exclude') {
        if (tentativaFilter.ids.length > 0) {
          query = query.not('id', 'in', `(${tentativaFilter.ids.join(',')})`)
        }
      } else if (tentativaFilter.type === 'include-with-first') {
        if (tentativaFilter.excludeIds.length > 0) {
          query = query.not('id', 'in', `(${tentativaFilter.excludeIds.join(',')})`)
        }
      }
    }

    // Tempo na casa (created_at = data de importação da nota no sistema Bellog)
    if (params?.minDiasNaCasa !== undefined || params?.maxDiasNaCasa !== undefined) {
      const ref = params.referenceDate ? new Date(params.referenceDate) : new Date()
      const dateStr = (d: Date) => d.toISOString().slice(0, 10) // 'YYYY-MM-DD'
      const daysFromRef = (n: number): string => {
        const d = new Date(ref)
        d.setDate(d.getDate() - n)
        return dateStr(d)
      }

      if (params.minDiasNaCasa !== undefined && params.minDiasNaCasa > 0) {
        // Nota deve ter pelo menos N dias → created_at < (ref - N + 1 dias)
        const cutoff = new Date(ref)
        cutoff.setDate(cutoff.getDate() - params.minDiasNaCasa + 1)
        query = query.lt('created_at', dateStr(cutoff))
      }
      if (params.maxDiasNaCasa !== undefined && params.maxDiasNaCasa >= 0) {
        // Nota deve ter no máximo N dias → created_at >= (ref - N dias)
        query = query.gte('created_at', daysFromRef(params.maxDiasNaCasa))
      }
    }

    if (params?.search) {
      query = query.or(`invoice_number.ilike.%${params.search}%`)
    }

    if (params?.minWeight) {
      query = query.gte('gross_weight', params.minWeight)
    }

    if (params?.maxWeight) {
      query = query.lte('gross_weight', params.maxWeight)
    }

    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(start, end)

    const { data: invoices, error, count } = await query

    if (error) throw new Error(error.message)
    if (!invoices || invoices.length === 0) return { data: [], total: 0 }

    // Buscar nomes de empresas
    const supplierIds = [...new Set(invoices.map(i => i.id_supplier_company).filter(Boolean))]
    const customerIds = [...new Set(invoices.map(i => i.id_customer_company).filter(Boolean))]

    const [suppliersResult, customersResult] = await Promise.all([
      supplierIds.length > 0
        ? supabase.from('master_person_company').select('id, trade_name, id_company_group').in('id', supplierIds)
        : { data: [] },
      customerIds.length > 0
        ? supabase.from('master_person_company').select('id, trade_name').in('id', customerIds)
        : { data: [] },
    ])

    // Buscar nomes dos grupos de fornecedor
    const groupIds = [...new Set(
      (suppliersResult.data || [])
        .map((s: any) => s.id_company_group)
        .filter((id: any): id is number => id != null)
    )]

    let groupMap = new Map<number, string>()
    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from('master_person_company_group')
        .select('id, name')
        .in('id', groupIds)
      groupMap = new Map((groups || []).map((g: any) => [g.id as number, g.name as string]))
    }

    const supplierMap = new Map(
      (suppliersResult.data || []).map((s: any) => [String(s.id), s.trade_name || ''])
    )
    const supplierGroupMap = new Map(
      (suppliersResult.data || []).map((s: any) => [
        String(s.id),
        s.id_company_group ? (groupMap.get(s.id_company_group) || '') : '',
      ])
    )
    const customerMap = new Map(
      (customersResult.data || []).map((c: any) => [String(c.id), c.trade_name || ''])
    )

    const result: NoteItem[] = invoices.map(inv => ({
      id: String(inv.id),
      invoice_number: inv.invoice_number || '',
      weight: Number(inv.net_weight) || Number(inv.gross_weight) || 0,
      volume: inv.box_quantity || 0,
      value: Number(inv.invoice_amount) || 0,
      destination_name: customerMap.get(String(inv.id_customer_company)) || '',
      supplier_name: supplierMap.get(String(inv.id_supplier_company)) || '',
      fornecedor: supplierMap.get(String(inv.id_supplier_company)) || '',
      supplier_group_name: supplierGroupMap.get(String(inv.id_supplier_company)) || '',
      customer_name: customerMap.get(String(inv.id_customer_company)) || '',
      issue_date: inv.invoice_issue_date || '',
      is_active: inv.is_active ?? true,
    }))

    return { data: result, total: count || 0 }
  },

  // =====================================================
  // CRIAÇÃO E ATUALIZAÇÃO DE ROTAS
  // =====================================================

  /**
   * Cria uma nova rota com notas vinculadas via RPC
   * O frontend NÃO envia: id_route_status, id_route_delivery_status, route_code
   * A RPC busca o status inicial automaticamente
   */
  async createRouteWithNotes(
    vehicleId: string,
    notes: AssignedNote[],
    routeData: {
      departure_date: string
      id_driver?: string
      area?: string
      id_route_responsible: number
      assistant?: string
    }
  ): Promise<string> {
    const isTest = getEnvironment() !== 'production'

    const params = {
      p_id_vehicle: Number(vehicleId),
      p_departure_date: routeData.departure_date,
      p_id_route_responsible: routeData.id_route_responsible,
      p_id_driver: routeData.id_driver ? Number(routeData.id_driver) : null,
      p_area: routeData.area || null,
      p_assistant: routeData.assistant
        ? (Array.isArray(routeData.assistant)
            ? (routeData.assistant as string[]).filter(Boolean)
            : routeData.assistant.split(',').map((s: string) => s.trim()).filter(Boolean))
        : null,
      p_invoice_ids: notes.map(n => Number(n.id)),
      p_is_test: isTest,
    }

    const { data, error } = await supabase.rpc('create_route_from_assign_notes', params)

    if (error) {
      console.error('[create_route_from_assign_notes] error:', error)
      const details = [error.message, error.details, error.hint, error.code]
        .filter(Boolean)
        .join(' | ')
      throw new Error(details || 'Erro ao criar rota')
    }

    if (!data || data.length === 0) {
      throw new Error('Rota não foi criada')
    }

    return String(data[0])
  },

  /**
   * Atualiza rota e sincroniza notas via RPC (transação server-side)
   * O frontend NÃO envia: id_route_status, id_route_delivery_status
   * A RPC valida allows_route_edition antes de qualquer alteração
   */
  async updateRouteWithNotes(
    routeId: string,
    routeData: {
      departure_date?: string
      id_driver?: string
      area?: string
      id_route_responsible?: number | null
      assistant?: string
    },
    noteIds: string[]
  ): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const params = {
      p_route_id: Number(routeId),
      p_departure_date: routeData.departure_date || null,
      p_id_route_responsible: routeData.id_route_responsible ?? null,
      p_id_driver: routeData.id_driver ? Number(routeData.id_driver) : null,
      p_area: routeData.area || null,
      p_assistant: routeData.assistant
        ? (Array.isArray(routeData.assistant)
            ? (routeData.assistant as string[]).filter(Boolean)
            : routeData.assistant.split(',').map((s: string) => s.trim()).filter(Boolean))
        : null,
      p_invoice_ids: noteIds.map(id => Number(id)),
      p_is_test: isTest,
    }

    const { error } = await supabase.rpc('update_route_from_assign_notes', params)

    if (error) {
      console.error('[update_route_from_assign_notes] error:', error)
      const details = [error.message, error.details, error.hint, error.code]
        .filter(Boolean)
        .join(' | ')
      throw new Error(details || 'Erro ao atualizar rota')
    }
  },

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  /**
   * Calcula divergência entre notas locais e do banco
   */
  calculateDivergence(
    routeId: string,
    localNotes: AssignedNote[] | undefined,
    dbNotes: AssignedNote[]
  ): {
    hasDivergence: boolean
    dbNotesCount: number
    localNotesCount: number
    dbWeight: number
    localWeight: number
    addedNotes: AssignedNote[]
    removedNotes: AssignedNote[]
    weightDiff: number
  } {
    const effectiveLocal = localNotes !== undefined ? localNotes : dbNotes

    const dbIds = new Set(dbNotes.map(n => n.id))
    const localIds = new Set(effectiveLocal.map(n => n.id))

    const addedNotes = effectiveLocal.filter(n => !dbIds.has(n.id))
    const removedNotes = dbNotes.filter(n => !localIds.has(n.id))

    const dbWeight = dbNotes.reduce((sum, n) => sum + n.peso, 0)
    const localWeight = effectiveLocal.reduce((sum, n) => sum + n.peso, 0)

    return {
      hasDivergence: addedNotes.length > 0 || removedNotes.length > 0,
      dbNotesCount: dbNotes.length,
      localNotesCount: effectiveLocal.length,
      dbWeight,
      localWeight,
      addedNotes,
      removedNotes,
      weightDiff: localWeight - dbWeight,
    }
  },

  /**
   * Verifica se uma nota pode ser transferida
   */
  async canTransferNote(noteId: string, fromRouteId: string, toRouteId: string): Promise<boolean> {
    const isTest = getEnvironment() !== 'production'

    const { data: existingAssignment, error } = await supabase
      .from('rel_route_invoice')
      .select('id, id_route')
      .eq('id_fiscal_invoice', parseInt(noteId, 10))
      .eq('is_test', isTest)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !existingAssignment) return true // Nota livre

    // Se já está na rota de destino, pode
    return String(existingAssignment.id_route) === toRouteId
  },
}

export default assignNotesService
