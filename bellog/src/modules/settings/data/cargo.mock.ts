export interface CargoMock {
  id: string
  name: string
  status: string
}

export const cargoData: CargoMock[] = [
  {
    id: '1',
    name: 'Administrador',
    status: 'Ativo',
  },
  {
    id: '2',
    name: 'Gerente',
    status: 'Ativo',
  },
  {
    id: '3',
    name: 'Motorista',
    status: 'Ativo',
  },
  {
    id: '4',
    name: 'Auxiliar',
    status: 'Inativo',
  },
  {
    id: '5',
    name: 'Coordenador',
    status: 'Ativo',
  },
]
