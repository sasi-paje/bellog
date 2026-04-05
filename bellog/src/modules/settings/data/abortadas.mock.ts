export interface AbortadaMock {
  id: string
  motivo: string
  status: string
}

export const abortadasData: AbortadaMock[] = [
  {
    id: '1',
    motivo: 'Problema mecânico no veículo',
    status: 'Ativo',
  },
  {
    id: '2',
    motivo: 'Problema físico na empresa',
    status: 'Ativo',
  },
  {
    id: '3',
    motivo: 'Falta de acesso ao local',
    status: 'Ativo',
  },
  {
    id: '4',
    motivo: 'Cliente não atende',
    status: 'Inativo',
  },
  {
    id: '5',
    motivo: 'Carga danificada',
    status: 'Ativo',
  },
]
