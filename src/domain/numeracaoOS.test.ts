import { describe, expect, it } from 'vitest'
import { formatarNumeroOS, lerNumeroOS, proximoNumeroOS } from './numeracaoOS'

describe('numeração da OS', () => {
  it('formata com zero à esquerda', () => {
    expect(formatarNumeroOS(2026, 42)).toBe('2026-0042')
    expect(formatarNumeroOS(2026, 1)).toBe('2026-0001')
    expect(formatarNumeroOS(2026, 12345)).toBe('2026-12345')
  })

  it('começa em 1 quando a oficina ainda não tem contador', () => {
    const r = proximoNumeroOS(null, new Date(2026, 7, 24))
    expect(r.numero).toBe('2026-0001')
    expect(r.estado).toEqual({ contadorOS: 1, anoContador: 2026 })
  })

  it('incrementa dentro do mesmo ano', () => {
    const r = proximoNumeroOS({ contadorOS: 231, anoContador: 2026 }, new Date(2026, 11, 31))
    expect(r.numero).toBe('2026-0232')
  })

  it('zera o contador na virada do ano', () => {
    const r = proximoNumeroOS({ contadorOS: 231, anoContador: 2026 }, new Date(2027, 0, 1))
    expect(r.numero).toBe('2027-0001')
    expect(r.estado.anoContador).toBe(2027)
  })

  it('lê o número de volta', () => {
    expect(lerNumeroOS('2026-0042')).toEqual({ ano: 2026, sequencial: 42 })
    expect(lerNumeroOS('sem-numero')).toBeNull()
  })
})
