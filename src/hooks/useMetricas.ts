import { useEffect, useMemo, useState } from 'react'
import { onSnapshot, orderBy, query, Timestamp, where, limit } from 'firebase/firestore'
import { colOrdens, colVeiculos } from '@/lib/paths'
import { comId, soNaoExcluidos } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import { periodo } from '@/utils/data'
import type { Centavos, OrdemServico, Veiculo } from '@/types'

/**
 * Números do dashboard e do financeiro.
 *
 * Faturamento conta OS **entregue** — orçamento aprovado que ainda não saiu do
 * pátio não é dinheiro no caixa, e contar como se fosse é o jeito mais rápido
 * de a oficina achar que ganhou o que ainda não ganhou.
 */

export interface Metricas {
  faturamentoMes: Centavos
  faturamentoHoje: Centavos
  ticketMedio: Centavos
  entreguesNoMes: number
  aReceber: Centavos
  osComSaldo: number
  carregando: boolean
}

export function useMetricas(referencia: Date = new Date()): Metricas {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [carregando, setCarregando] = useState(true)

  const inicioMes = useMemo(() => periodo.startOfMonth(referencia), [referencia.getMonth(), referencia.getFullYear()])
  const fimMes = useMemo(() => periodo.endOfMonth(referencia), [referencia.getMonth(), referencia.getFullYear()])

  useEffect(() => {
    if (!oficinaId) return

    // Uma consulta só, pela data de entrada do mês: o Firestore não faz OR,
    // e filtrar em memória 200 documentos é mais barato que três consultas.
    setCarregando(true)
    return onSnapshot(
      query(
        colOrdens(oficinaId),
        soNaoExcluidos(),
        where('dataEntrada', '>=', Timestamp.fromDate(inicioMes)),
        orderBy('dataEntrada', 'desc'),
        limit(500),
      ),
      (snap) => {
        setOrdens(snap.docs.map((d) => comId<OrdemServico>(d)))
        setCarregando(false)
      },
      (e) => {
        console.error('[Métricas] Falha ao carregar:', e)
        setCarregando(false)
      },
    )
  }, [oficinaId, inicioMes])

  return useMemo(() => {
    const entregues = ordens.filter((o) => {
      if (o.status !== 'entregue' || !o.dataSaida) return false
      const saida = o.dataSaida.toDate()
      return saida >= inicioMes && saida <= fimMes
    })

    const faturamentoMes = entregues.reduce((soma, o) => soma + o.valorTotal, 0)

    const inicioHoje = periodo.startOfDay(new Date())
    const faturamentoHoje = entregues
      .filter((o) => o.dataSaida && o.dataSaida.toDate() >= inicioHoje)
      .reduce((soma, o) => soma + o.valorTotal, 0)

    const comSaldo = ordens.filter((o) => {
      const pago = o.pagamento?.valorPago ?? 0
      return o.status !== 'cancelada' && o.valorTotal > pago
    })

    return {
      faturamentoMes,
      faturamentoHoje,
      ticketMedio: entregues.length > 0 ? Math.round(faturamentoMes / entregues.length) : 0,
      entreguesNoMes: entregues.length,
      aReceber: comSaldo.reduce((soma, o) => soma + (o.valorTotal - (o.pagamento?.valorPago ?? 0)), 0),
      osComSaldo: comSaldo.length,
      carregando,
    }
  }, [ordens, inicioMes, fimMes, carregando])
}

/**
 * Veículos que passaram do ponto de revisão.
 *
 * Vira campanha de retorno: é a lista de quem a oficina deveria estar ligando
 * hoje, em vez de esperar o carro quebrar e ir para outro lugar.
 */
export function useAlertasRevisao() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId) return

    return onSnapshot(
      query(
        colVeiculos(oficinaId),
        soNaoExcluidos(),
        where('proximaRevisaoData', '<=', Timestamp.fromDate(new Date())),
        orderBy('proximaRevisaoData', 'asc'),
        limit(100),
      ),
      (snap) => {
        setVeiculos(snap.docs.map((d) => comId<Veiculo>(d)))
        setCarregando(false)
      },
      (e) => {
        console.error('[Revisões] Falha ao carregar:', e)
        setCarregando(false)
      },
    )
  }, [oficinaId])

  /** Também estão vencidos os que rodaram além do KM previsto. */
  const porKm = veiculos.filter(
    (v) => v.proximaRevisaoKm != null && v.kmAtual >= v.proximaRevisaoKm,
  )

  return { veiculos, porKm, carregando }
}
