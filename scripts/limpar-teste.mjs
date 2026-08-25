#!/usr/bin/env node
/**
 * Remove os dados criados por scripts/teste-producao.mjs e zera o contador de OS,
 * para a primeira ordem de serviço de verdade da oficina sair como 0001.
 *
 * Diferente do app, este script apaga MESMO (hard delete) — são dados de teste,
 * não histórico da oficina. Ele só toca no que tem "ZZ ... de Teste" no nome.
 *
 * Uso: node scripts/limpar-teste.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const OFICINA_ID = process.env.OFICINA_ID ?? 'maurina'
const ID_BANCO = process.env.FIRESTORE_DATABASE_ID ?? 'default'
const CAMINHO_CHAVE = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './serviceAccount.json'

if (!existsSync(CAMINHO_CHAVE)) {
  console.error(`\nChave de serviço não encontrada em ${CAMINHO_CHAVE}.\n`)
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(CAMINHO_CHAVE, 'utf8'))) })
const db = getFirestore(ID_BANCO)

const base = `oficinas/${OFICINA_ID}`
let removidos = 0

/** Apaga a OS de teste junto com histórico e pagamentos vinculados. */
const ordens = await db.collection(`${base}/ordens`).where('snapshotVeiculo.placa', '==', 'TST1D23').get()
for (const os of ordens.docs) {
  const historico = await os.ref.collection('historico').get()
  for (const evento of historico.docs) {
    await evento.ref.delete()
    removidos++
  }

  const pagamentos = await db.collection(`${base}/pagamentos`).where('osId', '==', os.id).get()
  for (const pagamento of pagamentos.docs) {
    await pagamento.ref.delete()
    removidos++
  }

  await os.ref.delete()
  removidos++
  console.log(`OS ${os.data().numero} removida (com histórico e pagamentos).`)
}

const veiculos = await db.collection(`${base}/veiculos`).where('placa', '==', 'TST1D23').get()
for (const v of veiculos.docs) {
  await v.ref.delete()
  removidos++
}

for (const [colecao, campo, valor] of [
  ['clientes', 'nome', 'ZZ Cliente de Teste'],
  ['mecanicos', 'nome', 'ZZ Mecânico de Teste'],
  ['catalogoPecas', 'descricao', 'ZZ Pastilha de Teste'],
  ['catalogoServicos', 'descricao', 'ZZ Troca de Teste'],
]) {
  const snap = await db.collection(`${base}/${colecao}`).where(campo, '==', valor).get()
  for (const d of snap.docs) {
    await d.ref.delete()
    removidos++
  }
}

// Contador de volta a zero: a próxima OS real será a 0001 do ano.
await db.doc(`${base}/config/geral`).set(
  { contadorOS: 0, anoContador: new Date().getFullYear() },
  { merge: true },
)

console.log(`\n${removidos} documento(s) removido(s). Contador de OS zerado.\n`)
process.exit(0)
