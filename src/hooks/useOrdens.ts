import { useEffect, useMemo, useState } from 'react'
import { limit, onSnapshot, orderBy, query, where, type QueryConstraint } from 'firebase/firestore'
import { colOrdens } from '@/lib/paths'
import { comId, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import { STATUS_NO_PATIO } from '@/domain/statusOS'
import { normalizarPlaca } from '@/utils/placa'
import type { OrdemServico, StatusOS } from '@/types'

export interface FiltrosOS {
  status?: StatusOS | 'todos' | 'patio'
  placa?: string
  clienteId?: string
  veiculoId?: string
  mecanicoId?: string
  quantidade?: number
}

/**
 * Lista de OS com filtros.
 *
 * O Firestore não faz OR nem LIKE: o filtro de status múltiplo usa `in`
 * (limite de 30 valores, folgado aqui) e a busca por placa é igualdade exata
 * sobre o snapshot — por isso a placa é normalizada antes de gravar.
 */
export function useOrdens(filtros: FiltrosOS = {}) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const {
    status = 'todos',
    placa = '',
    clienteId,
    veiculoId,
    mecanicoId,
    quantidade = 50,
  } = filtros

  const restricoes = useMemo<QueryConstraint[]>(() => {
    const lista: QueryConstraint[] = [soNaoExcluidos()]

    if (status === 'patio') lista.push(where('status', 'in', [...STATUS_NO_PATIO]))
    else if (status !== 'todos') lista.push(where('status', '==', status))

    const placaNormalizada = normalizarPlaca(placa)
    if (placaNormalizada.length === 7) {
      lista.push(where('snapshotVeiculo.placa', '==', placaNormalizada))
    }

    if (clienteId) lista.push(where('clienteId', '==', clienteId))
    if (veiculoId) lista.push(where('veiculoId', '==', veiculoId))
    if (mecanicoId) lista.push(where('mecanicoResponsavelId', '==', mecanicoId))

    lista.push(orderBy('dataEntrada', 'desc'), limit(quantidade))
    return lista
  }, [status, placa, clienteId, veiculoId, mecanicoId, quantidade])

  useEffect(() => {
    if (!oficinaId) return

    setCarregando(true)
    setErro(null)

    return onSnapshot(
      query(colOrdens(oficinaId), ...restricoes),
      (snap) => {
        setOrdens(snap.docs.map((d) => comId<OrdemServico>(d)))
        setCarregando(false)
      },
      (e) => {
        console.error('[Ordens] Falha ao carregar:', e)
        setErro('Não foi possível carregar as ordens de serviço.')
        setCarregando(false)
      },
    )
  }, [oficinaId, restricoes])

  return { ordens, carregando, erro }
}

/** Agrupa por status para o kanban do dashboard. */
export function agruparPorStatus(ordens: OrdemServico[]): Record<StatusOS, OrdemServico[]> {
  const grupos = {} as Record<StatusOS, OrdemServico[]>
  for (const os of ordens) {
    ;(grupos[os.status] ??= []).push(os)
  }
  return grupos
}
