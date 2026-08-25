/**
 * Placa é o atalho mais usado do sistema. Tem que aceitar os dois formatos
 * e guardar sempre normalizado, senão a busca por placa não acha nada.
 */

/** Antiga: ABC1234 */
const REGEX_ANTIGA = /^[A-Z]{3}\d{4}$/
/** Mercosul: ABC1D23 */
const REGEX_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/

export type FormatoPlaca = 'antiga' | 'mercosul' | 'invalida'

/** Maiúscula, sem hífen, sem espaço. É assim que vai pro Firestore. */
export function normalizarPlaca(entrada: string): string {
  return entrada
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7)
}

export function formatoPlaca(entrada: string): FormatoPlaca {
  const p = normalizarPlaca(entrada)
  if (REGEX_ANTIGA.test(p)) return 'antiga'
  if (REGEX_MERCOSUL.test(p)) return 'mercosul'
  return 'invalida'
}

export function placaValida(entrada: string): boolean {
  return formatoPlaca(entrada) !== 'invalida'
}

/** Exibição: "ABC-1234" na antiga, "ABC1D23" na Mercosul (que não usa hífen). */
export function formatarPlaca(entrada: string): string {
  const p = normalizarPlaca(entrada)
  if (formatoPlaca(p) === 'antiga') return `${p.slice(0, 3)}-${p.slice(3)}`
  return p
}

/**
 * Máscara durante a digitação: força letra nas posições de letra e dígito
 * nas de dígito, deixando a 5ª posição livre (é ela que separa os formatos).
 */
export function mascaraPlaca(entrada: string): string {
  const bruto = entrada.toUpperCase().replace(/[^A-Z0-9]/g, '')
  let saida = ''

  for (let i = 0; i < bruto.length && saida.length < 7; i++) {
    const c = bruto[i] as string
    const pos = saida.length
    const ehLetra = /[A-Z]/.test(c)
    const ehDigito = /\d/.test(c)

    if (pos <= 2 && ehLetra) saida += c
    else if (pos === 3 && ehDigito) saida += c
    else if (pos === 4 && (ehLetra || ehDigito)) saida += c
    else if (pos >= 5 && ehDigito) saida += c
  }

  return saida
}
