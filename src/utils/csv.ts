/**
 * Exportação para CSV.
 *
 * Separador ponto-e-vírgula e decimal com vírgula: é o que o Excel em
 * português abre sem pedir nada. Vírgula como separador faria a planilha
 * chegar tudo numa coluna só, e aí ninguém usa.
 */

type Valor = string | number | boolean | null | undefined

export function paraCSV(linhas: Record<string, Valor>[]): string {
  if (linhas.length === 0) return ''

  const colunas = Object.keys(linhas[0] as Record<string, Valor>)
  const cabecalho = colunas.map(escapar).join(';')
  const corpo = linhas.map((linha) => colunas.map((c) => escapar(linha[c])).join(';'))

  return [cabecalho, ...corpo].join('\r\n')
}

function escapar(valor: Valor): string {
  if (valor == null) return ''

  if (typeof valor === 'number') {
    // Decimal com vírgula, como o Excel pt-BR espera.
    return String(valor).replace('.', ',')
  }

  const texto = String(valor)
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Monta o arquivo e dispara o download no navegador. */
export function exportarCSV(nomeBase: string, linhas: Record<string, Valor>[]): void {
  if (linhas.length === 0) return

  // BOM na frente: sem ele o Excel abre "Manutenção" como "ManutenÃ§Ã£o".
  const conteudo = '﻿' + paraCSV(linhas)
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${nomeBase}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
