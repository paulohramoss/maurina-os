#!/usr/bin/env node
/**
 * Cria um atendente ou mecânico enquanto a tela de gestão de usuários
 * (Fase 3) não existe.
 *
 * Uso:
 *   node scripts/criar-usuario.mjs "email@oficina.com" "senha123" "Nome" atendente
 *   node scripts/criar-usuario.mjs "patio@oficina.com" "senha123" "Pátio" mecanico
 *
 * Lembrete: o acesso de mecânico é COMPARTILHADO — um login por oficina, usado
 * no celular do pátio. Quem executou o serviço é escolhido dentro do app.
 */

import { readFileSync, existsSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const OFICINA_ID = process.env.OFICINA_ID ?? 'maurina'
const ID_BANCO = process.env.FIRESTORE_DATABASE_ID ?? 'default'
const CAMINHO_CHAVE = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './serviceAccount.json'
const PAPEIS = ['admin', 'atendente', 'mecanico']

const [email, senha, nome, papel] = process.argv.slice(2)

if (!email || !senha || !nome || !PAPEIS.includes(papel)) {
  console.error(
    `\nUso: node scripts/criar-usuario.mjs "email" "senha" "Nome" <${PAPEIS.join('|')}>\n`,
  )
  process.exit(1)
}

if (!existsSync(CAMINHO_CHAVE)) {
  console.error(`\nChave de serviço não encontrada em ${CAMINHO_CHAVE}.\n`)
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(CAMINHO_CHAVE, 'utf8'))) })

const auth = getAuth()
const db = getFirestore(ID_BANCO)

let uid
try {
  uid = (await auth.getUserByEmail(email)).uid
  await auth.updateUser(uid, { password: senha, displayName: nome })
  console.log(`Usuário já existia. Senha atualizada (${uid}).`)
} catch (erro) {
  if (erro.code !== 'auth/user-not-found') throw erro
  uid = (await auth.createUser({ email, password: senha, displayName: nome })).uid
  console.log(`Usuário criado (${uid}).`)
}

const agora = FieldValue.serverTimestamp()

await db.doc(`usuariosIndex/${uid}`).set({ oficinaId: OFICINA_ID, papel, ativo: true })

await db.doc(`oficinas/${OFICINA_ID}/usuarios/${uid}`).set(
  {
    nome,
    email,
    papel,
    ativo: true,
    criadoEm: agora,
    atualizadoEm: agora,
    criadoPor: 'script',
    excluidoEm: null,
  },
  { merge: true },
)

console.log(`\n  ${nome} · ${papel} · ${email}\n`)
process.exit(0)
