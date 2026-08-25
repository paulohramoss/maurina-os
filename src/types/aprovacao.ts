import type { Timestamp } from 'firebase/firestore'
import type { Centavos, ItemPeca, ItemServico } from './index'

/**
 * Link público de aprovação de orçamento.
 *
 * Vive numa coleção raiz (`/aprovacoes/{token}`), fora da árvore da oficina,
 * porque é o único documento do sistema que alguém sem login precisa abrir.
 *
 * Carrega uma CÓPIA do orçamento, não uma referência: o cliente não pode ter
 * permissão de ler a OS inteira (que tem observação interna, custo de peça e
 * telefone de outros clientes na mesma coleção). O que ele vê é só isto aqui.
 */
export interface LinkAprovacao {
  /** O próprio id do documento é o token do link. */
  id: string
  oficinaId: string
  osId: string
  osNumero: string

  /** Cópia enxuta, só o que o cliente precisa ver para decidir. */
  nomeOficina: string
  telefoneOficina?: string
  nomeCliente: string
  veiculo: string
  placa: string
  reclamacao: string
  diagnostico?: string
  pecas: ItemPublicoOrcamento[]
  servicos: ItemPublicoOrcamento[]
  subtotalPecas: Centavos
  subtotalServicos: Centavos
  descontoValor: Centavos
  acrescimo: Centavos
  valorTotal: Centavos
  fotos: string[]
  garantiaMeses: number

  criadoEm: Timestamp
  expiraEm: Timestamp
  /** Balcão desliga o link quando o orçamento muda ou já foi aprovado ali mesmo. */
  cancelado: boolean

  resposta: 'aprovado' | 'recusado' | null
  respondidoPor: string | null
  respondidoEm: Timestamp | null
  observacaoCliente?: string
}

/** Item como o cliente vê: sem custo, sem fornecedor, sem código interno. */
export interface ItemPublicoOrcamento {
  descricao: string
  quantidade: number
  valorUnitario: Centavos
  valorTotal: Centavos
}

export function paraItemPublico(item: ItemPeca | ItemServico): ItemPublicoOrcamento {
  return {
    descricao: item.descricao,
    quantidade: item.quantidade,
    valorUnitario: item.valorUnitario,
    valorTotal: item.valorTotal,
  }
}
