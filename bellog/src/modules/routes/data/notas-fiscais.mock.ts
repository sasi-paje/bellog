export interface NotaFiscal {
  id: string
  fornecedor: string
  destino: string
  numNF: string
  numCaixas: string
  pesoLiquido: string
  pesoBruto: string
  valorNF: string
  canhoto: string
  nfd: string
  status: string
  motivo: string
}

export const notasFiscaisData: NotaFiscal[] = [
  {
    id: '1',
    fornecedor: 'Empresa 123',
    destino: 'FBF do Brasil',
    numNF: '456372',
    numCaixas: '200',
    pesoLiquido: '2000',
    pesoBruto: '2500',
    valorNF: '10.000,00',
    canhoto: 'Aguardando',
    nfd: 'Aguardando',
    status: 'Aguardando',
    motivo: 'Aguardando',
  },
  {
    id: '2',
    fornecedor: 'Empresa 123',
    destino: 'FBF do Brasil',
    numNF: '2131231',
    numCaixas: '200',
    pesoLiquido: '2000',
    pesoBruto: '2500',
    valorNF: '10.000,00',
    canhoto: 'Aguardando',
    nfd: 'Aguardando',
    status: 'Aguardando',
    motivo: 'Aguardando',
  },
  {
    id: '3',
    fornecedor: 'Empresa 123',
    destino: 'FBF do Brasil',
    numNF: '2131231',
    numCaixas: '200',
    pesoLiquido: '2000',
    pesoBruto: '2500',
    valorNF: '10.000,00',
    canhoto: 'Aguardando',
    nfd: 'Aguardando',
    status: 'Aguardando',
    motivo: 'Aguardando',
  },
]