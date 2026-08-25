import { useCallback, useEffect, useState } from 'react'
import { deleteApp, initializeApp, getApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth'
import { onSnapshot, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { colUsuarios, refUsuario, refUsuarioIndex } from '@/lib/paths'
import { auditoriaEdicao, comId, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import type { Papel, Usuario } from '@/types'

/**
 * Gestão de acessos.
 *
 * Criar um usuário no Firebase Auth pelo cliente trocaria a sessão atual —
 * o admin cadastraria o atendente e seria deslogado no lugar dele. Por isso a
 * criação roda num app Firebase **secundário**, descartado logo em seguida:
 * a sessão do admin nem fica sabendo.
 *
 * Alternativa seria uma Cloud Function com Admin SDK, que exige plano pago.
 * Não vale a conta para uma oficina que cadastra três pessoas por ano.
 */

export function useUsuarios() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId) return

    return onSnapshot(
      query(colUsuarios(oficinaId), soNaoExcluidos()),
      (snap) => {
        setUsuarios(snap.docs.map((d) => comId<Usuario>(d)))
        setCarregando(false)
      },
      (e) => {
        console.error('[Usuários] Falha ao carregar:', e)
        setCarregando(false)
      },
    )
  }, [oficinaId])

  return { usuarios, carregando }
}

export function useAcoesUsuario() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const admin = useAuthStore((e) => e.usuario)

  const criar = useCallback(
    async (dados: { nome: string; email: string; senha: string; papel: Papel }): Promise<void> => {
      if (!oficinaId || !admin) throw new Error('Sessão não carregada.')

      const principal = getApp()
      const nomeApp = `criacao-usuario-${Date.now()}`
      const secundario = initializeApp(principal.options, nomeApp)

      try {
        const authSecundario = getAuth(secundario)
        const credencial = await createUserWithEmailAndPassword(
          authSecundario,
          dados.email.trim(),
          dados.senha,
        )

        await updateProfile(credencial.user, { displayName: dados.nome.trim() })
        const uid = credencial.user.uid

        // Índice raiz primeiro: é ele que as Rules consultam para autorizar
        // a escrita do perfil logo abaixo.
        await setDoc(refUsuarioIndex(uid), { oficinaId, papel: dados.papel, ativo: true })

        await setDoc(refUsuario(oficinaId, uid), {
          nome: dados.nome.trim(),
          email: dados.email.trim(),
          papel: dados.papel,
          ativo: true,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
          criadoPor: admin.id,
          excluidoEm: null,
        })
      } finally {
        // Descarta o app secundário para não deixar duas sessões vivas no aparelho.
        await deleteApp(secundario)
      }
    },
    [oficinaId, admin],
  )

  const definirAtivo = useCallback(
    async (uid: string, ativo: boolean): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      if (uid === admin?.id) throw new Error('Você não pode desativar o próprio acesso.')

      const alvo = await import('firebase/firestore').then((m) => m.getDoc(refUsuarioIndex(uid)))
      const papel = alvo.exists() ? (alvo.data().papel as Papel) : 'atendente'

      await setDoc(refUsuarioIndex(uid), { oficinaId, papel, ativo })
      await updateDoc(refUsuario(oficinaId, uid), { ativo, ...auditoriaEdicao() })
    },
    [oficinaId, admin],
  )

  const mudarPapel = useCallback(
    async (uid: string, papel: Papel): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      if (uid === admin?.id) throw new Error('Você não pode mudar o próprio papel.')

      await setDoc(refUsuarioIndex(uid), { oficinaId, papel, ativo: true })
      await updateDoc(refUsuario(oficinaId, uid), { papel, ...auditoriaEdicao() })
    },
    [oficinaId, admin],
  )

  return { criar, definirAtivo, mudarPapel }
}

/** Traduz o erro do Auth para o balcão. */
export function mensagemErroCriacao(erro: unknown): string {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? String(erro.code) : ''

  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Já existe um acesso com esse e-mail.'
    case 'auth/invalid-email':
      return 'E-mail inválido.'
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.'
    case 'permission-denied':
      return 'Só o administrador cadastra acessos.'
    default:
      return erro instanceof Error ? erro.message : 'Não foi possível criar o acesso.'
  }
}
