export interface MotoristaMock {
  id: string
  nome: string
  contato: string
  email: string
  status: string
}

export const motoristasData: MotoristaMock[] = [
  {
    id: '1',
    nome: 'João Silma Melo',
    contato: '(92)98822-4455',
    email: 'joao@gmail.com',
    status: 'Ativo',
  },
  {
    id: '2',
    nome: 'Miguel Simas Pereira',
    contato: '(92)98822-4455',
    email: 'miguel@gmail.com',
    status: 'Ativo',
  },
  {
    id: '3',
    nome: 'Carlos Alberto Santos',
    contato: '(92)98833-5566',
    email: 'carlos@gmail.com',
    status: 'Ativo',
  },
  {
    id: '4',
    nome: 'Roberto Silva',
    contato: '(92)98844-6677',
    email: 'roberto@gmail.com',
    status: 'Inativo',
  },
  {
    id: '5',
    nome: 'Paulo Oliveira',
    contato: '(92)98855-7788',
    email: 'paulo@gmail.com',
    status: 'Ativo',
  },
]
