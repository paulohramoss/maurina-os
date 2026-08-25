#!/usr/bin/env node
/**
 * Teste de fumaça dos fluxos de operação (Fases 2 e 3) contra o projeto REAL.
 *
 * Cobre orçamento, aprovação, recebimento, catálogo e gestão de acessos —
 * e confirma que o mecânico continua sem enxergar nem tocar em dinheiro
 * depois de todas as regras que foram afrouxadas para o admin.
 *
 * Uso:
 *   node scripts/teste-producao-operacao.mjs <email-admin> <senha> <email-mecanico> <senha>
 *
 * Limpeza: node scripts/limpar-teste.mjs
 */

import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  initializeFirestore, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, runTransaction, serverTimestamp, Timestamp,
} from 'firebase/firestore'

const [emailAdmin, senhaAdmin, emailMecanico, senhaMecanico] = process.argv.slice(2)

if (!emailAdmin || !senhaAdmin || !emailMecanico || !senhaMecanico) {
  console.error('\nUso: node scripts/teste-producao-operacao.mjs <email-admin> <senha> <email-mecanico> <senha>\n')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const db = initializeFirestore(app, {}, env.VITE_FIREBASE_DATABASE_ID || 'default')
const auth = getAuth(app)
const O = process.env.OFICINA_ID ?? 'maurina'

let ok = 0
let falhas = 0

const teste = async (nome, fn, esperaFalhar = false) => {
  try {
    await fn()
    if (esperaFalhar) {
      console.log(`  ✗ ${nome} — DEVERIA TER SIDO BLOQUEADO`)
      falhas++
    } else {
      console.log(`  ✓ ${nome}`)
      ok++
    }
  } catch (e) {
    if (esperaFalhar) {
      console.log(`  ✓ ${nome} (bloqueado)`)
      ok++
    } else {
      console.log(`  ✗ ${nome} — ${e.code || e.message}`)
      falhas++
    }
  }
}

/* ---------------------------------------------------------------- */
/* Admin: orçamento, aprovação, recebimento e catálogo               */
/* ---------------------------------------------------------------- */

console.log(`\nADMIN (${emailAdmin})`)
await signInWithEmailAndPassword(auth, emailAdmin, senhaAdmin)
console.log('  ✓ login')
ok++

const uidAdmin = auth.currentUser.uid
let clienteId, veiculoId, osId, numeroOS

await teste('cadastra cliente e veículo', async () => {
  clienteId = (
    await addDoc(collection(db, `oficinas/${O}/clientes`), {
      nome: 'ZZ Cliente de Teste', nomeBusca: 'zz cliente de teste', tipo: 'PF',
      telefone: '11999990000', whatsapp: '11999990000',
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      criadoPor: uidAdmin, excluidoEm: null,
    })
  ).id

  veiculoId = (
    await addDoc(collection(db, `oficinas/${O}/veiculos`), {
      clienteId, placa: 'TST1D23', marca: 'Fiat', modelo: 'Uno',
      anoFabricacao: 2018, anoModelo: 2019, cor: 'Prata', combustivel: 'flex', kmAtual: 87000,
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      criadoPor: uidAdmin, excluidoEm: null,
    })
  ).id
})

await teste('cadastra peça e serviço no catálogo', async () => {
  await addDoc(collection(db, `oficinas/${O}/catalogoPecas`), {
    descricao: 'ZZ Pastilha de Teste', valorPadrao: 18000, ativo: true,
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    criadoPor: uidAdmin, excluidoEm: null,
  })
  await addDoc(collection(db, `oficinas/${O}/catalogoServicos`), {
    descricao: 'ZZ Troca de Teste', valorPadrao: 12000, ativo: true,
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    criadoPor: uidAdmin, excluidoEm: null,
  })
})

await teste('abre OS com numeração transacional', async () => {
  const osRef = doc(collection(db, `oficinas/${O}/ordens`))
  const cfgRef = doc(db, `oficinas/${O}/config/geral`)

  numeroOS = await runTransaction(db, async (tx) => {
    const cfg = await tx.get(cfgRef)
    const ano = new Date().getFullYear()
    const c = cfg.exists() && cfg.data().anoContador === ano ? cfg.data().contadorOS + 1 : 1
    const numero = `${ano}-${String(c).padStart(4, '0')}`

    tx.set(osRef, {
      numero, clienteId, veiculoId,
      snapshotCliente: { nome: 'ZZ Cliente de Teste', telefone: '11999990000' },
      snapshotVeiculo: { placa: 'TST1D23', marca: 'Fiat', modelo: 'Uno', anoModelo: 2019, cor: 'Prata' },
      status: 'orcamento', dataEntrada: serverTimestamp(), kmEntrada: 87000, nivelCombustivel: 2,
      checklistEntrada: {
        itens: { estepe: true, macaco: true, chaveRoda: false, triangulo: true, documentos: true, tapetes: true, radio: true, calotas: false },
        avarias: ['risco na porta traseira'], fotos: [],
      },
      reclamacaoCliente: 'Barulho na roda quando freia',
      pecas: [{ id: 'p1', descricao: 'Pastilha dianteira', quantidade: 2, valorUnitario: 18000, valorTotal: 36000, aplicada: false }],
      servicos: [{ id: 's1', descricao: 'Troca de pastilha', quantidade: 1, valorUnitario: 12000, valorTotal: 12000, concluido: false }],
      subtotalPecas: 36000, subtotalServicos: 12000,
      desconto: { tipo: 'percentual', valor: 1000 }, valorTotal: 43200,
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      criadoPor: uidAdmin, excluidoEm: null,
    })
    tx.update(cfgRef, { contadorOS: c, anoContador: ano })
    return numero
  })
  osId = osRef.id
})
console.log(`    → OS ${numeroOS} · R$ 480,00 - 10% = R$ 432,00`)

const osRef = () => doc(db, `oficinas/${O}/ordens/${osId}`)

await teste('registra aprovação com assinatura', () =>
  updateDoc(osRef(), {
    aprovacao: {
      aprovadoPor: 'ZZ Cliente de Teste',
      canal: 'presencial',
      assinaturaBase64: 'data:image/jpeg;base64,/9j/TESTE',
      aprovadoEm: Timestamp.now(),
    },
    atualizadoEm: serverTimestamp(),
  }),
)

await teste('registra recebimento parcial e atualiza a OS na mesma transação', async () => {
  const pagRef = doc(collection(db, `oficinas/${O}/pagamentos`))
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(osRef())
    const atual = snap.data()
    const novoPago = (atual.pagamento?.valorPago ?? 0) + 20000

    tx.set(pagRef, {
      osId, osNumero: atual.numero, clienteId, valor: 20000, forma: 'pix',
      recebidoEm: serverTimestamp(),
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      criadoPor: uidAdmin, excluidoEm: null,
    })
    tx.update(osRef(), {
      pagamento: { status: novoPago >= atual.valorTotal ? 'pago' : 'parcial', forma: 'pix', valorPago: novoPago },
      atualizadoEm: serverTimestamp(),
    })
  })

  const depois = await getDoc(osRef())
  if (depois.data().pagamento.status !== 'parcial') throw new Error('status do pagamento não ficou parcial')
})

await teste('lê o caixa do dia', async () => {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const snap = await getDocs(
    query(
      collection(db, `oficinas/${O}/pagamentos`),
      where('excluidoEm', '==', null),
      where('recebidoEm', '>=', Timestamp.fromDate(inicio)),
    ),
  )
  if (snap.empty) throw new Error('nenhum pagamento no caixa do dia')
})

await teste('entrega o carro e agenda a próxima revisão', async () => {
  await updateDoc(osRef(), {
    status: 'entregue', dataSaida: serverTimestamp(), kmSaida: 87350,
    pagamento: { status: 'pago', forma: 'pix', valorPago: 43200 },
    atualizadoEm: serverTimestamp(),
  })

  const proxima = new Date()
  proxima.setMonth(proxima.getMonth() + 6)
  await updateDoc(doc(db, `oficinas/${O}/veiculos/${veiculoId}`), {
    kmAtual: 87350,
    proximaRevisaoKm: 97350,
    proximaRevisaoData: Timestamp.fromDate(proxima),
    atualizadoEm: serverTimestamp(),
  })
})

await teste('lista veículos com revisão vencida', () =>
  getDocs(
    query(
      collection(db, `oficinas/${O}/veiculos`),
      where('excluidoEm', '==', null),
      where('proximaRevisaoData', '<=', Timestamp.fromDate(new Date())),
    ),
  ),
)

await teste('edita a configuração da oficina', () =>
  setDoc(doc(db, `oficinas/${O}/config/geral`), { garantiaPadraoMeses: 3 }, { merge: true }),
)

await teste('NÃO escreve índice de usuário de outra oficina', () =>
  setDoc(doc(db, 'usuariosIndex/invasor-teste'), { oficinaId: 'outra-oficina', papel: 'admin', ativo: true }),
  true,
)

await teste('NÃO mexe no próprio índice (nem para se rebaixar)', () =>
  setDoc(doc(db, `usuariosIndex/${uidAdmin}`), { oficinaId: O, papel: 'atendente', ativo: true }),
  true,
)

await teste('NÃO cria índice com papel inventado', () =>
  setDoc(doc(db, 'usuariosIndex/papel-invalido-teste'), { oficinaId: O, papel: 'superusuario', ativo: true }),
  true,
)

/* ---------------------------------------------------------------- */
/* Mecânico: continua sem ver dinheiro                               */
/* ---------------------------------------------------------------- */

await signOut(auth)
console.log(`\nMECÂNICO (${emailMecanico})`)
await signInWithEmailAndPassword(auth, emailMecanico, senhaMecanico)
console.log('  ✓ login')
ok++

const uidMecanico = auth.currentUser.uid

await teste('marca serviço como concluído', () =>
  updateDoc(osRef(), {
    servicos: [{ id: 's1', descricao: 'Troca de pastilha', quantidade: 1, valorUnitario: 12000, valorTotal: 12000, concluido: true }],
    atualizadoEm: serverTimestamp(),
  }),
)

await teste('grava fotos da execução', () =>
  updateDoc(osRef(), { fotosExecucao: ['https://exemplo/foto1.jpg'], atualizadoEm: serverTimestamp() }),
)

await teste('NÃO apaga a aprovação assinada', () =>
  updateDoc(osRef(), { aprovacao: null }), true,
)

await teste('NÃO mexe no pagamento registrado', () =>
  updateDoc(osRef(), { pagamento: { status: 'pendente', valorPago: 0 } }), true,
)

await teste('NÃO edita o catálogo de preços', () =>
  addDoc(collection(db, `oficinas/${O}/catalogoPecas`), {
    descricao: 'ZZ Peça Fantasma', valorPadrao: 1, ativo: true,
    criadoPor: uidMecanico, excluidoEm: null,
  }),
  true,
)

await teste('NÃO lê o caixa', () =>
  getDocs(query(collection(db, `oficinas/${O}/pagamentos`), where('excluidoEm', '==', null))),
  true,
)

await teste('NÃO cria acesso para si mesmo como admin', () =>
  setDoc(doc(db, `usuariosIndex/${uidMecanico}`), { oficinaId: O, papel: 'admin', ativo: true }),
  true,
)

await teste('NÃO cria acesso para terceiros', () =>
  setDoc(doc(db, 'usuariosIndex/comparsa-teste'), { oficinaId: O, papel: 'admin', ativo: true }),
  true,
)

await teste('NÃO edita a configuração da oficina', () =>
  updateDoc(doc(db, `oficinas/${O}/config/geral`), { nome: 'Hackeada' }), true,
)

await teste('NÃO apaga OS entregue', () => deleteDoc(osRef()), true)

console.log(`\n${ok} passaram · ${falhas} falharam`)
console.log(`OS de teste: ${numeroOS}. Rode "node scripts/limpar-teste.mjs" para remover.`)
process.exit(falhas > 0 ? 1 : 0)
