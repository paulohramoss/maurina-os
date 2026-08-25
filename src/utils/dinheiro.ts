import type { BasisPoints, Centavos } from '@/types'

/**
 * Dinheiro no sistema é SEMPRE inteiro em centavos.
 * Nada de float — 0.1 + 0.2 não pode virar uma discussão com o cliente no balcão.
 * Este arquivo é a única porta de entrada e saída do formato de exibição.
 */

const formatador = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatadorSemSimbolo = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 154990 → "R$ 1.549,90" */
export function formatarMoeda(centavos: Centavos): string {
  return formatador.format(arredondar(centavos) / 100)
}

/** 154990 → "1.549,90" (para dentro de inputs e da OS impressa) */
export function formatarMoedaSemSimbolo(centavos: Centavos): string {
  return formatadorSemSimbolo.format(arredondar(centavos) / 100)
}

/**
 * Lê o que o atendente digitou e devolve centavos.
 * Aceita "1549,90", "1.549,90", "R$ 1.549,90", "1549.90" e "154990" (digitação contínua).
 */
export function paraCentavos(entrada: string | number): Centavos {
  if (typeof entrada === 'number') return arredondar(entrada * 100)

  const limpo = entrada.replace(/[^\d,.-]/g, '').trim()
  if (limpo === '' || limpo === '-') return 0

  const negativo = limpo.startsWith('-')
  const semSinal = limpo.replace(/-/g, '')

  // Descobre qual é o separador decimal: o último que aparecer.
  const ultimaVirgula = semSinal.lastIndexOf(',')
  const ultimoPonto = semSinal.lastIndexOf('.')
  const posDecimal = Math.max(ultimaVirgula, ultimoPonto)

  let inteiros: string
  let decimais: string

  if (posDecimal === -1) {
    inteiros = semSinal
    decimais = '00'
  } else {
    inteiros = semSinal.slice(0, posDecimal).replace(/[.,]/g, '')
    decimais = semSinal.slice(posDecimal + 1).replace(/[.,]/g, '')
  }

  const centavos =
    Number(inteiros || '0') * 100 + Number(decimais.padEnd(2, '0').slice(0, 2) || '0')

  return negativo ? -centavos : centavos
}

/**
 * Máscara de digitação contínua: cada dígito empurra a vírgula.
 * Digitar "1", "5", "0" vira "0,01" → "0,15" → "1,50".
 */
export function mascaraMoeda(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '')
  if (digitos === '') return ''
  return formatadorSemSimbolo.format(Number(digitos) / 100)
}

/** quantidade × unitário, sempre inteiro. */
export function multiplicar(quantidade: number, valorUnitario: Centavos): Centavos {
  return arredondar(quantidade * valorUnitario)
}

export function somar(...valores: Centavos[]): Centavos {
  return valores.reduce((total, v) => total + arredondar(v), 0)
}

/**
 * Aplica um percentual em basis points sobre um valor em centavos.
 * aplicarPercentual(10000, 1250) → 1250  (12,50% de R$ 100,00 = R$ 12,50)
 */
export function aplicarPercentual(valor: Centavos, bps: BasisPoints): Centavos {
  return arredondar((valor * bps) / 10000)
}

/** 1250 → "12,5%" */
export function formatarPercentual(bps: BasisPoints): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(bps / 100)}%`
}

/** "12,5" → 1250 */
export function paraBasisPoints(entrada: string | number): BasisPoints {
  if (typeof entrada === 'number') return Math.round(entrada * 100)
  const normalizado = entrada.replace(/[^\d,.-]/g, '').replace(',', '.')
  const numero = Number(normalizado)
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0
}

/** Arredondamento meio-para-cima, estável para negativos. */
function arredondar(valor: number): number {
  return Math.round(valor)
}
