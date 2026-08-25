#!/usr/bin/env node
/**
 * Teste do link público de aprovação contra o projeto REAL.
 *
 * É o ponto mais delicado do sistema: o único lugar onde alguém sem login
 * escreve no banco. Este script confirma que a porta abre só o quanto deve —
 * o cliente responde o próprio orçamento e nada mais.
 *
 * Uso:
 *   node scripts/teste-producao-aprovacao.mjs <email-atendente> <senha>
 */

import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  initializeFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, serverTimestamp, Timestamp,
} from 'firebase/firestore'

const [email, senha] = process.argv.slice(2)

if (!email || !senha) {
  console.error('\nUso: node scripts/teste-producao-aprovacao.mjs <email-atendente> <senha>\n')
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

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}
const idBanco = env.VITE_FIREBASE_DATABASE_ID || 'default'
const O = process.env.OFICINA_ID ?? 'maurina'

// Dois apps: um logado como atendente, outro totalmente anônimo —
// é assim que o celular do cliente enxerga o sistema.
const appBalcao = initializeApp(config, 'balcao')
const dbBalcao = initializeFirestore(appBalcao, {}, idBanco)
const authBalcao = getAuth(appBalcao)

const appCliente = initializeApp(config, 'cliente-anonimo')
const dbCliente = initializeFirestore(appCliente, {}, idBanco)

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

const token = `teste${Date.now()}${Math.random().toString(36).slice(2, 8)}`
const tokenVencido = `vencido${Date.now()}`
const linkRef = (db) => doc(db, `aprovacoes/${token}`)

const orcamento = (extras = {}) => {
  const expira = new Date()
  expira.setDate(expira.getDate() + 7)
  return {
    oficinaId: O,
    osId: 'os-de-teste',
    osNumero: '2026-TESTE',
    nomeOficina: 'Maurina AutoCar',
    telefoneOficina: '11999990000',
    nomeCliente: 'ZZ Cliente de Teste',
    veiculo: 'Fiat Uno 2019',
    placa: 'TST1D23',
    reclamacao: 'Barulho na roda',
    pecas: [{ descricao: 'Pastilha', quantidade: 2, valorUnitario: 18000, valorTotal: 36000 }],
    servicos: [{ descricao: 'Troca', quantidade: 1, valorUnitario: 12000, valorTotal: 12000 }],
    subtotalPecas: 36000,
    subtotalServicos: 12000,
    descontoValor: 4800,
    acrescimo: 0,
    valorTotal: 43200,
    fotos: [],
    garantiaMeses: 3,
    criadoEm: serverTimestamp(),
    expiraEm: Timestamp.fromDate(expira),
    cancelado: false,
    resposta: null,
    respondidoPor: null,
    respondidoEm: null,
    ...extras,
  }
}

/* ---------------------------------------------------------------- */

console.log(`\nBALCÃO (${email})`)
await signInWithEmailAndPassword(authBalcao, email, senha)
console.log('  ✓ login')
ok++

await teste('gera link de aprovação', () => setDoc(linkRef(dbBalcao), orcamento()))

await teste('NÃO gera link para outra oficina', () =>
  setDoc(doc(dbBalcao, `aprovacoes/${token}-outra`), orcamento({ oficinaId: 'oficina-alheia' })),
  true,
)

await teste('NÃO gera link já respondido', () =>
  setDoc(doc(dbBalcao, `aprovacoes/${token}-falso`), orcamento({
    resposta: 'aprovado', respondidoPor: 'Fantasma', respondidoEm: Timestamp.now(),
  })),
  true,
)

const expirado = new Date()
expirado.setDate(expirado.getDate() - 1)
await teste('cria um link já vencido (para o teste seguinte)', () =>
  setDoc(doc(dbBalcao, `aprovacoes/${tokenVencido}`), orcamento({
    expiraEm: Timestamp.fromDate(expirado),
  })),
)

/* ---------------------------------------------------------------- */

console.log('\nCLIENTE (sem login nenhum)')

await teste('abre o orçamento pelo link', async () => {
  const snap = await getDoc(linkRef(dbCliente))
  if (!snap.exists()) throw new Error('não conseguiu ler')
  if (snap.data().valorTotal !== 43200) throw new Error('valor veio errado')
})

await teste('NÃO abre link vencido', async () => {
  const snap = await getDoc(doc(dbCliente, `aprovacoes/${tokenVencido}`))
  if (!snap.exists()) throw new Error('bloqueado')
}, true)

await teste('NÃO lista todos os links da coleção', () =>
  getDocs(collection(dbCliente, 'aprovacoes')), true,
)

await teste('NÃO lê a OS de onde o orçamento veio', () =>
  getDoc(doc(dbCliente, `oficinas/${O}/ordens/os-de-teste`)).then((s) => {
    if (!s.exists()) throw new Error('bloqueado')
  }),
  true,
)

await teste('NÃO lê clientes da oficina', () =>
  getDocs(collection(dbCliente, `oficinas/${O}/clientes`)), true,
)

await teste('NÃO lê o caixa da oficina', () =>
  getDocs(collection(dbCliente, `oficinas/${O}/pagamentos`)), true,
)

await teste('NÃO baixa o próprio valor do orçamento', () =>
  updateDoc(linkRef(dbCliente), {
    valorTotal: 1, resposta: 'aprovado', respondidoPor: 'Espertinho', respondidoEm: serverTimestamp(),
  }),
  true,
)

await teste('NÃO estica a validade do link', () =>
  updateDoc(linkRef(dbCliente), { expiraEm: Timestamp.fromDate(new Date(2030, 0, 1)) }), true,
)

await teste('NÃO responde com valor fora do combinado', () =>
  updateDoc(linkRef(dbCliente), {
    resposta: 'talvez', respondidoPor: 'X', respondidoEm: serverTimestamp(),
  }),
  true,
)

await teste('NÃO cria link novo do nada', () =>
  setDoc(doc(dbCliente, `aprovacoes/inventado-${Date.now()}`), orcamento()), true,
)

await teste('NÃO apaga o link', () => deleteDoc(linkRef(dbCliente)), true)

await teste('aprova o orçamento', () =>
  updateDoc(linkRef(dbCliente), {
    resposta: 'aprovado',
    respondidoPor: 'ZZ Cliente de Teste',
    respondidoEm: serverTimestamp(),
    observacaoCliente: 'Pode fazer',
  }),
)

await teste('NÃO responde uma segunda vez', () =>
  updateDoc(linkRef(dbCliente), {
    resposta: 'recusado', respondidoPor: 'Arrependido', respondidoEm: serverTimestamp(),
  }),
  true,
)

/* ---------------------------------------------------------------- */

console.log('\nBALCÃO — recebe a resposta')

await teste('enxerga a aprovação do cliente', async () => {
  const snap = await getDoc(linkRef(dbBalcao))
  const d = snap.data()
  if (d.resposta !== 'aprovado') throw new Error('resposta não chegou')
  if (d.respondidoPor !== 'ZZ Cliente de Teste') throw new Error('nome não chegou')
  if (!d.respondidoEm) throw new Error('horário não foi registrado')
})

await teste('encerra o link', () => updateDoc(linkRef(dbBalcao), { cancelado: true }))

await teste('NÃO apaga o link (fica como comprovante)', () => deleteDoc(linkRef(dbBalcao)), true)

await signOut(authBalcao)

console.log(`\n${ok} passaram · ${falhas} falharam`)
console.log('Links de teste ficam no banco como comprovante; remova pelo Console se quiser.')
process.exit(falhas > 0 ? 1 : 0)
