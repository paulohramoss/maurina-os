import { useCallback, useEffect, useState } from 'react'
import { addDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { colCatalogoPecas, colCatalogoServicos } from '@/lib/paths'
import { doc } from 'firebase/firestore'
import { auditoriaEdicao, auditoriaNova, comId, semUndefined, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import type { Centavos, ItemCatalogoPeca, ItemCatalogoServico } from '@/types'

/**
 * Catálogo de peças e serviços com preço padrão.
 *
 * Serve ao autocomplete do orçamento: a oficina troca pastilha toda semana,
 * e ninguém deveria redigitar descrição e preço a cada OS.
 */
export function useCatalogo() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [pecas, setPecas] = useState<ItemCatalogoPeca[]>([])
  const [servicos, setServicos] = useState<ItemCatalogoServico[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId) return

    const cancelarPecas = onSnapshot(
      query(colCatalogoPecas(oficinaId), soNaoExcluidos(), orderBy('descricao')),
      (snap) => {
        setPecas(snap.docs.map((d) => comId<ItemCatalogoPeca>(d)))
        setCarregando(false)
      },
      (e) => {
        console.error('[Catálogo] Peças:', e)
        setCarregando(false)
      },
    )

    const cancelarServicos = onSnapshot(
      query(colCatalogoServicos(oficinaId), soNaoExcluidos(), orderBy('descricao')),
      (snap) => setServicos(snap.docs.map((d) => comId<ItemCatalogoServico>(d))),
      (e) => console.error('[Catálogo] Serviços:', e),
    )

    return () => {
      cancelarPecas()
      cancelarServicos()
    }
  }, [oficinaId])

  return {
    pecas: pecas.filter((p) => p.ativo),
    servicos: servicos.filter((s) => s.ativo),
    todasPecas: pecas,
    todosServicos: servicos,
    carregando,
  }
}

export function useAcoesCatalogo() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const uid = useAuthStore((e) => e.usuario?.id)

  const criarPeca = useCallback(
    async (dados: { descricao: string; valorPadrao: Centavos; codigo?: string; fornecedor?: string; garantiaMeses?: number }) => {
      if (!oficinaId || !uid) throw new Error('Sessão não carregada.')
      await addDoc(
        colCatalogoPecas(oficinaId),
        semUndefined({ ...dados, ativo: true, ...auditoriaNova(uid) }),
      )
    },
    [oficinaId, uid],
  )

  const criarServico = useCallback(
    async (dados: { descricao: string; valorPadrao: Centavos; tempoEstimadoMin?: number }) => {
      if (!oficinaId || !uid) throw new Error('Sessão não carregada.')
      await addDoc(
        colCatalogoServicos(oficinaId),
        semUndefined({ ...dados, ativo: true, ...auditoriaNova(uid) }),
      )
    },
    [oficinaId, uid],
  )

  const atualizar = useCallback(
    async (tipo: 'peca' | 'servico', id: string, dados: Record<string, unknown>) => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      const colecao = tipo === 'peca' ? colCatalogoPecas(oficinaId) : colCatalogoServicos(oficinaId)
      await updateDoc(doc(colecao, id), semUndefined({ ...dados, ...auditoriaEdicao() }))
    },
    [oficinaId],
  )

  const excluir = useCallback(
    async (tipo: 'peca' | 'servico', id: string) => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      const colecao = tipo === 'peca' ? colCatalogoPecas(oficinaId) : colCatalogoServicos(oficinaId)
      await updateDoc(doc(colecao, id), {
        excluidoEm: serverTimestamp(),
        ativo: false,
        ...auditoriaEdicao(),
      })
    },
    [oficinaId],
  )

  return { criarPeca, criarServico, atualizar, excluir }
}
