/**
 * Numeração sequencial da OS.
 *
 * Duas OS com o mesmo número é problema jurídico, não bug de tela.
 * Por isso o contador só é lido e escrito dentro de runTransaction —
 * a lógica pura fica aqui, a transação em `hooks/useOrdemServico`.
 */

/** Zero-padding de 4: 42 → "0042". A partir de 10.000 cresce naturalmente. */
export function formatarNumeroOS(ano: number, sequencial: number): string {
  return `${ano}-${String(sequencial).padStart(4, '0')}`
}

export interface EstadoContador {
  contadorOS: number
  anoContador: number
}

export interface ProximoNumero {
  numero: string
  /** Novo estado do contador, para gravar dentro da mesma transação. */
  estado: EstadoContador
}

/**
 * Decide o próximo número. Virou o ano, o contador zera:
 * a última de 2026 é 2026-0231 e a primeira de 2027 é 2027-0001.
 */
export function proximoNumeroOS(
  estadoAtual: EstadoContador | null,
  agora: Date = new Date(),
): ProximoNumero {
  const ano = agora.getFullYear()
  const mesmoAno = estadoAtual != null && estadoAtual.anoContador === ano
  const sequencial = mesmoAno ? estadoAtual.contadorOS + 1 : 1

  return {
    numero: formatarNumeroOS(ano, sequencial),
    estado: { contadorOS: sequencial, anoContador: ano },
  }
}

/** "2026-0042" → { ano: 2026, sequencial: 42 } */
export function lerNumeroOS(numero: string): { ano: number; sequencial: number } | null {
  const m = /^(\d{4})-(\d+)$/.exec(numero)
  if (!m) return null
  return { ano: Number(m[1]), sequencial: Number(m[2]) }
}
