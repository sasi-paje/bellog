// Mock data for routes table
export interface RouteMock {
  id: number
  numeroRota: string
  saida: string
  areaRota: string
  placa: string
  responsavel: string
  motorista: string
  cargaMaxima: number
  cargaUtilizada: number
  statusEntrega: 'Pendente' | 'Em Andamento' | 'Entregue' | 'Cancelada'
  status: 'Ativo' | 'Inativo'
}

export const routesData: RouteMock[] = [
  { id: 1, numeroRota: '001', saida: '08:00', areaRota: 'Zona Sul', placa: 'ABC-1234', responsavel: 'João Silva', motorista: 'Carlos Souza', cargaMaxima: 2000, cargaUtilizada: 1500, statusEntrega: 'Em Andamento', status: 'Ativo' },
  { id: 2, numeroRota: '002', saida: '09:00', areaRota: 'Zona Norte', placa: 'DEF-5678', responsavel: 'Maria Santos', motorista: 'Pedro Oliveira', cargaMaxima: 1800, cargaUtilizada: 1800, statusEntrega: 'Entregue', status: 'Ativo' },
  { id: 3, numeroRota: '003', saida: '10:00', areaRota: 'Zona Oeste', placa: 'GHI-9012', responsavel: 'José Costa', motorista: 'Lucas Lima', cargaMaxima: 2200, cargaUtilizada: 800, statusEntrega: 'Pendente', status: 'Ativo' },
  { id: 4, numeroRota: '004', saida: '07:00', areaRota: 'Zona Leste', placa: 'JKL-3456', responsavel: 'Ana Pereira', motorista: 'Paulo Ferreira', cargaMaxima: 1500, cargaUtilizada: 0, statusEntrega: 'Cancelada', status: 'Inativo' },
  { id: 5, numeroRota: '005', saida: '08:30', areaRota: 'Centro', placa: 'MNO-7890', responsavel: 'Roberto Alves', motorista: 'Ricardo Dias', cargaMaxima: 2500, cargaUtilizada: 2200, statusEntrega: 'Entregue', status: 'Ativo' },
  { id: 6, numeroRota: '006', saida: '09:30', areaRota: 'Zona Sul', placa: 'PQR-1234', responsavel: 'Fernanda Lima', motorista: 'Marcos Gomes', cargaMaxima: 1900, cargaUtilizada: 1900, statusEntrega: 'Em Andamento', status: 'Ativo' },
  { id: 7, numeroRota: '007', saida: '11:00', areaRota: 'Zona Norte', placa: 'STU-5678', responsavel: 'Carla Rodrigues', motorista: 'Bruno Martins', cargaMaxima: 2100, cargaUtilizada: 1200, statusEntrega: 'Pendente', status: 'Ativo' },
  { id: 8, numeroRota: '008', saida: '06:00', areaRota: 'Zona Oeste', placa: 'VWX-9012', responsavel: 'Paulo Henrique', motorista: 'Anderson Silva', cargaMaxima: 1700, cargaUtilizada: 1700, statusEntrega: 'Entregue', status: 'Ativo' },
  { id: 9, numeroRota: '009', saida: '07:30', areaRota: 'Zona Leste', placa: 'YZA-3456', responsavel: 'Juliana Costa', motorista: 'Diego Santos', cargaMaxima: 2300, cargaUtilizada: 500, statusEntrega: 'Pendente', status: 'Inativo' },
  { id: 10, numeroRota: '010', saida: '10:30', areaRota: 'Centro', placa: 'BCD-7890', responsavel: 'Marcelo Oliveira', motorista: 'Felipe Lima', cargaMaxima: 1600, cargaUtilizada: 1600, statusEntrega: 'Em Andamento', status: 'Ativo' },
]
