import { useCallback, useEffect, useState } from 'react'
import {
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { colPagamentos, refOrdem } from '@/lib/paths'
import { auditoriaEdicao, auditoriaNova, comId, semUndefined, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import { saldoDevedor } from '@/domain/calculoOS'
import type { Centavos, FormaPagamento, OrdemServico, Pagamento } from '@/types'

/**
 * Recebimentos.
 *
 * Cada baixa gera um lançamento em /pagamentos (para o caixa do dia) e atualiza
 * o resumo dentro da própria OS — as duas coisas na mesma transação, senão o
 * caixa fecha com um valor e a OS diz outro.
 */
export function usePagamentos(
  filtro: { osId?: string; de?: Date; ate?: Date; quantidade?: number } = {},
) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [carregando, setCarregando] = useState(true)

  const { osId, de, ate, quantidade = 100 } = filtro
  const deMs = de?.getTime()
  const ateMs = ate?.getTime()

  useEffect(() => {
    if (!oficinaId) return

    const restricoes = [soNaoExcluidos()]
    if (osId) restricoes.push(where('osId', '==', osId))
    if (deMs != null) restricoes.push(where('recebidoEm', '>=', Timestamp.fromMillis(deMs)))
    if (ateMs != null) restricoes.push(where('recebidoEm', '<=', Timestamp.fromMillis(ateMs)))

    setCarregando(true)
    return onSnapshot(
      query(colPagamentos(oficinaId), ...restricoes, orderBy('recebidoEm', 'desc'), limit(quantidade)),
      (snap) => {
        setPagamentos(snap.docs.map((d) => comId<Pagamento>(d)))
        setCarregando(false)
      },
      (e) => {
        console.error('[Pagamentos] Falha ao carregar:', e)
        setCarregando(false)
      },
    )
  }, [oficinaId, osId, deMs, ateMs, quantidade])

  const total = pagamentos.reduce((soma, p) => soma + p.valor, 0)

  return { pagamentos, total, carregando }
}

export function useAcoesPagamento() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const usuario = useAuthStore((e) => e.usuario)

  const registrar = useCallback(
    async (
      os: OrdemServico,
      dados: {
        valor: Centavos
        forma: FormaPagamento
        parcelas?: number
        observacao?: string
        numeroNota?: string
      },
    ): Promise<void> => {
      if (!oficinaId || !usuario) throw new Error('Sessão não carregada.')
      if (dados.valor <= 0) throw new Error('Informe o valor recebido.')

      const pagamentoRef = doc(colPagamentos(oficinaId))
      const osRef = refOrdem(oficinaId, os.id)

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(osRef)
        if (!snap.exists()) throw new Error('OS não encontrada.')

        const atual = snap.data() as OrdemServico
        const jaPago = atual.pagamento?.valorPago ?? 0
        const novoPago = jaPago + dados.valor
        const saldo = saldoDevedor(atual.valorTotal, novoPago)

        tx.set(
          pagamentoRef,
          semUndefined({
            osId: os.id,
            osNumero: atual.numero,
            clienteId: atual.clienteId,
            valor: dados.valor,
            forma: dados.forma,
            parcelas: dados.parcelas,
            observacao: dados.observacao,
            recebidoEm: serverTimestamp(),
            ...auditoriaNova(usuario.id),
          }),
        )

        tx.update(
          osRef,
          semUndefined({
            pagamento: {
              status: saldo === 0 ? 'pago' : 'parcial',
              forma: dados.forma,
              parcelas: dados.parcelas,
              valorPago: novoPago,
              dataPagamento: serverTimestamp(),
              numeroNota: dados.numeroNota ?? atual.pagamento?.numeroNota,
            },
            ...auditoriaEdicao(),
          }),
        )
      })
    },
    [oficinaId, usuario],
  )

  /** "Vai pagar na retirada": deixa a situação definida sem lançar valor. */
  const definirPendente = useCallback(
    async (os: OrdemServico, forma?: FormaPagamento): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')

      await runTransaction(db, async (tx) => {
        const osRef = refOrdem(oficinaId, os.id)
        const snap = await tx.get(osRef)
        if (!snap.exists()) throw new Error('OS não encontrada.')

        const atual = snap.data() as OrdemServico
        tx.update(
          osRef,
          semUndefined({
            pagamento: {
              status: 'pendente',
              forma: forma ?? atual.pagamento?.forma,
              valorPago: atual.pagamento?.valorPago ?? 0,
            },
            ...auditoriaEdicao(),
          }),
        )
      })
    },
    [oficinaId],
  )

  return { registrar, definirPendente }
}

export const OPCOES_FORMA: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'debito', rotulo: 'Cartão de débito' },
  { valor: 'credito', rotulo: 'Cartão de crédito' },
  { valor: 'boleto', rotulo: 'Boleto' },
  { valor: 'prazo', rotulo: 'A prazo' },
]

export const rotuloForma = (forma: FormaPagamento): string =>
  OPCOES_FORMA.find((o) => o.valor === forma)?.rotulo ?? forma
