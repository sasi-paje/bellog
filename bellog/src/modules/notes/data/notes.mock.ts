// Mock data for notes table
export interface NoteMock {
  id: number
  numeroNota: string
  fornecedor: string
  destino: string
  numeroViagem: string
  caixas: number
  pesoLiquido: number
  pesoBruto: number
  valorNota: number
  status: 'Pendente' | 'Em Trânsito' | 'Entregue' | 'Cancelada'
}

export const notesData: NoteMock[] = [
  { id: 1, numeroNota: '001', fornecedor: 'Fornecedor A', destino: 'Centro', numeroViagem: 'V001', caixas: 10, pesoLiquido: 150.5, pesoBruto: 160.0, valorNota: 2500.00, status: 'Entregue' },
  { id: 2, numeroNota: '002', fornecedor: 'Fornecedor B', destino: 'Zona Sul', numeroViagem: 'V002', caixas: 5, pesoLiquido: 75.0, pesoBruto: 80.5, valorNota: 1200.50, status: 'Em Trânsito' },
  { id: 3, numeroNota: '003', fornecedor: 'Fornecedor C', destino: 'Zona Norte', numeroViagem: 'V003', caixas: 8, pesoLiquido: 120.0, pesoBruto: 130.0, valorNota: 1800.00, status: 'Pendente' },
  { id: 4, numeroNota: '004', fornecedor: 'Fornecedor A', destino: 'Zona Oeste', numeroViagem: 'V004', caixas: 12, pesoLiquido: 180.5, pesoBruto: 195.0, valorNota: 3100.00, status: 'Cancelada' },
  { id: 5, numeroNota: '005', fornecedor: 'Fornecedor D', destino: 'Centro', numeroViagem: 'V005', caixas: 6, pesoLiquido: 90.0, pesoBruto: 98.5, valorNota: 1500.00, status: 'Entregue' },
  { id: 6, numeroNota: '006', fornecedor: 'Fornecedor B', destino: 'Zona Leste', numeroViagem: 'V006', caixas: 15, pesoLiquido: 225.0, pesoBruto: 240.0, valorNota: 3800.00, status: 'Em Trânsito' },
  { id: 7, numeroNota: '007', fornecedor: 'Fornecedor E', destino: 'Zona Sul', numeroViagem: 'V007', caixas: 3, pesoLiquido: 45.0, pesoBruto: 50.0, valorNota: 750.00, status: 'Pendente' },
  { id: 8, numeroNota: '008', fornecedor: 'Fornecedor C', destino: 'Centro', numeroViagem: 'V008', caixas: 20, pesoLiquido: 300.0, pesoBruto: 320.0, valorNota: 5000.00, status: 'Entregue' },
  { id: 9, numeroNota: '009', fornecedor: 'Fornecedor A', destino: 'Zona Norte', numeroViagem: 'V009', caixas: 7, pesoLiquido: 105.0, pesoBruto: 115.0, valorNota: 1750.00, status: 'Cancelada' },
  { id: 10, numeroNota: '010', fornecedor: 'Fornecedor F', destino: 'Zona Oeste', numeroViagem: 'V010', caixas: 9, pesoLiquido: 135.0, pesoBruto: 145.0, valorNota: 2200.00, status: 'Em Trânsito' },
]
