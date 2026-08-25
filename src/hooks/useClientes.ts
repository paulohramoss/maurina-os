import { useCallback, useEffect, useState } from 'react'
import {
  addDoc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { colClientes, refCliente } from '@/lib/paths'
import { auditoriaEdicao, auditoriaNova, comId, semUndefined, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import { normalizarBusca, FIM_PREFIXO } from '@/utils/texto'
import { apenasDigitos } from '@/utils/documento'
import type { Cliente } from '@/types'

export type DadosCliente = Omit<Cliente, keyof import('@/types').Auditoria | 'id' | 'nomeBusca'>

export function useClientes(termoBusca = '') {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId) return

    const termo = normalizarBusca(termoBusca)

    const consulta = termo
      ? query(
          colClientes(oficinaId),
          soNaoExcluidos(),
          where('nomeBusca', '>=', termo),
          where('nomeBusca', '<=', termo + FIM_PREFIXO),
          orderBy('nomeBusca'),
          limit(30),
        )
      : query(colClientes(oficinaId), soNaoExcluidos(), orderBy('nomeBusca'), limit(50))

    setCarregando(true)
    return onSnapshot(
      consulta,
      (snap) => {
        setClientes(snap.docs.map((d) => comId<Cliente>(d)))
        setCarregando(false)
      },
      (erro) => {
        console.error('[Clientes] Falha ao carregar:', erro)
        setCarregando(false)
      },
    )
  }, [oficinaId, termoBusca])

  return { clientes, carregando }
}

export function useCliente(clienteId: string | undefined) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId || !clienteId) {
      setCarregando(false)
      return
    }
    return onSnapshot(refCliente(oficinaId, clienteId), (snap) => {
      setCliente(snap.exists() ? ({ ...(snap.data() as Omit<Cliente, 'id'>), id: snap.id }) : null)
      setCarregando(false)
    })
  }, [oficinaId, clienteId])

  return { cliente, carregando }
}

export function useAcoesCliente() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const uid = useAuthStore((e) => e.usuario?.id)

  const criar = useCallback(
    async (dados: DadosCliente): Promise<string> => {
      if (!oficinaId || !uid) throw new Error('Sessão não carregada.')

      const ref = await addDoc(
        colClientes(oficinaId),
        semUndefined({
          ...dados,
          telefone: apenasDigitos(dados.telefone),
          whatsapp: apenasDigitos(dados.whatsapp || dados.telefone),
          cpfCnpj: dados.cpfCnpj ? apenasDigitos(dados.cpfCnpj) : undefined,
          nomeBusca: normalizarBusca(dados.nome),
          ...auditoriaNova(uid),
        }),
      )
      return ref.id
    },
    [oficinaId, uid],
  )

  const atualizar = useCallback(
    async (clienteId: string, dados: Partial<DadosCliente>): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')

      await updateDoc(
        refCliente(oficinaId, clienteId),
        semUndefined({
          ...dados,
          ...(dados.telefone ? { telefone: apenasDigitos(dados.telefone) } : {}),
          ...(dados.whatsapp ? { whatsapp: apenasDigitos(dados.whatsapp) } : {}),
          ...(dados.cpfCnpj ? { cpfCnpj: apenasDigitos(dados.cpfCnpj) } : {}),
          ...(dados.nome ? { nomeBusca: normalizarBusca(dados.nome) } : {}),
          ...auditoriaEdicao(),
        }),
      )
    },
    [oficinaId],
  )

  /** Soft delete: some da lista, continua no banco. */
  const excluir = useCallback(
    async (clienteId: string): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      await updateDoc(refCliente(oficinaId, clienteId), {
        excluidoEm: serverTimestamp(),
        ...auditoriaEdicao(),
      })
    },
    [oficinaId],
  )

  /** Busca por telefone — o atendente lembra do número antes do nome. */
  const buscarPorTelefone = useCallback(
    async (telefone: string): Promise<Cliente[]> => {
      if (!oficinaId) return []
      const digitos = apenasDigitos(telefone)
      if (digitos.length < 8) return []

      const snap = await getDocs(
        query(colClientes(oficinaId), soNaoExcluidos(), where('telefone', '==', digitos), limit(5)),
      )
      return snap.docs.map((d) => comId<Cliente>(d))
    },
    [oficinaId],
  )

  const buscarPorId = useCallback(
    async (clienteId: string): Promise<Cliente | null> => {
      if (!oficinaId) return null
      const snap = await getDoc(refCliente(oficinaId, clienteId))
      return snap.exists() ? { ...(snap.data() as Omit<Cliente, 'id'>), id: snap.id } : null
    },
    [oficinaId],
  )

  return { criar, atualizar, excluir, buscarPorTelefone, buscarPorId }
}
