#!/usr/bin/env node
/**
 * Cria a oficina e o primeiro usuário administrador.
 *
 * As Security Rules proíbem qualquer cliente de escrever em /usuariosIndex —
 * é o que impede alguém de se promover a admin pelo navegador. Por isso este
 * script roda com o Admin SDK, fora das regras, e é executado uma única vez.
 *
 * Uso:
 *   1. Console do Firebase > Configurações > Contas de serviço > Gerar nova chave
 *   2. Salve como serviceAccount.json na raiz do projeto (já está no .gitignore)
 *   3. node scripts/criar-admin.mjs "email@oficina.com" "senha123" "Nome do Admin"
 */

import { readFileSync, existsSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const OFICINA_ID = process.env.OFICINA_ID ?? 'maurina'
const ID_BANCO = process.env.FIRESTORE_DATABASE_ID ?? 'default'
const CAMINHO_CHAVE = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './serviceAccount.json'

const [email, senha, nome = 'Administrador'] = process.argv.slice(2)

if (!email || !senha) {
  console.error('\nUso: node scripts/criar-admin.mjs "email@oficina.com" "senha123" "Nome"\n')
  process.exit(1)
}

if (senha.length < 6) {
  console.error('A senha precisa ter no mínimo 6 caracteres.')
  process.exit(1)
}

if (!existsSync(CAMINHO_CHAVE)) {
  console.error(
    `\nChave de serviço não encontrada em ${CAMINHO_CHAVE}.\n` +
      'Console do Firebase > Configurações do projeto > Contas de serviço > Gerar nova chave privada.\n',
  )
  process.exit(1)
}

const credencial = JSON.parse(readFileSync(CAMINHO_CHAVE, 'utf8'))
initializeApp({ credential: cert(credencial) })

const auth = getAuth()
const db = getFirestore(ID_BANCO)

/** Se o e-mail já existe, reaproveita a conta em vez de estourar. */
async function obterOuCriarUsuario() {
  try {
    const existente = await auth.getUserByEmail(email)
    console.log(`Usuário já existia no Auth (${existente.uid}). Atualizando a senha.`)
    await auth.updateUser(existente.uid, { password: senha, displayName: nome })
    return existente.uid
  } catch (erro) {
    if (erro.code !== 'auth/user-not-found') throw erro
    const novo = await auth.createUser({ email, password: senha, displayName: nome })
    console.log(`Usuário criado no Auth (${novo.uid}).`)
    return novo.uid
  }
}

const uid = await obterOuCriarUsuario()

const agora = FieldValue.serverTimestamp()

// Índice raiz: é daqui que as Rules descobrem oficina e papel.
await db.doc(`usuariosIndex/${uid}`).set({ oficinaId: OFICINA_ID, papel: 'admin', ativo: true })

await db.doc(`oficinas/${OFICINA_ID}/usuarios/${uid}`).set({
  nome,
  email,
  papel: 'admin',
  ativo: true,
  criadoEm: agora,
  atualizadoEm: agora,
  criadoPor: uid,
  excluidoEm: null,
})

// Configuração inicial. `merge` para não zerar o contador de OS se rodar de novo.
await db.doc(`oficinas/${OFICINA_ID}/config/geral`).set(
  {
    nome: 'Maurina AutoCar',
    contadorOS: 0,
    anoContador: new Date().getFullYear(),
    revisaoPadraoKm: 10000,
    revisaoPadraoMeses: 6,
    garantiaPadraoMeses: 3,
  },
  { merge: true },
)

console.log(`
Pronto.

  Oficina: ${OFICINA_ID}
  Admin:   ${email}
  Papel:   admin

Entre no app com esse e-mail e senha.
Os demais usuários (atendente e mecânico) serão criados dentro do app, na Fase 3.
Até lá, use este mesmo script trocando o papel no documento /usuariosIndex/{uid}.
`)

process.exit(0)
