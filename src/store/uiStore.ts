import { create } from 'zustand'

/**
 * Preferência de interface — a ÚNICA coisa que pode viver no navegador.
 * Dado de negócio nunca encosta em localStorage.
 */

type Tema = 'escuro' | 'claro'

const CHAVE_TEMA = 'maurina:tema'
const CHAVE_MECANICO = 'maurina:mecanico'

interface EstadoUI {
  tema: Tema
  /** Estado da conexão, mostrado no badge do topo. */
  online: boolean
  sincronizando: boolean
  /**
   * Quem está no aparelho do pátio. O login é compartilhado, então a autoria
   * do histórico vem daqui. Fica em sessionStorage: expira quando fecha o app.
   */
  mecanicoAtivoId: string | null
  mecanicoAtivoNome: string | null

  alternarTema: () => void
  definirOnline: (online: boolean) => void
  definirSincronizando: (v: boolean) => void
  definirMecanicoAtivo: (mecanico: { id: string; nome: string } | null) => void
}

function temaInicial(): Tema {
  if (typeof window === 'undefined') return 'escuro'
  const salvo = window.localStorage.getItem(CHAVE_TEMA)
  return salvo === 'claro' ? 'claro' : 'escuro'
}

function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  raiz.classList.toggle('claro', tema === 'claro')
  raiz.classList.toggle('dark', tema === 'escuro')
  window.localStorage.setItem(CHAVE_TEMA, tema)
}

function mecanicoInicial(): { id: string; nome: string } | null {
  if (typeof window === 'undefined') return null
  const bruto = window.sessionStorage.getItem(CHAVE_MECANICO)
  if (!bruto) return null
  try {
    const dados: unknown = JSON.parse(bruto)
    if (
      typeof dados === 'object' &&
      dados !== null &&
      'id' in dados &&
      'nome' in dados &&
      typeof dados.id === 'string' &&
      typeof dados.nome === 'string'
    ) {
      return { id: dados.id, nome: dados.nome }
    }
  } catch {
    // Sessão corrompida: só ignora e pergunta de novo quem está no aparelho.
  }
  return null
}

const mecanico = mecanicoInicial()

export const useUIStore = create<EstadoUI>((set, get) => ({
  tema: temaInicial(),
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  sincronizando: false,
  mecanicoAtivoId: mecanico?.id ?? null,
  mecanicoAtivoNome: mecanico?.nome ?? null,

  alternarTema: () => {
    const novo: Tema = get().tema === 'escuro' ? 'claro' : 'escuro'
    aplicarTema(novo)
    set({ tema: novo })
  },

  definirOnline: (online) => set({ online }),
  definirSincronizando: (sincronizando) => set({ sincronizando }),

  definirMecanicoAtivo: (m) => {
    if (m) {
      window.sessionStorage.setItem(CHAVE_MECANICO, JSON.stringify(m))
      set({ mecanicoAtivoId: m.id, mecanicoAtivoNome: m.nome })
    } else {
      window.sessionStorage.removeItem(CHAVE_MECANICO)
      set({ mecanicoAtivoId: null, mecanicoAtivoNome: null })
    }
  },
}))

/** Chamado uma vez no boot para o tema salvo valer já na primeira pintura. */
export function inicializarTema() {
  aplicarTema(temaInicial())
}
