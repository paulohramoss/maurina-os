import { useCallback, useEffect, useState } from 'react'
import {
  addDoc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { colVeiculos, refVeiculo } from '@/lib/paths'
import { auditoriaEdicao, auditoriaNova, comId, semUndefined, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import { normalizarPlaca } from '@/utils/placa'
import type { Auditoria, Veiculo } from '@/types'

export type DadosVeiculo = Omit<Veiculo, keyof Auditoria | 'id'>

/**
 * Busca por placa é o atalho mais usado do sistema.
 * Placa é única na oficina, então a consulta devolve no máximo um veículo —
 * mas o retorno é lista para o caso (raro) de cadastro duplicado antigo.
 */
export function useBuscaPorPlaca() {
  const oficinaId = useAuthStore((e) => e.oficinaId)

  return useCallback(
    async (placa: string): Promise<Veiculo[]> => {
      if (!oficinaId) return []
      const normalizada = normalizarPlaca(placa)
      if (normalizada.length < 7) return []

      const snap = await getDocs(
        query(colVeiculos(oficinaId), soNaoExcluidos(), where('placa', '==', normalizada), limit(5)),
      )
      return snap.docs.map((d) => comId<Veiculo>(d))
    },
    [oficinaId],
  )
}

/** Veículos de um cliente. */
export function useVeiculosDoCliente(clienteId: string | undefined) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId || !clienteId) {
      setVeiculos([])
      setCarregando(false)
      return
    }

    setCarregando(true)
    return onSnapshot(
      query(colVeiculos(oficinaId), soNaoExcluidos(), where('clienteId', '==', clienteId), orderBy('placa')),
      (snap) => {
        setVeiculos(snap.docs.map((d) => comId<Veiculo>(d)))
        setCarregando(false)
      },
      (erro) => {
        console.error('[Veículos] Falha ao carregar:', erro)
        setCarregando(false)
      },
    )
  }, [oficinaId, clienteId])

  return { veiculos, carregando }
}

export function useVeiculo(veiculoId: string | undefined) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId || !veiculoId) {
      setCarregando(false)
      return
    }
    return onSnapshot(refVeiculo(oficinaId, veiculoId), (snap) => {
      setVeiculo(snap.exists() ? { ...(snap.data() as Omit<Veiculo, 'id'>), id: snap.id } : null)
      setCarregando(false)
    })
  }, [oficinaId, veiculoId])

  return { veiculo, carregando }
}

export function useAcoesVeiculo() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const uid = useAuthStore((e) => e.usuario?.id)

  const criar = useCallback(
    async (dados: DadosVeiculo): Promise<string> => {
      if (!oficinaId || !uid) throw new Error('Sessão não carregada.')

      const ref = await addDoc(
        colVeiculos(oficinaId),
        semUndefined({
          ...dados,
          placa: normalizarPlaca(dados.placa),
          ...auditoriaNova(uid),
        }),
      )
      return ref.id
    },
    [oficinaId, uid],
  )

  const atualizar = useCallback(
    async (veiculoId: string, dados: Partial<DadosVeiculo>): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      await updateDoc(
        refVeiculo(oficinaId, veiculoId),
        semUndefined({
          ...dados,
          ...(dados.placa ? { placa: normalizarPlaca(dados.placa) } : {}),
          ...auditoriaEdicao(),
        }),
      )
    },
    [oficinaId],
  )

  const excluir = useCallback(
    async (veiculoId: string): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      await updateDoc(refVeiculo(oficinaId, veiculoId), {
        excluidoEm: serverTimestamp(),
        ...auditoriaEdicao(),
      })
    },
    [oficinaId],
  )

  const buscarPorId = useCallback(
    async (veiculoId: string): Promise<Veiculo | null> => {
      if (!oficinaId) return null
      const snap = await getDoc(refVeiculo(oficinaId, veiculoId))
      return snap.exists() ? { ...(snap.data() as Omit<Veiculo, 'id'>), id: snap.id } : null
    },
    [oficinaId],
  )

  return { criar, atualizar, excluir, buscarPorId }
}

export const OPCOES_COMBUSTIVEL = [
  { valor: 'flex', rotulo: 'Flex' },
  { valor: 'gasolina', rotulo: 'Gasolina' },
  { valor: 'etanol', rotulo: 'Etanol' },
  { valor: 'diesel', rotulo: 'Diesel' },
  { valor: 'gnv', rotulo: 'GNV' },
  { valor: 'eletrico', rotulo: 'Elétrico' },
  { valor: 'hibrido', rotulo: 'Híbrido' },
] as const
