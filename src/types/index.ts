import type { Timestamp } from 'firebase/firestore'

/* ------------------------------------------------------------------ */
/* Base                                                                */
/* ------------------------------------------------------------------ */

/** Todo dinheiro no sistema é inteiro, em CENTAVOS. Nunca float. */
export type Centavos = number

/** Percentual em basis points: 1250 = 12,50%. Também inteiro. */
export type BasisPoints = number

/** Campos de auditoria presentes em todo documento. */
export interface Auditoria {
  criadoEm: Timestamp
  atualizadoEm: Timestamp
  criadoPor: string
  /** Soft delete: nada some do banco. */
  excluidoEm: Timestamp | null
}

/* ------------------------------------------------------------------ */
/* Usuários e oficina                                                  */
/* ------------------------------------------------------------------ */

export type Papel = 'admin' | 'atendente' | 'mecanico'

export interface Usuario extends Auditoria {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
}

/** Índice raiz consultado no login, antes de saber a oficina. */
export interface UsuarioIndex {
  oficinaId: string
  papel: Papel
  ativo: boolean
}

/**
 * Mecânico do pátio. Não é usuário do Auth — a oficina usa um login
 * compartilhado no celular/tablet e escolhe quem está executando.
 */
export interface Mecanico extends Auditoria {
  id: string
  nome: string
  apelido?: string
  ativo: boolean
}

export interface ConfigOficina {
  nome: string
  cnpj?: string
  telefone?: string
  whatsapp?: string
  email?: string
  endereco?: Endereco
  logoUrl?: string
  /** Termos de garantia impressos na via do cliente. */
  termos?: string
  /** Contador sequencial da OS — escrito SOMENTE via runTransaction. */
  contadorOS: number
  /** Ano do contador. Vira o ano => contador zera. */
  anoContador: number
  /** Padrão de revisão: km rodados até a próxima. */
  revisaoPadraoKm: number
  /** Padrão de revisão: meses até a próxima. */
  revisaoPadraoMeses: number
  /** Garantia padrão do serviço, em meses. */
  garantiaPadraoMeses: number
}

/* ------------------------------------------------------------------ */
/* Cliente                                                             */
/* ------------------------------------------------------------------ */

export type TipoPessoa = 'PF' | 'PJ'

export interface Endereco {
  cep: string
  rua: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

export interface Cliente extends Auditoria {
  id: string
  nome: string
  tipo: TipoPessoa
  cpfCnpj?: string
  /** Só dígitos. */
  telefone: string
  /** Só dígitos. Normalmente igual ao telefone. */
  whatsapp: string
  email?: string
  endereco?: Endereco
  observacoes?: string
  /** Busca case-insensitive: nome em minúsculas sem acento. */
  nomeBusca: string
}

/* ------------------------------------------------------------------ */
/* Veículo                                                             */
/* ------------------------------------------------------------------ */

export type Combustivel =
  | 'flex'
  | 'gasolina'
  | 'etanol'
  | 'diesel'
  | 'gnv'
  | 'eletrico'
  | 'hibrido'

export interface Veiculo extends Auditoria {
  id: string
  clienteId: string
  /** Normalizada: maiúscula, sem hífen. Aceita ABC1234 e ABC1D23. */
  placa: string
  marca: string
  modelo: string
  anoFabricacao: number
  anoModelo: number
  cor: string
  combustivel: Combustivel
  chassi?: string
  renavam?: string
  motor?: string
  kmAtual: number
  proximaRevisaoKm?: number
  proximaRevisaoData?: Timestamp
  observacoes?: string
}

/* ------------------------------------------------------------------ */
/* Ordem de serviço                                                    */
/* ------------------------------------------------------------------ */

export type StatusOS =
  | 'orcamento'
  | 'aguardando_aprovacao'
  | 'aprovada'
  | 'em_execucao'
  | 'aguardando_peca'
  | 'pronta'
  | 'entregue'
  | 'cancelada'

/** 0 = vazio, 4 = cheio. */
export type NivelCombustivel = 0 | 1 | 2 | 3 | 4

export interface ChecklistItens {
  estepe: boolean
  macaco: boolean
  chaveRoda: boolean
  triangulo: boolean
  documentos: boolean
  tapetes: boolean
  radio: boolean
  calotas: boolean
}

export interface ChecklistEntrada {
  itens: ChecklistItens
  /** Ex.: "risco na porta dianteira esquerda". */
  avarias: string[]
  /** URLs no Storage. */
  fotos: string[]
}

export interface ItemPeca {
  id: string
  codigo?: string
  descricao: string
  quantidade: number
  valorUnitario: Centavos
  valorTotal: Centavos
  fornecedor?: string
  garantiaMeses?: number
  /** Marcada pelo mecânico quando a peça foi de fato aplicada no carro. */
  aplicada: boolean
}

export interface ItemServico {
  id: string
  descricao: string
  quantidade: number
  valorUnitario: Centavos
  valorTotal: Centavos
  mecanicoId?: string
  concluido: boolean
}

export interface Desconto {
  tipo: 'valor' | 'percentual'
  /** Centavos quando tipo='valor'; basis points quando tipo='percentual'. */
  valor: Centavos | BasisPoints
}

export type CanalAprovacao = 'presencial' | 'whatsapp' | 'telefone' | 'link'

export interface Aprovacao {
  aprovadoPor: string
  canal: CanalAprovacao
  assinaturaBase64?: string
  aprovadoEm: Timestamp
  /** Registrado quando a aprovação vem pelo link público. */
  ip?: string
}

export type StatusPagamento = 'pendente' | 'parcial' | 'pago'

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'debito'
  | 'credito'
  | 'boleto'
  | 'prazo'

export interface PagamentoOS {
  status: StatusPagamento
  forma?: FormaPagamento
  parcelas?: number
  valorPago: Centavos
  dataPagamento?: Timestamp
  /** Número da nota digitado à mão. Sem integração com SEFAZ. */
  numeroNota?: string
}

/** Snapshot congelado no momento da abertura — a OS não muda se o cadastro mudar. */
export interface SnapshotCliente {
  nome: string
  telefone: string
  cpfCnpj?: string
  /** Endereço como estava na abertura. OS antiga não tem: a via impressa cai no cadastro atual. */
  endereco?: Endereco
}

export interface SnapshotVeiculo {
  placa: string
  marca: string
  modelo: string
  anoModelo: number
  cor: string
}

export interface OrdemServico extends Auditoria {
  id: string
  /** Sequencial por oficina, reinicia por ano: "2026-0042". */
  numero: string
  clienteId: string
  veiculoId: string
  snapshotCliente: SnapshotCliente
  snapshotVeiculo: SnapshotVeiculo

  status: StatusOS

  dataEntrada: Timestamp
  previsaoEntrega?: Timestamp
  dataSaida?: Timestamp
  kmEntrada: number
  kmSaida?: number
  nivelCombustivel: NivelCombustivel

  checklistEntrada: ChecklistEntrada

  /** O que o cliente falou, na língua dele. */
  reclamacaoCliente: string
  /** O que o mecânico achou. */
  diagnostico?: string
  mecanicoResponsavelId?: string

  /** Fotos tiradas durante o serviço — o "antes e depois" que se mostra ao cliente. */
  fotosExecucao?: string[]

  pecas: ItemPeca[]
  servicos: ItemServico[]

  subtotalPecas: Centavos
  subtotalServicos: Centavos
  desconto: Desconto
  acrescimo?: Centavos
  valorTotal: Centavos

  /** Token do link público de aprovação em aberto. Vazio = nenhum link ativo. */
  tokenAprovacao?: string

  aprovacao?: Aprovacao
  pagamento?: PagamentoOS

  garantiaServicoMeses?: number
  garantiaServicoKm?: number
  /** Nunca sai na via do cliente. */
  observacoesInternas?: string

  /** Motivo obrigatório quando status = 'cancelada'. */
  motivoCancelamento?: string
}

/** Evento da timeline em /ordens/{id}/historico. */
export interface EventoHistorico {
  id: string
  tipo: 'status' | 'criacao' | 'edicao' | 'aprovacao' | 'pagamento' | 'foto'
  de?: StatusOS
  para?: StatusOS
  observacao?: string
  /** UID do Auth. No pátio é o login compartilhado. */
  autorId: string
  /** Nome de quem agiu — mecânico escolhido na lista, ou nome do usuário. */
  autorNome: string
  em: Timestamp
}

/* ------------------------------------------------------------------ */
/* Catálogo e pagamentos                                               */
/* ------------------------------------------------------------------ */

export interface ItemCatalogoPeca extends Auditoria {
  id: string
  codigo?: string
  descricao: string
  valorPadrao: Centavos
  fornecedor?: string
  garantiaMeses?: number
  ativo: boolean
}

export interface ItemCatalogoServico extends Auditoria {
  id: string
  descricao: string
  valorPadrao: Centavos
  tempoEstimadoMin?: number
  ativo: boolean
}

export interface Pagamento extends Auditoria {
  id: string
  osId: string
  osNumero: string
  clienteId: string
  valor: Centavos
  forma: FormaPagamento
  parcelas?: number
  recebidoEm: Timestamp
  observacao?: string
}
