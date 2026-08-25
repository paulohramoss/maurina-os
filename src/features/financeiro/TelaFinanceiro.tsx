import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePagamentos, rotuloForma } from '@/hooks/usePagamentos'
import { useOrdens } from '@/hooks/useOrdens'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { Botao } from '@/components/ui/Botao'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarData, formatarDataHora, paraInputData, periodo } from '@/utils/data'
import { formatarPlaca } from '@/utils/placa'
import { saldoDevedor } from '@/domain/calculoOS'
import { exportarCSV } from '@/utils/csv'
import type { FormaPagamento, OrdemServico } from '@/types'

type Painel = 'caixa' | 'receber' | 'periodo'

/**
 * Financeiro da oficina.
 *
 * Três perguntas, três painéis: "quanto entrou hoje?", "quem me deve?" e
 * "como foi o mês?". Sem gráfico enfeitado — números grandes e legíveis,
 * porque isso aqui é conferido às pressas no fim do expediente.
 */
export function TelaFinanceiro() {
  const [painel, setPainel] = useState<Painel>('caixa')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">Financeiro</h1>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-grafite-800 px-4 md:mx-0 md:px-0">
        {(
          [
            { chave: 'caixa', rotulo: 'Caixa do dia' },
            { chave: 'receber', rotulo: 'A receber' },
            { chave: 'periodo', rotulo: 'Fechamento' },
          ] as const
        ).map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setPainel(a.chave)}
            className={[
              'min-h-toque whitespace-nowrap border-b-2 px-4 text-sm transition-colors',
              painel === a.chave
                ? 'border-acento-500 font-medium text-acento-400'
                : 'border-transparent text-grafite-400 hover:text-grafite-200',
            ].join(' ')}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      {painel === 'caixa' && <CaixaDoDia />}
      {painel === 'receber' && <ContasAReceber />}
      {painel === 'periodo' && <Fechamento />}
    </div>
  )
}

function CaixaDoDia() {
  const hoje = new Date()
  const de = useMemo(() => periodo.startOfDay(hoje), [hoje.toDateString()])
  const ate = useMemo(() => periodo.endOfDay(hoje), [hoje.toDateString()])

  const { pagamentos, total, carregando } = usePagamentos({ de, ate, quantidade: 200 })

  const porForma = pagamentos.reduce<Record<string, number>>((mapa, p) => {
    mapa[p.forma] = (mapa[p.forma] ?? 0) + p.valor
    return mapa
  }, {})

  return (
    <div className="flex flex-col gap-4">
      <div className="superficie rounded-xl p-4 text-center">
        <p className="text-sm texto-fraco">Entrou hoje · {formatarData(hoje)}</p>
        <p className="font-mono text-4xl font-bold text-acento-400">{formatarMoeda(total)}</p>
        <p className="text-sm texto-fraco">
          {pagamentos.length} {pagamentos.length === 1 ? 'recebimento' : 'recebimentos'}
        </p>
      </div>

      {Object.keys(porForma).length > 0 && (
        <section className="superficie rounded-xl p-4">
          <h2 className="mb-2 font-titulo text-lg uppercase text-grafite-200">Por forma</h2>
          <dl className="flex flex-col gap-1.5">
            {Object.entries(porForma)
              .sort(([, a], [, b]) => b - a)
              .map(([forma, valor]) => (
                <div key={forma} className="flex justify-between gap-3 text-sm">
                  <dt className="text-grafite-200">{rotuloForma(forma as FormaPagamento)}</dt>
                  <dd className="font-mono text-grafite-100">{formatarMoeda(valor)}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      {carregando ? (
        <EsqueletoLinha quantidade={3} />
      ) : pagamentos.length === 0 ? (
        <Vazio titulo="Nada recebido hoje" descricao="Os recebimentos aparecem aqui assim que forem lançados na OS." />
      ) : (
        <ul className="flex flex-col gap-2">
          {pagamentos.map((p) => (
            <li key={p.id}>
              <Link
                to={`/os/${p.osId}`}
                className="superficie flex min-h-toque items-center justify-between gap-3 rounded-xl p-3 hover:bg-grafite-800"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-sm text-grafite-100">OS {p.osNumero}</span>
                  <span className="block text-sm texto-fraco">
                    {rotuloForma(p.forma)}
                    {p.parcelas && p.parcelas > 1 && ` em ${p.parcelas}x`} ·{' '}
                    {formatarDataHora(p.recebidoEm)}
                  </span>
                </span>
                <span className="shrink-0 font-mono font-semibold text-sucesso">
                  {formatarMoeda(p.valor)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ContasAReceber() {
  const { ordens, carregando } = useOrdens({ quantidade: 200 })

  const devedoras = ordens
    .filter((o) => {
      if (o.status === 'cancelada' || o.valorTotal === 0) return false
      return saldoDevedor(o.valorTotal, o.pagamento?.valorPago ?? 0) > 0
    })
    .sort((a, b) => {
      // Carro já entregue e não pago é o que dói: aparece primeiro.
      const entregueA = a.status === 'entregue' ? 0 : 1
      const entregueB = b.status === 'entregue' ? 0 : 1
      return entregueA - entregueB
    })

  const total = devedoras.reduce(
    (soma, o) => soma + saldoDevedor(o.valorTotal, o.pagamento?.valorPago ?? 0),
    0,
  )
  const entregues = devedoras.filter((o) => o.status === 'entregue')
  const totalEntregues = entregues.reduce(
    (soma, o) => soma + saldoDevedor(o.valorTotal, o.pagamento?.valorPago ?? 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="superficie rounded-xl p-4">
          <p className="text-xs texto-fraco">Total em aberto</p>
          <p className="font-mono text-2xl font-bold text-grafite-50">{formatarMoeda(total)}</p>
          <p className="text-xs texto-fraco">{devedoras.length} OS</p>
        </div>
        <div className="superficie rounded-xl border-alerta/40 p-4">
          <p className="text-xs texto-fraco">Já entregue e não pago</p>
          <p className="font-mono text-2xl font-bold text-alerta">{formatarMoeda(totalEntregues)}</p>
          <p className="text-xs texto-fraco">{entregues.length} OS</p>
        </div>
      </div>

      {devedoras.length > 0 && (
        <Botao
          variante="secundario"
          onClick={() =>
            exportarCSV(
              'contas-a-receber',
              devedoras.map((o) => ({
                OS: o.numero,
                Cliente: o.snapshotCliente.nome,
                Telefone: o.snapshotCliente.telefone,
                Placa: formatarPlaca(o.snapshotVeiculo.placa),
                Situacao: o.status,
                Total: o.valorTotal / 100,
                Pago: (o.pagamento?.valorPago ?? 0) / 100,
                Saldo: saldoDevedor(o.valorTotal, o.pagamento?.valorPago ?? 0) / 100,
              })),
            )
          }
        >
          Exportar CSV
        </Botao>
      )}

      {carregando ? (
        <EsqueletoLinha quantidade={3} />
      ) : devedoras.length === 0 ? (
        <Vazio titulo="Nada a receber" descricao="Todas as OS estão quitadas. Bom sinal." />
      ) : (
        <ul className="flex flex-col gap-2">
          {devedoras.map((o) => (
            <LinhaDevedora key={o.id} os={o} />
          ))}
        </ul>
      )}
    </div>
  )
}

function LinhaDevedora({ os }: { os: OrdemServico }) {
  const saldo = saldoDevedor(os.valorTotal, os.pagamento?.valorPago ?? 0)
  const entregue = os.status === 'entregue'

  return (
    <li>
      <Link
        to={`/os/${os.id}`}
        className={[
          'superficie flex min-h-toque items-center justify-between gap-3 rounded-xl border-l-4 p-3 hover:bg-grafite-800',
          entregue ? 'border-l-alerta' : 'border-l-grafite-700',
        ].join(' ')}
      >
        <span className="min-w-0">
          <span className="block font-mono font-bold text-grafite-50">
            {formatarPlaca(os.snapshotVeiculo.placa)}
          </span>
          <span className="block truncate text-sm texto-fraco">
            {os.snapshotCliente.nome} · OS {os.numero}
            {entregue && ' · entregue'}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block font-mono font-semibold ${entregue ? 'text-alerta' : 'text-grafite-100'}`}>
            {formatarMoeda(saldo)}
          </span>
          {(os.pagamento?.valorPago ?? 0) > 0 && (
            <span className="block text-xs texto-fraco">
              de {formatarMoeda(os.valorTotal)}
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}

function Fechamento() {
  const hoje = new Date()
  const [de, setDe] = useState(paraInputData(periodo.startOfMonth(hoje)))
  const [ate, setAte] = useState(paraInputData(hoje))

  const inicio = useMemo(() => (de ? periodo.startOfDay(new Date(`${de}T12:00:00`)) : undefined), [de])
  const fim = useMemo(() => (ate ? periodo.endOfDay(new Date(`${ate}T12:00:00`)) : undefined), [ate])

  const { pagamentos, total, carregando } = usePagamentos({
    ...(inicio ? { de: inicio } : {}),
    ...(fim ? { ate: fim } : {}),
    quantidade: 500,
  })

  const porForma = pagamentos.reduce<Record<string, number>>((mapa, p) => {
    mapa[p.forma] = (mapa[p.forma] ?? 0) + p.valor
    return mapa
  }, {})

  const dias = new Set(pagamentos.map((p) => formatarData(p.recebidoEm))).size
  const media = dias > 0 ? Math.round(total / dias) : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-grafite-300">De</span>
          <input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            className="min-h-toque rounded-lg border border-grafite-700 bg-grafite-900 px-3 text-grafite-50 focus:border-acento-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-grafite-300">Até</span>
          <input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="min-h-toque rounded-lg border border-grafite-700 bg-grafite-900 px-3 text-grafite-50 focus:border-acento-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="superficie rounded-xl p-4 text-center">
        <p className="text-sm texto-fraco">Recebido no período</p>
        <p className="font-mono text-4xl font-bold text-acento-400">{formatarMoeda(total)}</p>
        <p className="text-sm texto-fraco">
          {pagamentos.length} {pagamentos.length === 1 ? 'recebimento' : 'recebimentos'}
          {dias > 0 && ` em ${dias} ${dias === 1 ? 'dia' : 'dias'} · média ${formatarMoeda(media)}/dia`}
        </p>
      </div>

      {Object.keys(porForma).length > 0 && (
        <section className="superficie rounded-xl p-4">
          <h2 className="mb-2 font-titulo text-lg uppercase text-grafite-200">Por forma</h2>
          <dl className="flex flex-col gap-2">
            {Object.entries(porForma)
              .sort(([, a], [, b]) => b - a)
              .map(([forma, valor]) => (
                <div key={forma} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <dt className="text-grafite-200">{rotuloForma(forma as FormaPagamento)}</dt>
                    <dd className="font-mono text-grafite-100">{formatarMoeda(valor)}</dd>
                  </div>
                  {/* Barra proporcional: dá a leitura da mistura sem virar gráfico. */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-grafite-800">
                    <div
                      className="h-full rounded-full bg-acento-500"
                      style={{ width: `${total > 0 ? (valor / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
          </dl>
        </section>
      )}

      {pagamentos.length > 0 && (
        <Botao
          variante="secundario"
          onClick={() =>
            exportarCSV(
              `recebimentos-${de}-a-${ate}`,
              pagamentos.map((p) => ({
                Data: formatarDataHora(p.recebidoEm),
                OS: p.osNumero,
                Forma: rotuloForma(p.forma),
                Parcelas: p.parcelas ?? 1,
                Valor: p.valor / 100,
              })),
            )
          }
        >
          Exportar CSV
        </Botao>
      )}

      {carregando && <EsqueletoLinha quantidade={2} />}
      {!carregando && pagamentos.length === 0 && (
        <Vazio titulo="Nada recebido no período" descricao="Escolha outras datas." />
      )}
    </div>
  )
}
