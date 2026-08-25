import { describe, expect, it } from 'vitest'
import {
  aplicarPercentual,
  formatarMoeda,
  mascaraMoeda,
  multiplicar,
  paraBasisPoints,
  paraCentavos,
  somar,
} from './dinheiro'

describe('formatarMoeda', () => {
  it('formata em real brasileiro', () => {
    expect(formatarMoeda(154990).replace(/ /g, ' ')).toBe('R$ 1.549,90')
    expect(formatarMoeda(0).replace(/ /g, ' ')).toBe('R$ 0,00')
    expect(formatarMoeda(5).replace(/ /g, ' ')).toBe('R$ 0,05')
  })
})

describe('paraCentavos', () => {
  it('lê os formatos que o atendente digita', () => {
    expect(paraCentavos('1549,90')).toBe(154990)
    expect(paraCentavos('1.549,90')).toBe(154990)
    expect(paraCentavos('R$ 1.549,90')).toBe(154990)
    expect(paraCentavos('1549.90')).toBe(154990)
    expect(paraCentavos('1549')).toBe(154900)
  })

  it('trata entrada vazia e lixo sem quebrar', () => {
    expect(paraCentavos('')).toBe(0)
    expect(paraCentavos('abc')).toBe(0)
    expect(paraCentavos('R$')).toBe(0)
  })

  it('completa centavo faltando', () => {
    expect(paraCentavos('10,5')).toBe(1050)
    expect(paraCentavos('10,')).toBe(1000)
  })

  it('devolve sempre inteiro', () => {
    expect(Number.isInteger(paraCentavos('0,07'))).toBe(true)
    expect(paraCentavos('0,07')).toBe(7)
  })
})

describe('máscara de digitação', () => {
  it('empurra a vírgula a cada dígito', () => {
    expect(mascaraMoeda('1')).toBe('0,01')
    expect(mascaraMoeda('15')).toBe('0,15')
    expect(mascaraMoeda('150')).toBe('1,50')
    expect(mascaraMoeda('154990')).toBe('1.549,90')
    expect(mascaraMoeda('')).toBe('')
  })
})

describe('aritmética em centavos', () => {
  it('não sofre com o clássico 0.1 + 0.2', () => {
    expect(somar(10, 20)).toBe(30)
    expect(multiplicar(3, 3333)).toBe(9999)
  })

  it('aplica percentual em basis points', () => {
    expect(aplicarPercentual(10000, 1250)).toBe(1250)
    expect(aplicarPercentual(13333, 1250)).toBe(1667)
    expect(Number.isInteger(aplicarPercentual(9999, 333))).toBe(true)
  })

  it('converte percentual digitado', () => {
    expect(paraBasisPoints('12,5')).toBe(1250)
    expect(paraBasisPoints('10')).toBe(1000)
    expect(paraBasisPoints(5)).toBe(500)
  })
})
