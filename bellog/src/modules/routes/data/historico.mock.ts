export interface HistoricoItem {
  id: string
  tipo: 'rota-criada' | 'em-rota' | 'entrega-parcial' | 'entrega-total' | 'rota-finalizada'
  titulo: string
  subtitulo?: string
  data: string
  hora: string
  local?: string
  hasDetail: boolean
  detail?: OccurrenceDetail
}

export interface OccurrenceDetail {
  id: string
  titulo: string
  local: string
  notas: string[]
  observacao: string
  anexos: Anexo[]
}

export interface Anexo {
  id: string
  nome: string
  tipo: 'imagem' | 'documento'
}

export const historicoData: HistoricoItem[] = [
  {
    id: '1',
    tipo: 'rota-criada',
    titulo: 'ROTA CRIADA',
    data: '01/01/2025',
    hora: '08:00',
    hasDetail: false,
  },
  {
    id: '2',
    tipo: 'em-rota',
    titulo: 'EM ROTA DE ENTREGA',
    data: '01/01/2025',
    hora: '09:15',
    hasDetail: false,
  },
  {
    id: '3',
    tipo: 'entrega-total',
    titulo: 'ENTREGA TOTAL',
    subtitulo: 'em',
    local: 'Galpão A1',
    data: '01/01/2025',
    hora: '09:15',
    hasDetail: true,
    detail: {
      id: 'd1',
      titulo: 'ENTREGA TOTAL',
      local: 'Empresa A1',
      notas: ['NF 12345', 'NF 12346', 'NF 12347'],
      observacao: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam rhoncus nulla eget velit pretium cursus. Praesent nec augue justo. Vivamus velit libero, hendrerit eget diam ac, pharetra facilisis sapien. Nunc imperdiet nulla eu quam ultricies, in varius mauris hendrerit. In at mollis eros. Nunc vel tempor nulla. Suspendisse finibus, mauris quis fermentum cursus, magna velit ullamcorper dolor, non aliquam ligula eros sed felis.',
      anexos: [
        { id: 'a1', nome: 'Arquivo_Imagem_1.png', tipo: 'imagem' },
        { id: 'a2', nome: 'Documento_Entrega.pdf', tipo: 'documento' },
      ],
    },
  },
  {
    id: '4',
    tipo: 'entrega-total',
    titulo: 'ENTREGA TOTAL',
    subtitulo: 'em',
    local: 'Galpão B2',
    data: '01/01/2025',
    hora: '10:30',
    hasDetail: true,
    detail: {
      id: 'd2',
      titulo: 'ENTREGA TOTAL',
      local: 'Empresa B2',
      notas: ['NF 12348', 'NF 12349'],
      observacao: 'Entrega realizada com sucesso. Cliente confirmou recebimento.',
      anexos: [
        { id: 'a3', nome: 'Comprovante_B2.jpg', tipo: 'imagem' },
      ],
    },
  },
  {
    id: '5',
    tipo: 'rota-finalizada',
    titulo: 'ROTA FINALIZADA',
    data: '01/01/2025',
    hora: '12:00',
    hasDetail: false,
  },
]
