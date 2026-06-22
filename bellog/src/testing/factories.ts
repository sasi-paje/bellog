// Test factories — used exclusively in *.test.* files.
// All factories include is_test: true and generate unique IDs via counter.

let counter = 0
const uid = () => String(++counter)

// ──────────────────────────────────────────────
// Vehicles
// ──────────────────────────────────────────────

export interface MinimalVehicle {
  id: string
  plate: string
  code: string
  model: string
  nominal_capacity: number
  max_capacity: number
  is_active: boolean
  is_test: boolean
}

export function makeVehicle(overrides: Partial<MinimalVehicle> = {}): MinimalVehicle {
  const id = uid()
  return {
    id,
    plate: `AAA${id.padStart(4, '0')}`,
    code: `V${id}`,
    model: 'Modelo Teste',
    nominal_capacity: 1000,
    max_capacity: 1000,
    is_active: true,
    is_test: true,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// Drivers
// ──────────────────────────────────────────────

export interface MinimalDriver {
  id: string
  name: string
  email: string
  phone: string
  tax_id: string
  is_active: boolean
  is_test: boolean
}

export function makeDriver(overrides: Partial<MinimalDriver> = {}): MinimalDriver {
  const id = uid()
  return {
    id,
    name: `Motorista ${id}`,
    email: `motorista${id}@test.com`,
    phone: `119${id.padStart(8, '0')}`,
    tax_id: `000.000.000-${id.padStart(2, '0')}`,
    is_active: true,
    is_test: true,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// Companies
// ──────────────────────────────────────────────

export interface MinimalCompany {
  id: string
  cnpj: string
  legal_name: string
  trade_name: string | null
  email: string | null
  is_active: boolean
  is_test: boolean
}

export function makeCompany(overrides: Partial<MinimalCompany> = {}): MinimalCompany {
  const id = uid()
  return {
    id,
    cnpj: `00000000000${id.padStart(2, '0')}00`,
    legal_name: `Empresa ${id} LTDA`,
    trade_name: null,
    email: null,
    is_active: true,
    is_test: true,
    ...overrides,
  }
}

export function makeDestination(overrides: Partial<MinimalCompany> = {}): MinimalCompany {
  return makeCompany(overrides)
}

export function makeSupplier(overrides: Partial<MinimalCompany> = {}): MinimalCompany {
  return makeCompany(overrides)
}

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

export interface MinimalRoute {
  id: string
  code: string
  is_active: boolean
  is_test: boolean
  id_vehicle: string | null
  id_driver: string | null
}

export function makeRoute(overrides: Partial<MinimalRoute> = {}): MinimalRoute {
  const id = uid()
  return {
    id,
    code: `R${id.padStart(4, '0')}`,
    is_active: true,
    is_test: true,
    id_vehicle: null,
    id_driver: null,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// Invoices
// ──────────────────────────────────────────────

export interface MinimalInvoice {
  id: string
  invoice_number: string
  id_customer_company: string | null
  id_supplier_company: string | null
  is_active: boolean
  is_test: boolean
}

export function makeInvoice(overrides: Partial<MinimalInvoice> = {}): MinimalInvoice {
  const id = uid()
  return {
    id,
    invoice_number: `NF${id.padStart(5, '0')}`,
    id_customer_company: null,
    id_supplier_company: null,
    is_active: true,
    is_test: true,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// Route Invoice (rel_route_invoice)
// ──────────────────────────────────────────────

export interface MinimalRouteInvoice {
  id: string
  id_route: string
  id_fiscal_invoice: string
  is_active: boolean
  is_test: boolean
  released_at: string | null
}

export function makeRouteInvoice(overrides: Partial<MinimalRouteInvoice> = {}): MinimalRouteInvoice {
  const id = uid()
  return {
    id,
    id_route: uid(),
    id_fiscal_invoice: uid(),
    is_active: true,
    is_test: true,
    released_at: null,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// Route Delivery Status (ref_route_delivery_status)
// ──────────────────────────────────────────────

export interface MinimalRouteDeliveryStatus {
  id: string
  slug: string
  label: string
  allows_route_edition: boolean
}

export function makeRouteDeliveryStatus(
  overrides: Partial<MinimalRouteDeliveryStatus> = {}
): MinimalRouteDeliveryStatus {
  const id = uid()
  return {
    id,
    slug: `status-${id}`,
    label: `Status ${id}`,
    allows_route_edition: false,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// Route Status (ref_route_status)
// ──────────────────────────────────────────────

export interface MinimalRouteStatus {
  id: string
  slug: string
  label: string
}

export function makeRouteStatus(overrides: Partial<MinimalRouteStatus> = {}): MinimalRouteStatus {
  const id = uid()
  return {
    id,
    slug: `route-status-${id}`,
    label: `Route Status ${id}`,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// Person Company Role Type (ref_person_company_role_type)
// ──────────────────────────────────────────────

export interface MinimalPersonCompanyRoleType {
  id: string
  code: string
  label: string
}

export function makePersonCompanyRoleType(
  overrides: Partial<MinimalPersonCompanyRoleType> = {}
): MinimalPersonCompanyRoleType {
  const id = uid()
  return {
    id,
    code: `ROLE_${id}`,
    label: `Role ${id}`,
    ...overrides,
  }
}
