import { describe, expect, it } from 'vitest'
import { calcularTotais, comTotaisRecalculados, saldoDevedor } from './calculoOS'
import type { Desconto, ItemPeca, ItemServico } from '@/types'

const peca = (quantidade: number, valorUnitario: number) => ({ quantidade, valorUnitario })
const servico = peca

describe('calcularTotais', () => {
  it('soma peças e serviços', () => {
    const t = calcularTotais([peca(2, 15000), peca(1, 8990)], [servico(1, 12000)])
    expect(t.subtotalPecas).toBe(38990)
    expect(t.subtotalServicos).toBe(12000)
    expect(t.valorTotal).toBe(50990)
  })

  it('aplica desconto em valor', () => {
    const desconto: Desconto = { tipo: 'valor', valor: 5000 }
    const t = calcularTotais([peca(1, 20000)], [servico(1, 10000)], desconto)
    expect(t.descontoValor).toBe(5000)
    expect(t.valorTotal).toBe(25000)
  })

  it('aplica desconto percentual sobre o subtotal geral', () => {
    // 10% de (R$ 200 peças + R$ 100 serviços) = R$ 30
    const desconto: Desconto = { tipo: 'percentual', valor: 1000 }
    const t = calcularTotais([peca(1, 20000)], [servico(1, 10000)], desconto)
    expect(t.descontoValor).toBe(3000)
    expect(t.valorTotal).toBe(27000)
  })

  it('arredonda percentual quebrado sem perder centavo em float', () => {
    // 12,5% de R$ 133,33 = R$ 16,66625 → 1667 centavos
    const desconto: Desconto = { tipo: 'percentual', valor: 1250 }
    const t = calcularTotais([peca(1, 13333)], [], desconto)
    expect(t.descontoValor).toBe(1667)
    expect(Number.isInteger(t.valorTotal)).toBe(true)
  })

  it('não deixa a OS ficar negativa com desconto maior que o total', () => {
    const desconto: Desconto = { tipo: 'valor', valor: 99999 }
    const t = calcularTotais([peca(1, 10000)], [], desconto)
    expect(t.descontoValor).toBe(10000)
    expect(t.valorTotal).toBe(0)
  })

  it('soma acréscimo depois do desconto', () => {
    const t = calcularTotais([peca(1, 10000)], [], { tipo: 'valor', valor: 2000 }, 500)
    expect(t.valorTotal).toBe(8500)
  })

  it('devolve zero para OS vazia', () => {
    const t = calcularTotais([], [])
    expect(t.valorTotal).toBe(0)
    expect(t.bruto).toBe(0)
  })
})

describe('comTotaisRecalculados', () => {
  it('ignora o total que veio do formulário e recalcula item a item', () => {
    const pecas: ItemPeca[] = [
      { id: '1', descricao: 'Pastilha', quantidade: 2, valorUnitario: 8000, valorTotal: 999999, aplicada: false },
    ]
    const servicos: ItemServico[] = [
      { id: '2', descricao: 'Troca', quantidade: 1, valorUnitario: 5000, valorTotal: 0, concluido: false },
    ]

    const resultado = comTotaisRecalculados({
      pecas,
      servicos,
      desconto: { tipo: 'valor', valor: 0 },
      acrescimo: 0,
    })

    expect(resultado.pecas[0]?.valorTotal).toBe(16000)
    expect(resultado.servicos[0]?.valorTotal).toBe(5000)
    expect(resultado.valorTotal).toBe(21000)
  })
})

describe('saldoDevedor', () => {
  it('desconta o que já foi pago', () => {
    expect(saldoDevedor(50000, 20000)).toBe(30000)
  })

  it('não devolve saldo negativo quando pagam a mais', () => {
    expect(saldoDevedor(50000, 60000)).toBe(0)
  })
})
