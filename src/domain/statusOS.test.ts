import { describe, expect, it } from 'vitest'
import { ehTerminal, proximosStatus, transicaoPermitida, validarTransicao } from './statusOS'
import type { OrdemServico, StatusOS } from '@/types'

const osBase = (status: StatusOS): Pick<OrdemServico, 'status' | 'valorTotal' | 'pecas' | 'servicos'> => ({
  status,
  valorTotal: 30000,
  pecas: [{ id: '1', descricao: 'Filtro', quantidade: 1, valorUnitario: 30000, valorTotal: 30000, aplicada: false }],
  servicos: [],
})

describe('transições', () => {
  it('permite o caminho normal da oficina', () => {
    expect(transicaoPermitida('orcamento', 'aguardando_aprovacao')).toBe(true)
    expect(transicaoPermitida('aguardando_aprovacao', 'aprovada')).toBe(true)
    expect(transicaoPermitida('aprovada', 'em_execucao')).toBe(true)
    expect(transicaoPermitida('em_execucao', 'pronta')).toBe(true)
    expect(transicaoPermitida('pronta', 'entregue')).toBe(true)
  })

  it('não deixa entregar carro que não ficou pronto', () => {
    expect(transicaoPermitida('em_execucao', 'entregue')).toBe(false)
    expect(transicaoPermitida('orcamento', 'entregue')).toBe(false)
    expect(transicaoPermitida('aprovada', 'entregue')).toBe(false)
  })

  it('trata entregue e cancelada como terminais', () => {
    expect(ehTerminal('entregue')).toBe(true)
    expect(ehTerminal('cancelada')).toBe(true)
    expect(proximosStatus('entregue')).toHaveLength(0)
    expect(proximosStatus('cancelada')).toHaveLength(0)
  })

  it('deixa reabrir OS pronta que voltou com problema', () => {
    expect(transicaoPermitida('pronta', 'em_execucao')).toBe(true)
  })
})

describe('validarTransicao', () => {
  it('recusa transição inválida com mensagem legível', () => {
    const r = validarTransicao(osBase('orcamento'), 'entregue')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toMatch(/Orçamento/)
  })

  it('recusa mudar para o mesmo status', () => {
    expect(validarTransicao(osBase('em_execucao'), 'em_execucao').ok).toBe(false)
  })

  it('exige motivo no cancelamento', () => {
    const semMotivo = validarTransicao(osBase('em_execucao'), 'cancelada')
    expect(semMotivo.ok).toBe(false)
    if (!semMotivo.ok) expect(semMotivo.campo).toBe('motivo')

    const comMotivo = validarTransicao(osBase('em_execucao'), 'cancelada', {
      motivo: 'Cliente desistiu do orçamento',
    })
    expect(comMotivo.ok).toBe(true)
  })

  it('exige km, data e pagamento definido para entregar', () => {
    const pronta = osBase('pronta')

    expect(validarTransicao(pronta, 'entregue').ok).toBe(false)
    expect(validarTransicao(pronta, 'entregue', { kmSaida: 90000 }).ok).toBe(false)
    expect(
      validarTransicao(pronta, 'entregue', { kmSaida: 90000, dataSaida: new Date() }).ok,
    ).toBe(false)

    const completo = validarTransicao(pronta, 'entregue', {
      kmSaida: 90000,
      dataSaida: new Date(),
      pagamentoDefinido: true,
    })
    expect(completo.ok).toBe(true)
  })

  it('não manda para aprovação uma OS sem nenhum item', () => {
    const vazia = { ...osBase('orcamento'), pecas: [], servicos: [] }
    const r = validarTransicao(vazia, 'aguardando_aprovacao')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toMatch(/peça ou serviço/)
  })

  it('não mexe mais em OS entregue', () => {
    const r = validarTransicao(osBase('entregue'), 'em_execucao')
    expect(r.ok).toBe(false)
  })
})
