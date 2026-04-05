// Mock data for assign-notes page
// These interfaces match the API types

export interface NoteItem {
  id: string
  invoice_number: string
  weight: number
  volume: number
  fornecedor?: string
  caixas?: number
  value?: number
  issue_date?: string
}

export interface AssignedNote {
  id: string
  invoice_number: string
  peso: number
}

export interface RouteCardData {
  id: string
  tipoRota: string
  numeroRota: string
  veiculo: string
  capacidade: number
  cargaAtual: number
  notasAtribuidas: AssignedNote[]
  isEmpty?: boolean
  // true = card de veículo (temporário, ainda não tem rota criada)
  // false = card de rota (rota já persistida no banco)
  isTemporary?: boolean
  id_vehicle?: string
  route_status?: string
  status_description?: string
}

export const availableNotes: NoteItem[] = [
  { id: '1', invoice_number: '131415', fornecedor: 'Fornecedor A', weight: 20, volume: 5, caixas: 5 },
  { id: '2', invoice_number: '131416', fornecedor: 'Fornecedor B', weight: 15, volume: 3, caixas: 3 },
  { id: '3', invoice_number: '131417', fornecedor: 'Fornecedor C', weight: 30, volume: 8, caixas: 8 },
  { id: '4', invoice_number: '131418', fornecedor: 'Fornecedor A', weight: 25, volume: 6, caixas: 6 },
  { id: '5', invoice_number: '131419', fornecedor: 'Fornecedor D', weight: 18, volume: 4, caixas: 4 },
  { id: '6', invoice_number: '131420', fornecedor: 'Fornecedor B', weight: 22, volume: 5, caixas: 5 },
  { id: '7', invoice_number: '131421', fornecedor: 'Fornecedor E', weight: 12, volume: 2, caixas: 2 },
  { id: '8', invoice_number: '131422', fornecedor: 'Fornecedor C', weight: 28, volume: 7, caixas: 7 },
  { id: '9', invoice_number: '131423', fornecedor: 'Fornecedor F', weight: 35, volume: 10, caixas: 10 },
  { id: '10', invoice_number: '131424', fornecedor: 'Fornecedor A', weight: 16, volume: 4, caixas: 4 },
  { id: '11', invoice_number: '131425', fornecedor: 'Fornecedor G', weight: 14, volume: 3, caixas: 3 },
  { id: '12', invoice_number: '131426', fornecedor: 'Fornecedor B', weight: 20, volume: 5, caixas: 5 },
]

export const routesCards: RouteCardData[] = [
  // Rotas preenchidas com notas
  {
    id: '1',
    tipoRota: 'Rota Urbana',
    numeroRota: '12312',
    veiculo: 'OAS-1A23',
    capacidade: 500,
    cargaAtual: 300,
    notasAtribuidas: [
      { id: '101', invoice_number: '131415', peso: 100 },
      { id: '102', invoice_number: '131416', peso: 100 },
      { id: '103', invoice_number: '131417', peso: 100 },
    ],
  },
  {
    id: '2',
    tipoRota: 'Rota Urbana',
    numeroRota: '12313',
    veiculo: 'OAS-1A24',
    capacidade: 500,
    cargaAtual: 300,
    notasAtribuidas: [
      { id: '104', invoice_number: '131425', peso: 100 },
      { id: '105', invoice_number: '131426', peso: 100 },
      { id: '106', invoice_number: '131427', peso: 100 },
    ],
  },
  // Rotas vazias (para criar rota)
  {
    id: '3',
    tipoRota: '',
    numeroRota: '',
    veiculo: 'OAS-1A21',
    capacidade: 750,
    cargaAtual: 0,
    notasAtribuidas: [],
    isEmpty: true,
  },
  {
    id: '4',
    tipoRota: '',
    numeroRota: '',
    veiculo: 'OAS-1A22',
    capacidade: 750,
    cargaAtual: 0,
    notasAtribuidas: [],
    isEmpty: true,
  },
  {
    id: '5',
    tipoRota: '',
    numeroRota: '',
    veiculo: 'OAS-1A25',
    capacidade: 750,
    cargaAtual: 0,
    notasAtribuidas: [],
    isEmpty: true,
  },
  {
    id: '6',
    tipoRota: '',
    numeroRota: '',
    veiculo: 'OAS-1A26',
    capacidade: 750,
    cargaAtual: 0,
    notasAtribuidas: [],
    isEmpty: true,
  },
  {
    id: '7',
    tipoRota: '',
    numeroRota: '',
    veiculo: 'OAS-1A27',
    capacidade: 750,
    cargaAtual: 0,
    notasAtribuidas: [],
    isEmpty: true,
  },
  {
    id: '8',
    tipoRota: '',
    numeroRota: '',
    veiculo: 'OAS-1A28',
    capacidade: 750,
    cargaAtual: 0,
    notasAtribuidas: [],
    isEmpty: true,
  },
]
