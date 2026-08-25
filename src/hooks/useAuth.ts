import { useEffect } from 'react'
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getDoc } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import { refUsuario, refUsuarioIndex } from '@/lib/paths'
import { useAuthStore } from '@/store/authStore'
import type { Usuario, UsuarioIndex } from '@/types'

/**
 * Sessão do usuário.
 *
 * O login devolve só um uid. Quem diz a oficina e o papel é o Firestore
 * (/usuariosIndex/{uid}), que só a Cloud Function escreve — ninguém vira
 * admin mexendo no navegador.
 */

export function useObservadorSessao(): void {
  const { definirSessao, limparSessao, marcarCarregando } = useAuthStore()

  useEffect(() => {
    // O login sobrevive a fechar o app: a oficina não vai logar toda hora.
    void setPersistence(auth, browserLocalPersistence)

    return onAuthStateChanged(auth, (user: User | null) => {
      if (!user) {
        limparSessao()
        return
      }

      marcarCarregando()

      void (async () => {
        try {
          const indice = await getDoc(refUsuarioIndex(user.uid))

          if (!indice.exists()) {
            await signOut(auth)
            limparSessao('Este acesso ainda não está vinculado a uma oficina. Fale com o administrador.')
            return
          }

          const dadosIndice = indice.data() as UsuarioIndex

          if (!dadosIndice.ativo) {
            await signOut(auth)
            limparSessao('Acesso desativado. Fale com o administrador da oficina.')
            return
          }

          const perfil = await getDoc(refUsuario(dadosIndice.oficinaId, user.uid))

          if (!perfil.exists()) {
            await signOut(auth)
            limparSessao('Cadastro do usuário não encontrado na oficina.')
            return
          }

          definirSessao({
            usuario: { ...(perfil.data() as Omit<Usuario, 'id'>), id: user.uid },
            oficinaId: dadosIndice.oficinaId,
          })
        } catch (erro) {
          console.error('[Auth] Falha ao carregar a sessão:', erro)
          limparSessao('Não foi possível carregar seu acesso. Verifique a conexão e tente de novo.')
        }
      })()
    })
  }, [definirSessao, limparSessao, marcarCarregando])
}

export async function entrar(email: string, senha: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), senha)
}

export async function sair(): Promise<void> {
  await signOut(auth)
}

/** Traduz o código do Firebase para algo que o atendente entenda. */
export function mensagemErroLogin(erro: unknown): string {
  const codigo =
    typeof erro === 'object' && erro !== null && 'code' in erro ? String(erro.code) : ''

  switch (codigo) {
    case 'auth/invalid-email':
      return 'E-mail inválido.'
    case 'auth/user-disabled':
      return 'Este acesso foi desativado.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Espere um minuto e tente de novo.'
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique a internet da oficina.'
    default:
      return 'Não foi possível entrar. Tente de novo.'
  }
}
