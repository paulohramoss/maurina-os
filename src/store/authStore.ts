import { create } from 'zustand'
import type { Papel, Usuario } from '@/types'

/**
 * Sessão: quem está logado, com que papel e em qual oficina.
 * Nada aqui vai para o localStorage — o Firebase Auth já cuida da persistência
 * do login, e papel/oficina são autoridade do servidor, não do navegador.
 */

interface EstadoAuth {
  /** null = deslogado. undefined = ainda carregando. */
  usuario: Usuario | null | undefined
  oficinaId: string | null
  papel: Papel | null
  /** Erro de sessão: usuário sem cadastro na oficina, ou desativado. */
  erroSessao: string | null

  definirSessao: (dados: { usuario: Usuario; oficinaId: string }) => void
  limparSessao: (erro?: string) => void
  marcarCarregando: () => void
}

export const useAuthStore = create<EstadoAuth>((set) => ({
  usuario: undefined,
  oficinaId: null,
  papel: null,
  erroSessao: null,

  definirSessao: ({ usuario, oficinaId }) =>
    set({ usuario, oficinaId, papel: usuario.papel, erroSessao: null }),

  limparSessao: (erro) =>
    set({ usuario: null, oficinaId: null, papel: null, erroSessao: erro ?? null }),

  marcarCarregando: () => set({ usuario: undefined, erroSessao: null }),
}))

/** Atalhos usados nas telas. */
export const usePapel = (): Papel | null => useAuthStore((e) => e.papel)
export const useOficinaId = (): string | null => useAuthStore((e) => e.oficinaId)
