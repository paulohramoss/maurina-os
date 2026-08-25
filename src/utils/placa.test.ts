import { describe, expect, it } from 'vitest'
import { formatarPlaca, formatoPlaca, mascaraPlaca, normalizarPlaca, placaValida } from './placa'

describe('normalização', () => {
  it('tira hífen, espaço e minúscula', () => {
    expect(normalizarPlaca('abc-1234')).toBe('ABC1234')
    expect(normalizarPlaca(' abc 1d23 ')).toBe('ABC1D23')
  })

  it('corta o excesso em 7 caracteres', () => {
    expect(normalizarPlaca('ABC1234567')).toBe('ABC1234')
  })
})

describe('validação', () => {
  it('aceita o formato antigo', () => {
    expect(placaValida('ABC1234')).toBe(true)
    expect(formatoPlaca('abc-1234')).toBe('antiga')
  })

  it('aceita o formato Mercosul', () => {
    expect(placaValida('ABC1D23')).toBe(true)
    expect(formatoPlaca('ABC1D23')).toBe('mercosul')
  })

  it('recusa placa incompleta ou fora de padrão', () => {
    expect(placaValida('ABC123')).toBe(false)
    expect(placaValida('AB12345')).toBe(false)
    expect(placaValida('ABCD123')).toBe(false)
    expect(placaValida('')).toBe(false)
  })
})

describe('exibição', () => {
  it('põe hífen só na antiga', () => {
    expect(formatarPlaca('ABC1234')).toBe('ABC-1234')
    expect(formatarPlaca('ABC1D23')).toBe('ABC1D23')
  })
})

describe('máscara de digitação', () => {
  it('força letra nas três primeiras e dígito na quarta', () => {
    expect(mascaraPlaca('abc1')).toBe('ABC1')
    // Caractere fora de padrão é descartado e a digitação continua:
    // o "1" não cabe na 3ª posição (é de letra), então some e o "c" assume.
    expect(mascaraPlaca('ab1c')).toBe('ABC')
    expect(mascaraPlaca('abca')).toBe('ABC')
  })

  it('deixa a quinta posição livre para os dois formatos', () => {
    expect(mascaraPlaca('abc1d23')).toBe('ABC1D23')
    expect(mascaraPlaca('abc1234')).toBe('ABC1234')
  })

  it('ignora o que passa de 7', () => {
    expect(mascaraPlaca('ABC12345')).toBe('ABC1234')
  })
})
