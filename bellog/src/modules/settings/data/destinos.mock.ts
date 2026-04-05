export interface DestinoMock {
  id: string
  razaoSocial: string
  rua: string
  cep: string
  bairro: string
  numero: string
  status: string
}

export const destinosData: DestinoMock[] = [
  {
    id: '1',
    razaoSocial: 'FCC do Brasil',
    rua: 'R. Mogno',
    cep: '69075-170',
    bairro: 'Distrito Industrial',
    numero: '11',
    status: 'Ativo',
  },
  {
    id: '2',
    razaoSocial: 'Grupo Boticário',
    rua: 'Av. das Indústrias',
    cep: '69075-170',
    bairro: 'Centro',
    numero: '22',
    status: 'Ativo',
  },
  {
    id: '3',
    razaoSocial: 'Vale S.A.',
    rua: 'R. do Ouro',
    cep: '69075-170',
    bairro: 'Minas Gerais',
    numero: '33',
    status: 'Ativo',
  },
  {
    id: '4',
    razaoSocial: 'Embraer',
    rua: 'R. das Nações',
    cep: '69075-170',
    bairro: 'São José dos Campos',
    numero: '44',
    status: 'Ativo',
  },
  {
    id: '5',
    razaoSocial: 'Petrobras',
    rua: 'Av. Paulista',
    cep: '01310-100',
    bairro: 'Bela Vista',
    numero: '55',
    status: 'Inativo',
  },
]
