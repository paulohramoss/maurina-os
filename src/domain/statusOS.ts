import type { OrdemServico, StatusOS } from '@/types'
import { coresStatus } from '@/theme'

/**
 * Máquina de estados da OS.
 *
 * Não existe "mudar status" livre: só transição declarada aqui.
 * Isso é o que impede um carro de ser entregue sem passar por pronto,
 * ou uma OS cancelada de voltar à vida sem ninguém saber.
 */

export const TRANSICOES: Record<StatusOS, readonly StatusOS[]> = {
  orcamento: ['aguardando_aprovacao', 'aprovada', 'cancelada'],
  aguardando_aprovacao: ['aprovada', 'orcamento', 'cancelada'],
  aprovada: ['em_execucao', 'cancelada'],
  em_execucao: ['aguardando_peca', 'pronta', 'cancelada'],
  aguardando_peca: ['em_execucao', 'cancelada'],
  // Voltou com problema? Reabre. Melhor que abrir OS nova e perder o rastro.
  pronta: ['entregue', 'em_execucao'],
  entregue: [],
  cancelada: [],
} as const

export const STATUS_TERMINAIS: readonly StatusOS[] = ['entregue', 'cancelada']

/** Status que contam como "carro no pátio". */
export const STATUS_NO_PATIO: readonly StatusOS[] = [
  'orcamento',
  'aguardando_aprovacao',
  'aprovada',
  'em_execucao',
  'aguardando_peca',
  'pronta',
]

/** Ordem de exibição no kanban e nos filtros. */
export const ORDEM_STATUS: readonly StatusOS[] = [
  'orcamento',
  'aguardando_aprovacao',
  'aprovada',
  'em_execucao',
  'aguardando_peca',
  'pronta',
  'entregue',
  'cancelada',
]

export function rotuloStatus(status: StatusOS): string {
  return coresStatus[status].rotulo
}

export function corStatus(status: StatusOS) {
  return coresStatus[status]
}

export function transicaoPermitida(de: StatusOS, para: StatusOS): boolean {
  return TRANSICOES[de].includes(para)
}

export function proximosStatus(de: StatusOS): readonly StatusOS[] {
  return TRANSICOES[de]
}

export function ehTerminal(status: StatusOS): boolean {
  return STATUS_TERMINAIS.includes(status)
}

/** Dados que a transição exige além do status em si. */
export interface DadosTransicao {
  motivo?: string
  kmSaida?: number
  dataSaida?: Date
  pagamentoDefinido?: boolean
}

export type ResultadoValidacao =
  | { ok: true }
  | { ok: false; erro: string; campo?: keyof DadosTransicao }

/**
 * Porteiro único de mudança de status. Toda tela e todo hook passa por aqui
 * antes de escrever no Firestore.
 */
export function validarTransicao(
  os: Pick<OrdemServico, 'status' | 'valorTotal' | 'pecas' | 'servicos'>,
  para: StatusOS,
  dados: DadosTransicao = {},
): ResultadoValidacao {
  const de = os.status

  if (de === para) {
    return { ok: false, erro: `A OS já está em "${rotuloStatus(para)}".` }
  }

  if (ehTerminal(de)) {
    return {
      ok: false,
      erro: `OS ${rotuloStatus(de).toLowerCase()} não muda mais de status.`,
    }
  }

  if (!transicaoPermitida(de, para)) {
    return {
      ok: false,
      erro: `Não dá para ir de "${rotuloStatus(de)}" para "${rotuloStatus(para)}".`,
    }
  }

  if (para === 'cancelada') {
    const motivo = dados.motivo?.trim() ?? ''
    if (motivo.length < 3) {
      return { ok: false, erro: 'Informe o motivo do cancelamento.', campo: 'motivo' }
    }
  }

  if (para === 'aguardando_aprovacao' || para === 'aprovada') {
    if (os.pecas.length === 0 && os.servicos.length === 0) {
      return {
        ok: false,
        erro: 'Lance ao menos uma peça ou serviço antes de mandar aprovar.',
      }
    }
  }

  if (para === 'entregue') {
    if (dados.kmSaida == null || dados.kmSaida <= 0) {
      return { ok: false, erro: 'Informe o KM de saída do veículo.', campo: 'kmSaida' }
    }
    if (!dados.dataSaida) {
      return { ok: false, erro: 'Informe a data de saída.', campo: 'dataSaida' }
    }
    if (!dados.pagamentoDefinido) {
      return {
        ok: false,
        erro: 'Defina a situação do pagamento antes de entregar o carro.',
        campo: 'pagamentoDefinido',
      }
    }
  }

  return { ok: true }
}
