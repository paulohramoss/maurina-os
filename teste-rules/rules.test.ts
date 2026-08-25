import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, query,
} from 'firebase/firestore'

/**
 * Testes das Security Rules contra o emulador.
 *
 * Aqui é onde a promessa "mecânico não mexe em dinheiro" deixa de ser
 * intenção e vira fato: a UI pode esconder o campo, mas quem garante é isto.
 *
 * Rodar:  npm run test:rules   (precisa de Java instalado — o emulador é JVM)
 */

const PROJETO = 'maurina-teste-rules'
const OFICINA = 'oficina1'
const OUTRA_OFICINA = 'oficina2'

let ambiente: RulesTestEnvironment

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: PROJETO,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await ambiente.cleanup()
})

beforeEach(async () => {
  await ambiente.clearFirestore()

  // Semeia índices de usuário e uma OS, ignorando as regras.
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()

    await setDoc(doc(db, 'usuariosIndex/admin1'), { oficinaId: OFICINA, papel: 'admin', ativo: true })
    await setDoc(doc(db, 'usuariosIndex/atendente1'), { oficinaId: OFICINA, papel: 'atendente', ativo: true })
    await setDoc(doc(db, 'usuariosIndex/mecanico1'), { oficinaId: OFICINA, papel: 'mecanico', ativo: true })
    await setDoc(doc(db, 'usuariosIndex/demitido'), { oficinaId: OFICINA, papel: 'atendente', ativo: false })
    await setDoc(doc(db, 'usuariosIndex/forasteiro'), { oficinaId: OUTRA_OFICINA, papel: 'admin', ativo: true })

    await setDoc(doc(db, `oficinas/${OFICINA}/ordens/os1`), {
      numero: '2026-0001',
      status: 'em_execucao',
      clienteId: 'c1',
      veiculoId: 'v1',
      diagnostico: '',
      pecas: [{ id: 'p1', descricao: 'Pastilha', quantidade: 2, valorUnitario: 8000, valorTotal: 16000, aplicada: false }],
      servicos: [{ id: 's1', descricao: 'Troca', quantidade: 1, valorUnitario: 5000, valorTotal: 5000, concluido: false }],
      subtotalPecas: 16000,
      subtotalServicos: 5000,
      desconto: { tipo: 'valor', valor: 0 },
      valorTotal: 21000,
      criadoEm: new Date(),
      criadoPor: 'atendente1',
      excluidoEm: null,
    })

    await setDoc(doc(db, `oficinas/${OFICINA}/clientes/c1`), {
      nome: 'João', telefone: '11999998888', excluidoEm: null, criadoPor: 'atendente1',
    })
  })
})

const como = (uid: string) => ambiente.authenticatedContext(uid).firestore()
const anonimo = () => ambiente.unauthenticatedContext().firestore()

const osRef = (db: ReturnType<typeof como>) => doc(db, `oficinas/${OFICINA}/ordens/os1`)

describe('isolamento entre oficinas', () => {
  it('usuário de outra oficina não lê nada daqui', async () => {
    await assertFails(getDoc(osRef(como('forasteiro'))))
    await assertFails(getDoc(doc(como('forasteiro'), `oficinas/${OFICINA}/clientes/c1`)))
  })

  it('anônimo não lê nada', async () => {
    await assertFails(getDoc(osRef(anonimo())))
  })

  it('usuário desativado perde o acesso', async () => {
    await assertFails(getDoc(osRef(como('demitido'))))
  })

  it('usuário da oficina lê a própria OS', async () => {
    await assertSucceeds(getDoc(osRef(como('mecanico1'))))
  })
})

describe('mecânico não mexe em dinheiro', () => {
  it('não altera o valor total', async () => {
    await assertFails(updateDoc(osRef(como('mecanico1')), { valorTotal: 1 }))
  })

  it('não altera o preço de uma peça', async () => {
    await assertFails(
      updateDoc(osRef(como('mecanico1')), {
        pecas: [{ id: 'p1', descricao: 'Pastilha', quantidade: 2, valorUnitario: 1, valorTotal: 2, aplicada: false }],
        subtotalPecas: 2,
        valorTotal: 5002,
      }),
    )
  })

  it('não aplica desconto', async () => {
    await assertFails(updateDoc(osRef(como('mecanico1')), { desconto: { tipo: 'percentual', valor: 5000 } }))
  })

  it('não registra pagamento', async () => {
    await assertFails(
      updateDoc(osRef(como('mecanico1')), { pagamento: { status: 'pago', valorPago: 21000 } }),
    )
  })

  it('não acrescenta peça nova à OS', async () => {
    await assertFails(
      updateDoc(osRef(como('mecanico1')), {
        pecas: [
          { id: 'p1', descricao: 'Pastilha', quantidade: 2, valorUnitario: 8000, valorTotal: 16000, aplicada: true },
          { id: 'p2', descricao: 'Disco', quantidade: 1, valorUnitario: 20000, valorTotal: 20000, aplicada: false },
        ],
      }),
    )
  })

  it('mas marca a peça como aplicada, sem tocar no preço', async () => {
    await assertSucceeds(
      updateDoc(osRef(como('mecanico1')), {
        pecas: [{ id: 'p1', descricao: 'Pastilha', quantidade: 2, valorUnitario: 8000, valorTotal: 16000, aplicada: true }],
        atualizadoEm: new Date(),
      }),
    )
  })

  it('e lança o diagnóstico', async () => {
    await assertSucceeds(
      updateDoc(osRef(como('mecanico1')), { diagnostico: 'Disco empenado', atualizadoEm: new Date() }),
    )
  })

  it('e muda o status', async () => {
    await assertSucceeds(updateDoc(osRef(como('mecanico1')), { status: 'pronta', atualizadoEm: new Date() }))
  })

  it('não abre OS', async () => {
    await assertFails(
      addDoc(collection(como('mecanico1'), `oficinas/${OFICINA}/ordens`), {
        numero: '2026-0002', status: 'orcamento', criadoPor: 'mecanico1', excluidoEm: null,
      }),
    )
  })

  it('não lê o financeiro', async () => {
    await assertFails(getDoc(doc(como('mecanico1'), `oficinas/${OFICINA}/pagamentos/pg1`)))
  })
})

describe('atendente opera o balcão', () => {
  it('altera valores da OS', async () => {
    await assertSucceeds(
      updateDoc(osRef(como('atendente1')), {
        valorTotal: 30000, subtotalPecas: 25000, atualizadoEm: new Date(),
      }),
    )
  })

  it('cadastra cliente', async () => {
    await assertSucceeds(
      addDoc(collection(como('atendente1'), `oficinas/${OFICINA}/clientes`), {
        nome: 'Maria', telefone: '11988887777', excluidoEm: null, criadoPor: 'atendente1',
      }),
    )
  })

  it('não reescreve o número da OS', async () => {
    await assertFails(updateDoc(osRef(como('atendente1')), { numero: '2026-9999' }))
  })

  it('não mexe na configuração da oficina além do contador', async () => {
    await ambiente.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `oficinas/${OFICINA}/config/geral`), {
        nome: 'Maurina', contadorOS: 1, anoContador: 2026,
      })
    })

    // Contador: pode (é a transação de abertura da OS).
    await assertSucceeds(
      updateDoc(doc(como('atendente1'), `oficinas/${OFICINA}/config/geral`), {
        contadorOS: 2, anoContador: 2026,
      }),
    )
    // Resto da configuração: não.
    await assertFails(
      updateDoc(doc(como('atendente1'), `oficinas/${OFICINA}/config/geral`), { nome: 'Outra' }),
    )
  })
})

describe('nada é apagado de verdade', () => {
  it('nem o admin exclui uma OS', async () => {
    await assertFails(deleteDoc(osRef(como('admin1'))))
  })

  it('nem o admin exclui um cliente', async () => {
    await assertFails(deleteDoc(doc(como('admin1'), `oficinas/${OFICINA}/clientes/c1`)))
  })

  it('soft delete é permitido', async () => {
    await assertSucceeds(
      updateDoc(doc(como('admin1'), `oficinas/${OFICINA}/clientes/c1`), {
        excluidoEm: new Date(), atualizadoEm: new Date(),
      }),
    )
  })
})

describe('timeline é imutável', () => {
  it('aceita novo evento assinado pelo autor', async () => {
    await assertSucceeds(
      addDoc(collection(como('mecanico1'), `oficinas/${OFICINA}/ordens/os1/historico`), {
        tipo: 'status', para: 'pronta', autorId: 'mecanico1', autorNome: 'Zé', em: new Date(),
      }),
    )
  })

  it('recusa evento assinado por outra pessoa', async () => {
    await assertFails(
      addDoc(collection(como('mecanico1'), `oficinas/${OFICINA}/ordens/os1/historico`), {
        tipo: 'status', para: 'pronta', autorId: 'admin1', autorNome: 'Chefe', em: new Date(),
      }),
    )
  })

  it('não deixa reescrever evento já gravado', async () => {
    await ambiente.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `oficinas/${OFICINA}/ordens/os1/historico/e1`), {
        tipo: 'status', para: 'pronta', autorId: 'mecanico1', autorNome: 'Zé', em: new Date(),
      })
    })

    await assertFails(
      updateDoc(doc(como('admin1'), `oficinas/${OFICINA}/ordens/os1/historico/e1`), {
        observacao: 'reescrevendo a história',
      }),
    )
  })
})

describe('ninguém se promove a admin', () => {
  it('cada um lê só o próprio índice', async () => {
    await assertSucceeds(getDoc(doc(como('mecanico1'), 'usuariosIndex/mecanico1')))
    await assertFails(getDoc(doc(como('mecanico1'), 'usuariosIndex/admin1')))
  })

  it('mecânico não muda o próprio papel', async () => {
    await assertFails(
      setDoc(doc(como('mecanico1'), 'usuariosIndex/mecanico1'), {
        oficinaId: OFICINA, papel: 'admin', ativo: true,
      }),
    )
  })

  it('atendente não cadastra acesso nenhum', async () => {
    await assertFails(
      setDoc(doc(como('atendente1'), 'usuariosIndex/novato'), {
        oficinaId: OFICINA, papel: 'atendente', ativo: true,
      }),
    )
  })

  it('admin cadastra acesso na própria oficina', async () => {
    await assertSucceeds(
      setDoc(doc(como('admin1'), 'usuariosIndex/novato'), {
        oficinaId: OFICINA, papel: 'atendente', ativo: true,
      }),
    )
  })

  it('admin não cadastra acesso em outra oficina', async () => {
    await assertFails(
      setDoc(doc(como('admin1'), 'usuariosIndex/infiltrado'), {
        oficinaId: OUTRA_OFICINA, papel: 'admin', ativo: true,
      }),
    )
  })

  it('admin não mexe no próprio acesso', async () => {
    // Impede o admin de se rebaixar e deixar a oficina sem administrador.
    await assertFails(
      setDoc(doc(como('admin1'), 'usuariosIndex/admin1'), {
        oficinaId: OFICINA, papel: 'atendente', ativo: true,
      }),
    )
  })

  it('admin não inventa papel novo', async () => {
    await assertFails(
      setDoc(doc(como('admin1'), 'usuariosIndex/novato'), {
        oficinaId: OFICINA, papel: 'superusuario', ativo: true,
      }),
    )
  })
})

describe('link público de aprovação', () => {
  const daquiSeteDias = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d
  }

  const orcamento = (extras: Record<string, unknown> = {}) => ({
    oficinaId: OFICINA,
    osId: 'os1',
    osNumero: '2026-0001',
    nomeOficina: 'Maurina',
    nomeCliente: 'João',
    veiculo: 'Fiat Uno 2019',
    placa: 'ABC1D23',
    reclamacao: 'Barulho na roda',
    pecas: [], servicos: [],
    subtotalPecas: 16000, subtotalServicos: 5000,
    descontoValor: 0, acrescimo: 0, valorTotal: 21000,
    fotos: [], garantiaMeses: 3,
    criadoEm: new Date(),
    expiraEm: daquiSeteDias(),
    cancelado: false,
    resposta: null, respondidoPor: null, respondidoEm: null,
    ...extras,
  })

  const semear = async (token: string, extras: Record<string, unknown> = {}) => {
    await ambiente.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `aprovacoes/${token}`), orcamento(extras))
    })
  }

  it('balcão gera o link', async () => {
    await assertSucceeds(setDoc(doc(como('atendente1'), 'aprovacoes/tk1'), orcamento()))
  })

  it('balcão não gera link para outra oficina', async () => {
    await assertFails(
      setDoc(doc(como('atendente1'), 'aprovacoes/tk2'), orcamento({ oficinaId: OUTRA_OFICINA })),
    )
  })

  it('mecânico não gera link', async () => {
    await assertFails(setDoc(doc(como('mecanico1'), 'aprovacoes/tk3'), orcamento()))
  })

  it('cliente sem login abre o próprio orçamento', async () => {
    await semear('tk-ok')
    await assertSucceeds(getDoc(doc(anonimo(), 'aprovacoes/tk-ok')))
  })

  it('cliente sem login não abre link vencido', async () => {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    await semear('tk-vencido', { expiraEm: ontem })
    await assertFails(getDoc(doc(anonimo(), 'aprovacoes/tk-vencido')))
  })

  it('cliente sem login não abre link encerrado pelo balcão', async () => {
    await semear('tk-cancelado', { cancelado: true })
    await assertFails(getDoc(doc(anonimo(), 'aprovacoes/tk-cancelado')))
  })

  it('cliente sem login aprova', async () => {
    await semear('tk-aprovar')
    await assertSucceeds(
      updateDoc(doc(anonimo(), 'aprovacoes/tk-aprovar'), {
        resposta: 'aprovado', respondidoPor: 'João', respondidoEm: new Date(),
      }),
    )
  })

  it('cliente não aprova baixando o valor no caminho', async () => {
    await semear('tk-esperto')
    await assertFails(
      updateDoc(doc(anonimo(), 'aprovacoes/tk-esperto'), {
        resposta: 'aprovado', respondidoPor: 'João', respondidoEm: new Date(), valorTotal: 1,
      }),
    )
  })

  it('cliente não responde duas vezes', async () => {
    await semear('tk-usado', {
      resposta: 'aprovado', respondidoPor: 'João', respondidoEm: new Date(),
    })
    await assertFails(
      updateDoc(doc(anonimo(), 'aprovacoes/tk-usado'), {
        resposta: 'recusado', respondidoPor: 'João', respondidoEm: new Date(),
      }),
    )
  })

  it('cliente não estica a validade do link', async () => {
    await semear('tk-prazo')
    const ano2030 = new Date(2030, 0, 1)
    await assertFails(updateDoc(doc(anonimo(), 'aprovacoes/tk-prazo'), { expiraEm: ano2030 }))
  })

  it('cliente não lista os links dos outros', async () => {
    await assertFails(getDocs(query(collection(anonimo(), 'aprovacoes'))))
  })

  it('link não é apagado nem pelo admin: é comprovante', async () => {
    await semear('tk-comprovante')
    await assertFails(deleteDoc(doc(como('admin1'), 'aprovacoes/tk-comprovante')))
  })
})
