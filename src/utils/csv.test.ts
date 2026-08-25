import { describe, expect, it } from 'vitest'
import { paraCSV } from './csv'

describe('paraCSV', () => {
  it('usa ponto-e-vírgula, que é o que o Excel pt-BR entende', () => {
    const csv = paraCSV([{ OS: '2026-0001', Cliente: 'João' }])
    expect(csv).toBe('OS;Cliente\r\n2026-0001;João')
  })

  it('escreve decimal com vírgula', () => {
    const csv = paraCSV([{ Valor: 1549.9 }])
    expect(csv).toContain('1549,9')
  })

  it('protege campo que contém o separador', () => {
    const csv = paraCSV([{ Obs: 'peça grande; entrega demorada' }])
    expect(csv).toContain('"peça grande; entrega demorada"')
  })

  it('duplica aspas dentro do campo', () => {
    const csv = paraCSV([{ Obs: 'cliente disse "tá batendo"' }])
    expect(csv).toContain('"cliente disse ""tá batendo"""')
  })

  it('trata nulo e indefinido como vazio', () => {
    const csv = paraCSV([{ A: null, B: undefined, C: 'ok' }])
    expect(csv).toBe('A;B;C\r\n;;ok')
  })

  it('devolve string vazia sem linhas', () => {
    expect(paraCSV([])).toBe('')
  })

  it('quebra de linha dentro do campo não parte a linha do CSV', () => {
    const csv = paraCSV([{ Obs: 'linha 1\nlinha 2' }])
    expect(csv.split('\r\n')).toHaveLength(2)
  })
})
