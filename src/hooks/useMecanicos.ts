import { useCallback, useEffect, useState } from 'react'
import { addDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { colMecanicos, refMecanico } from '@/lib/paths'
import { auditoriaEdicao, auditoriaNova, comId, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import { capitalizarNome } from '@/utils/texto'
import type { Mecanico } from '@/types'

/**
 * A equipe do pátio.
 *
 * Mecânico não é conta de login: o aparelho da oficina tem um acesso só,
 * compartilhado, e quem está trabalhando se identifica escolhendo o nome
 * nesta lista. É daqui que sai a autoria do histórico da OS.
 */
export function useMecanicos() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId) return

    return onSnapshot(
      query(colMecanicos(oficinaId), soNaoExcluidos(), orderBy('nome')),
      (snap) => {
        setMecanicos(snap.docs.map((d) => comId<Mecanico>(d)))
        setCarregando(false)
      },
      (erro) => {
        console.error('[Mecânicos] Falha ao carregar:', erro)
        setCarregando(false)
      },
    )
  }, [oficinaId])

  return { mecanicos, ativos: mecanicos.filter((m) => m.ativo), carregando }
}

export function useAcoesMecanico() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const uid = useAuthStore((e) => e.usuario?.id)

  const criar = useCallback(
    async (nome: string, apelido?: string): Promise<string> => {
      if (!oficinaId || !uid) throw new Error('Sessão não carregada.')

      const ref = await addDoc(colMecanicos(oficinaId), {
        nome: capitalizarNome(nome),
        ...(apelido?.trim() ? { apelido: apelido.trim() } : {}),
        ativo: true,
        ...auditoriaNova(uid),
      })
      return ref.id
    },
    [oficinaId, uid],
  )

  /** Saiu da equipe: fica no banco (o histórico das OS antigas cita o nome). */
  const definirAtivo = useCallback(
    async (mecanicoId: string, ativo: boolean): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      await updateDoc(refMecanico(oficinaId, mecanicoId), { ativo, ...auditoriaEdicao() })
    },
    [oficinaId],
  )

  const excluir = useCallback(
    async (mecanicoId: string): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      await updateDoc(refMecanico(oficinaId, mecanicoId), {
        excluidoEm: serverTimestamp(),
        ativo: false,
        ...auditoriaEdicao(),
      })
    },
    [oficinaId],
  )

  return { criar, definirAtivo, excluir }
}
