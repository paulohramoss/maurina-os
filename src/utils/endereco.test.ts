import { describe, expect, it } from 'vitest'
import {
  cepValido,
  enderecoPreenchido,
  formatarEndereco,
  mascaraCep,
  ENDERECO_VAZIO,
} from './endereco'

describe('mascaraCep', () => {
  it('põe o hífen a partir do sexto dígito', () => {
    expect(mascaraCep('01310100')).toBe('01310-100')
  })

  it('não inventa hífen enquanto o CEP está incompleto', () => {
    expect(mascaraCep('013')).toBe('013')
    expect(mascaraCep('01310')).toBe('01310')
  })

  it('descarta o que não é dígito e o que passa de 8', () => {
    expect(mascaraCep('01310-100999')).toBe('01310-100')
    expect(mascaraCep('abc01310100')).toBe('01310-100')
  })
})

describe('cepValido', () => {
  it('aceita vazio — o campo é opcional', () => {
    expect(cepValido('')).toBe(true)
  })

  it('recusa CEP pela metade', () => {
    expect(cepValido('01310')).toBe(false)
  })

  it('aceita 8 dígitos, com ou sem máscara', () => {
    expect(cepValido('01310100')).toBe(true)
    expect(cepValido('01310-100')).toBe(true)
  })
})

describe('enderecoPreenchido', () => {
  it('formulário em branco não vira endereço', () => {
    expect(enderecoPreenchido(ENDERECO_VAZIO)).toBe(false)
    expect(enderecoPreenchido(undefined)).toBe(false)
    expect(enderecoPreenchido({ ...ENDERECO_VAZIO, cidade: '   ' })).toBe(false)
  })

  it('um campo preenchido já conta', () => {
    expect(enderecoPreenchido({ ...ENDERECO_VAZIO, cidade: 'Campinas' })).toBe(true)
  })
})

describe('formatarEndereco', () => {
  it('monta a linha completa', () => {
    expect(
      formatarEndereco({
        cep: '13010000',
        rua: 'Rua das Flores',
        numero: '120',
        bairro: 'Centro',
        cidade: 'Campinas',
        uf: 'SP',
      }),
    ).toBe('Rua das Flores, 120 — Centro, Campinas/SP')
  })

  it('inclui o complemento quando existe', () => {
    expect(
      formatarEndereco({
        cep: '',
        rua: 'Rua das Flores',
        numero: '120',
        complemento: 'Fundos',
        bairro: 'Centro',
        cidade: 'Campinas',
        uf: 'SP',
      }),
    ).toBe('Rua das Flores, 120 — Fundos — Centro, Campinas/SP')
  })

  it('pula o que não foi preenchido, sem vírgula solta', () => {
    expect(formatarEndereco({ ...ENDERECO_VAZIO, cidade: 'Campinas', uf: 'SP' })).toBe(
      'Campinas/SP',
    )
    expect(formatarEndereco({ ...ENDERECO_VAZIO, rua: 'Rua das Flores' })).toBe('Rua das Flores')
    expect(formatarEndereco(undefined)).toBe('')
  })
})
