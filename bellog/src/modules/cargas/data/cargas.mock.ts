export interface CargaMock {
  id: string
  numeroCarga: string
  dataSaida: string
  horaSaida: string
  responsavel: string
  status: string
  rotas: number
  notas: number
}

export const cargasData: CargaMock[] = [
  {
    id: '1',
    numeroCarga: 'CAR-001',
    dataSaida: '30/03/2026',
    horaSaida: '08:00',
    responsavel: 'José Dias',
    status: 'Em Andamento',
    rotas: 3,
    notas: 12,
  },
  {
    id: '2',
    numeroCarga: 'CAR-002',
    dataSaida: '30/03/2026',
    horaSaida: '09:30',
    responsavel: 'Maria Silva',
    status: 'Aberta',
    rotas: 2,
    notas: 8,
  },
  {
    id: '3',
    numeroCarga: 'CAR-003',
    dataSaida: '29/03/2026',
    horaSaida: '07:00',
    responsavel: 'João Santos',
    status: 'Finalizada',
    rotas: 4,
    notas: 15,
  },
  {
    id: '4',
    numeroCarga: 'CAR-004',
    dataSaida: '29/03/2026',
    horaSaida: '10:00',
    responsavel: 'Pedro Costa',
    status: 'Finalizada',
    rotas: 2,
    notas: 6,
  },
  {
    id: '5',
    numeroCarga: 'CAR-005',
    dataSaida: '28/03/2026',
    horaSaida: '08:30',
    responsavel: 'Ana Oliveira',
    status: 'Finalizada',
    rotas: 3,
    notas: 10,
  },
]
