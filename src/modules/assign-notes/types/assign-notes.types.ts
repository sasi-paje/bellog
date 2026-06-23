// =====================================================
// ASSIGN-NOTES TYPES - Tipos centralizados
// =====================================================
// Arquivo: src/modules/assign-notes/types/assign-notes.types.ts

// =====================================================
// NOTAS
// =====================================================

export interface NoteItem {
  id: string
  invoice_number: string
  weight: number
  volume: number
  value?: number
  destination_name?: string
  supplier_name?: string
  fornecedor?: string
  supplier_group_name?: string
  customer_name?: string
  issue_date?: string
  is_active?: boolean
}

export interface AssignedNote {
  id: string
  invoice_number: string
  peso: number
  weight?: number
  destination_name?: string
  fornecedor?: string
  supplier_name?: string
  customer_name?: string
  volume?: number
  value?: number
  attempt_number?: number
}

// =====================================================
// ROTA
// =====================================================

export interface RouteFormData {
  numeroRota: string
  areaRota: string
  id_route_responsible: string
  destinos: { value: string; label: string }[]
  tipoRota: string
  dataSaida: string
  fimRota: string
  motorista: string
  ajudante: { value: string; label: string; color?: string }[]
  placaVeiculo: string
  cargaMaxima: string
  id_route_status: string
  id_route_delivery_status: string
}

export interface RouteListItem {
  id: string
  route_code: string
  area_description: string
  departure_date: string
  departure_time: string
  arrival_date?: string
  arrival_time?: string
  starts_at?: string
  ends_at?: string
  status: string
  status_description: string
  delivery_status: string
  delivery_status_description: string
  vehicle_plate?: string
  vehicle_max_capacity?: number
  current_load?: number
  driver_names: string[]
  responsible_names: string[]
  destinations: string[]
  is_active: boolean
  // Campos internos do banco (trx_route)
  id_route_status?: string
  id_route_delivery_status?: string
  id_route_type?: string
  id_driver?: string
  area?: string
  id_route_responsible?: number
  assistant?: string
  id_vehicle?: string
}

// =====================================================
// CARD DE ROTA (View Model)
// =====================================================

export interface RouteCardData {
  id: string
  tipoRota: string
  numeroRota: string
  veiculo: string
  capacidade: number
  cargaAtual: number
  notasAtribuidas: AssignedNote[]
  isTemporary: boolean
  hasPendingChanges: boolean
  buttonLabel: string
  buttonColor: 'gray' | 'orange'
  route_status?: string
  allowsEdition: boolean
}

// =====================================================
// DIVERGÊNCIA (NOVO)
// =====================================================

export interface DivergenceInfo {
  hasDivergence: boolean
  dbNotesCount: number
  localNotesCount: number
  dbWeight: number
  localWeight: number
  addedNotes: AssignedNote[]
  removedNotes: AssignedNote[]
  weightDiff: number
}

// =====================================================
// FILTROS
// =====================================================

export interface FilterValues {
  date: string
  vehicle: string
  minWeight: string
  maxWeight: string
}

// =====================================================
// ESTADO DO CONTEXT
// =====================================================

export interface AssignNotesState {
  routes: RouteListItem[]
  routeNotes: Record<string, AssignedNote[]>
  vehicles: FleetVehicle[]
  drivers: DriverOption[]
  routeStatuses: StatusOption[]
  deliveryStatuses: StatusOption[]
  unassignedNotes: NoteItem[]
  dirtyRoutes: Set<string>
  localRouteNotes: Record<string, AssignedNote[]>
  isLoading: boolean
  error: string | null
}

export interface FleetVehicle {
  id: string
  plate: string
  nominal_capacity: number
  is_active: boolean
}

export interface DriverOption {
  id: string
  name: string
}

export interface StatusOption {
  id: string
  description: string
  code?: string
  name?: string
  allows_route_edition?: boolean
}

export interface ResponsibleOption {
  id: number
  name: string
  slug?: string | null
}

// =====================================================
// AÇÕES DO CONTEXT
// =====================================================

export type AssignNotesAction =
  | { type: 'SET_ROUTES'; payload: RouteListItem[] }
  | { type: 'SET_ROUTE_NOTES'; payload: Record<string, AssignedNote[]> }
  | { type: 'SET_VEHICLES'; payload: FleetVehicle[] }
  | { type: 'SET_DRIVERS'; payload: DriverOption[] }
  | { type: 'SET_ROUTE_STATUSES'; payload: StatusOption[] }
  | { type: 'SET_DELIVERY_STATUSES'; payload: StatusOption[] }
  | { type: 'SET_UNASSIGNED_NOTES'; payload: NoteItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTE_TO_ROUTE'; payload: { routeId: string; note: AssignedNote } }
  | { type: 'REMOVE_NOTE_FROM_ROUTE'; payload: { routeId: string; noteId: string } }
  | { type: 'SET_LOCAL_ROUTE_NOTES'; payload: { routeId: string; notes: AssignedNote[] } }
  | { type: 'MARK_ROUTE_DIRTY'; payload: string }
  | { type: 'CLEAR_ROUTE_CHANGES'; payload: string }
  | { type: 'CLEAR_ALL_CHANGES' }

// =====================================================
// SERVICES
// =====================================================

export interface RouteWithNotes {
  routeId: string
  notes: AssignedNote[]
}

export interface AssignmentResult {
  success: boolean
  error?: string
  affectedRoute?: string
}
