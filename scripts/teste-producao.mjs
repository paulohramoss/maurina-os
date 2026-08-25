#!/usr/bin/env node
/**
 * Teste de fumaça contra o projeto REAL (não o emulador).
 *
 * Faz login de verdade com um atendente e um mecânico, abre uma OS e tenta
 * furar as Security Rules. É a checagem que responde "as regras que eu subi
 * estão mesmo valendo em produção?" — coisa que o emulador não garante.
 *
 * Uso:
 *   node scripts/teste-producao.mjs <email-atendente> <senha> <email-mecanico> <senha>
 *
 * Os dados criados ficam no banco. Para removê-los: node scripts/limpar-teste.mjs
 */

import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  initializeFirestore, doc, getDoc, setDoc, addDoc, updateDoc, collection,
  runTransaction, serverTimestamp, deleteDoc,
} from 'firebase/firestore'

const [emailAtendente, senhaAtendente, emailMecanico, senhaMecanico] = process.argv.slice(2)

if (!emailAtendente || !senhaAtendente || !emailMecanico || !senhaMecanico) {
  console.error('\nUso: node scripts/teste-producao.mjs <email-atendente> <senha> <email-mecanico> <senha>\n')
  process.exit(1)
}

/** Lê o .env.local para não repetir as credenciais aqui. */
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

let ok = 0, falhas = 0
const teste = async (nome, fn, esperaFalhar = false) => {
  try {
    await fn()
    if (esperaFalhar) { console.log(`  ✗ ${nome} — DEVERIA TER SIDO BLOQUEADO`); falhas++ }
    else { console.log(`  ✓ ${nome}`); ok++ }
  } catch (e) {
    if (esperaFalhar) { console.log(`  ✓ ${nome} (bloqueado)`); ok++ }
    else { console.log(`  ✗ ${nome} — ${e.code || e.message}`); falhas++ }
  }
}

// ---------- atendente ----------
console.log(`\nATENDENTE (${emailAtendente})`)
await signInWithEmailAndPassword(auth, emailAtendente, senhaAtendente)
console.log('  ✓ login'); ok++

let clienteId, veiculoId, osId, numeroOS

await teste('cadastra cliente', async () => {
  const r = await addDoc(collection(db, `oficinas/${O}/clientes`), {
    nome: 'ZZ Cliente de Teste', nomeBusca: 'zz cliente de teste', tipo: 'PF',
    telefone: '11999990000', whatsapp: '11999990000',
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    criadoPor: auth.currentUser.uid, excluidoEm: null,
  })
  clienteId = r.id
})

await teste('cadastra veículo', async () => {
  const r = await addDoc(collection(db, `oficinas/${O}/veiculos`), {
    clienteId, placa: 'TST1D23', marca: 'Fiat', modelo: 'Uno',
    anoFabricacao: 2018, anoModelo: 2019, cor: 'Prata', combustivel: 'flex', kmAtual: 87000,
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    criadoPor: auth.currentUser.uid, excluidoEm: null,
  })
  veiculoId = r.id
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
      checklistEntrada: { itens: { estepe: true, macaco: true, chaveRoda: false, triangulo: true, documentos: true, tapetes: true, radio: true, calotas: false }, avarias: ['risco na porta traseira'], fotos: [] },
      reclamacaoCliente: 'Barulho na roda quando freia',
      pecas: [{ id: 'p1', descricao: 'Pastilha dianteira', quantidade: 1, valorUnitario: 18000, valorTotal: 18000, aplicada: false }],
      servicos: [{ id: 's1', descricao: 'Troca de pastilha', quantidade: 1, valorUnitario: 12000, valorTotal: 12000, concluido: false }],
      subtotalPecas: 18000, subtotalServicos: 12000, desconto: { tipo: 'valor', valor: 0 }, valorTotal: 30000,
      criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      criadoPor: auth.currentUser.uid, excluidoEm: null,
    })
    tx.update(cfgRef, { contadorOS: c, anoContador: ano })
    return numero
  })
  osId = osRef.id
})
console.log(`    → OS ${numeroOS}`)

await teste('grava evento na timeline', async () => {
  await addDoc(collection(db, `oficinas/${O}/ordens/${osId}/historico`), {
    tipo: 'criacao', para: 'orcamento', observacao: `OS ${numeroOS} aberta`,
    autorId: auth.currentUser.uid, autorNome: 'Ana (Balcão)', em: serverTimestamp(),
  })
})

await teste('altera valores da OS', () => updateDoc(doc(db, `oficinas/${O}/ordens/${osId}`), {
  valorTotal: 28000, desconto: { tipo: 'valor', valor: 2000 }, atualizadoEm: serverTimestamp(),
}))

await teste('cadastra mecânico na equipe', () => addDoc(collection(db, `oficinas/${O}/mecanicos`), {
  nome: 'ZZ Mecânico de Teste', ativo: true,
  criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
  criadoPor: auth.currentUser.uid, excluidoEm: null,
}))

await teste('NÃO reescreve o número da OS', () => updateDoc(doc(db, `oficinas/${O}/ordens/${osId}`), { numero: '2026-9999' }), true)
await teste('NÃO apaga a OS', () => deleteDoc(doc(db, `oficinas/${O}/ordens/${osId}`)), true)
await teste('NÃO edita a configuração da oficina', () => updateDoc(doc(db, `oficinas/${O}/config/geral`), { nome: 'Hackeada' }), true)

// ---------- mecânico ----------
await signOut(auth)
console.log(`\nMECÂNICO (${emailMecanico})`)
await signInWithEmailAndPassword(auth, emailMecanico, senhaMecanico)
console.log('  ✓ login'); ok++

const osRef = doc(db, `oficinas/${O}/ordens/${osId}`)

await teste('lê a OS', async () => { if (!(await getDoc(osRef)).exists()) throw new Error('não achou') })
await teste('lança diagnóstico', () => updateDoc(osRef, { diagnostico: 'Disco empenado', atualizadoEm: serverTimestamp() }))
await teste('marca peça como aplicada', () => updateDoc(osRef, {
  pecas: [{ id: 'p1', descricao: 'Pastilha dianteira', quantidade: 1, valorUnitario: 18000, valorTotal: 18000, aplicada: true }],
  atualizadoEm: serverTimestamp(),
}))
await teste('muda status', () => updateDoc(osRef, { status: 'em_execucao', atualizadoEm: serverTimestamp() }))

await teste('NÃO altera valor total', () => updateDoc(osRef, { valorTotal: 1 }), true)
await teste('NÃO altera preço de peça', () => updateDoc(osRef, {
  pecas: [{ id: 'p1', descricao: 'Pastilha', quantidade: 1, valorUnitario: 1, valorTotal: 1, aplicada: true }],
  subtotalPecas: 1, valorTotal: 13000,
}), true)
await teste('NÃO aplica desconto', () => updateDoc(osRef, { desconto: { tipo: 'percentual', valor: 5000 } }), true)
await teste('NÃO registra pagamento', () => updateDoc(osRef, { pagamento: { status: 'pago', valorPago: 30000 } }), true)
await teste('NÃO abre OS', () => addDoc(collection(db, `oficinas/${O}/ordens`), {
  numero: '2026-0999', status: 'orcamento', criadoPor: auth.currentUser.uid, excluidoEm: null,
}), true)
await teste('NÃO cadastra cliente', () => addDoc(collection(db, `oficinas/${O}/clientes`), {
  nome: 'X', criadoPor: auth.currentUser.uid, excluidoEm: null,
}), true)
await teste('NÃO lê o financeiro', () => getDoc(doc(db, `oficinas/${O}/pagamentos/qualquer`)), true)
await teste('NÃO se promove a admin', () => setDoc(doc(db, `usuariosIndex/${auth.currentUser.uid}`), { papel: 'admin' }), true)

console.log(`\n${ok} passaram · ${falhas} falharam`)
console.log(`OS de teste: ${osId} (numero ${numeroOS})`)
process.exit(falhas > 0 ? 1 : 0)
