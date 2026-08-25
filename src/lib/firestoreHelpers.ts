import {
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import type { Auditoria } from '@/types'

/** Documento + id, do jeito que as telas consomem. */
export function comId<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { ...(snap.data() as Omit<T, 'id'>), id: snap.id } as T
}

/**
 * Soft delete em tudo: nada some do banco.
 * Toda query de listagem carrega este filtro — inclusive as compostas,
 * por isso `excluidoEm` é o primeiro campo dos índices.
 */
export const soNaoExcluidos = (): QueryConstraint => where('excluidoEm', '==', null)

/** Campos de auditoria na criação. */
export function auditoriaNova(uid: string): Auditoria {
  return {
    criadoEm: serverTimestamp() as unknown as Timestamp,
    atualizadoEm: serverTimestamp() as unknown as Timestamp,
    criadoPor: uid,
    excluidoEm: null,
  }
}

/** Campos de auditoria na edição. */
export function auditoriaEdicao(): Pick<Auditoria, 'atualizadoEm'> {
  return { atualizadoEm: serverTimestamp() as unknown as Timestamp }
}

/**
 * Firestore recusa `undefined`. Formulário produz `undefined` o tempo todo
 * (campo opcional em branco), então tudo passa por aqui antes de gravar.
 */
export function semUndefined<T extends Record<string, unknown>>(objeto: T): T {
  const limpo: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(objeto)) {
    if (valor === undefined) continue
    limpo[chave] =
      valor !== null && typeof valor === 'object' && !Array.isArray(valor) && !(valor instanceof Timestamp) && !('_methodName' in (valor as object))
        ? semUndefined(valor as Record<string, unknown>)
        : valor
  }
  return limpo as T
}

/** Mensagem de erro do Firestore em português de balcão. */
export function mensagemErroFirestore(erro: unknown): string {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? String(erro.code) : ''

  switch (codigo) {
    case 'permission-denied':
      return 'Seu perfil não tem permissão para isso.'
    case 'unavailable':
    case 'failed-precondition':
      return 'Sem conexão com o servidor. O que você fez ficou salvo no aparelho e sobe sozinho.'
    case 'not-found':
      return 'Registro não encontrado.'
    case 'already-exists':
      return 'Esse registro já existe.'
    default:
      return 'Não foi possível salvar. Tente de novo.'
  }
}
