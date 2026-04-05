export interface RecusaMock {
  id: string
  motivo: string
  status: string
}

export const recusasData: RecusaMock[] = [
  {
    id: '1',
    motivo: 'Sem local pra guardar itens',
    status: 'Ativo',
  },
  {
    id: '2',
    motivo: 'Carga em condições não ideais',
    status: 'Ativo',
  },
  {
    id: '3',
    motivo: 'Veículo incompatível com a carga',
    status: 'Ativo',
  },
  {
    id: '4',
    motivo: 'Motorista sem documentação',
    status: 'Inativo',
  },
  {
    id: '5',
    motivo: 'Horario de coleta indisponível',
    status: 'Ativo',
  },
]
