export interface SupplierMock {
  id: string
  name: string
  cnpj: string
  phone: string
  email: string
  status: string
}

export const supplierData: SupplierMock[] = [
  {
    id: '1',
    name: 'Transportadora Alpha',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 99999-0001',
    email: 'contato@alpha.com.br',
    status: 'Ativo',
  },
  {
    id: '2',
    name: 'Logística Beta',
    cnpj: '23.456.789/0001-01',
    phone: '(11) 99999-0002',
    email: 'contato@beta.com.br',
    status: 'Ativo',
  },
  {
    id: '3',
    name: 'Distribuidora Gamma',
    cnpj: '34.567.890/0001-12',
    phone: '(11) 99999-0003',
    email: 'contato@gamma.com.br',
    status: 'Inativo',
  },
  {
    id: '4',
    name: 'Frete Delta',
    cnpj: '45.678.901/0001-23',
    phone: '(11) 99999-0004',
    email: 'contato@delta.com.br',
    status: 'Ativo',
  },
  {
    id: '5',
    name: 'Express Epsilon',
    cnpj: '56.789.012/0001-34',
    phone: '(11) 99999-0005',
    email: 'contato@epsilon.com.br',
    status: 'Ativo',
  },
]
