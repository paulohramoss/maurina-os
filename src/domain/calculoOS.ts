import type { Centavos, Desconto, ItemPeca, ItemServico, OrdemServico } from '@/types'
import { aplicarPercentual, multiplicar } from '@/utils/dinheiro'

/**
 * Cálculo dos valores da OS. Função pura: sem Firebase, sem React.
 * Roda no cliente ao editar E de novo no salvamento — os totais gravados
 * nunca são os que o formulário disse, são os que esta função disse.
 */

export interface TotaisOS {
  subtotalPecas: Centavos
  subtotalServicos: Centavos
  /** Peças + serviços, antes de desconto e acréscimo. */
  bruto: Centavos
  /** Desconto já convertido para centavos (mesmo quando é percentual). */
  descontoValor: Centavos
  acrescimo: Centavos
  valorTotal: Centavos
}

export const SEM_DESCONTO: Desconto = { tipo: 'valor', valor: 0 }

export function totalItemPeca(item: Pick<ItemPeca, 'quantidade' | 'valorUnitario'>): Centavos {
  return multiplicar(item.quantidade, item.valorUnitario)
}

export function totalItemServico(
  item: Pick<ItemServico, 'quantidade' | 'valorUnitario'>,
): Centavos {
  return multiplicar(item.quantidade, item.valorUnitario)
}

export function calcularTotais(
  pecas: readonly Pick<ItemPeca, 'quantidade' | 'valorUnitario'>[],
  servicos: readonly Pick<ItemServico, 'quantidade' | 'valorUnitario'>[],
  desconto: Desconto = SEM_DESCONTO,
  acrescimo: Centavos = 0,
): TotaisOS {
  const subtotalPecas = pecas.reduce((soma, p) => soma + totalItemPeca(p), 0)
  const subtotalServicos = servicos.reduce((soma, s) => soma + totalItemServico(s), 0)
  const bruto = subtotalPecas + subtotalServicos

  // Percentual incide sobre o subtotal GERAL (peças + serviços), não só na mão de obra.
  const descontoBruto =
    desconto.tipo === 'percentual' ? aplicarPercentual(bruto, desconto.valor) : desconto.valor

  // Desconto nunca passa do bruto: OS não fica negativa.
  const descontoValor = Math.max(0, Math.min(descontoBruto, bruto))
  const valorTotal = Math.max(0, bruto - descontoValor + Math.max(0, acrescimo))

  return {
    subtotalPecas,
    subtotalServicos,
    bruto,
    descontoValor,
    acrescimo: Math.max(0, acrescimo),
    valorTotal,
  }
}

/** Recalcula os campos monetários da OS antes de gravar. */
export function comTotaisRecalculados<
  T extends Pick<OrdemServico, 'pecas' | 'servicos' | 'desconto' | 'acrescimo'>,
>(os: T): T & Pick<OrdemServico, 'subtotalPecas' | 'subtotalServicos' | 'valorTotal'> {
  const totais = calcularTotais(os.pecas, os.servicos, os.desconto, os.acrescimo ?? 0)

  return {
    ...os,
    pecas: os.pecas.map((p) => ({ ...p, valorTotal: totalItemPeca(p) })),
    servicos: os.servicos.map((s) => ({ ...s, valorTotal: totalItemServico(s) })),
    subtotalPecas: totais.subtotalPecas,
    subtotalServicos: totais.subtotalServicos,
    valorTotal: totais.valorTotal,
  }
}

/** Quanto ainda falta receber. */
export function saldoDevedor(
  valorTotal: Centavos,
  valorPago: Centavos = 0,
): Centavos {
  return Math.max(0, valorTotal - valorPago)
}
