import { Link } from 'react-router-dom'
import { useOrdens } from '@/hooks/useOrdens'
import { useMetricas, useAlertasRevisao } from '@/hooks/useMetricas'
import { BuscaPlaca } from '@/components/os/BuscaPlaca'
import { CartaoOS } from '@/components/os/CartaoOS'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { Botao } from '@/components/ui/Botao'
import { EtiquetaStatus } from '@/components/os/EtiquetaStatus'
import { ORDEM_STATUS, STATUS_NO_PATIO } from '@/domain/statusOS'
import { useAuthStore } from '@/store/authStore'
import { pode, vePrecos } from '@/domain/permissoes'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarPlaca } from '@/utils/placa'
import { formatarData } from '@/utils/data'
import type { StatusOS } from '@/types'

/**
 * Home. Responde as perguntas do dia, nesta ordem:
 * "cadê aquele carro?", "o que tem no pátio agora?", "quanto entrou este mês?"
 * e "quem eu deveria estar ligando?".
 */
export function TelaDashboard() {
  const usuario = useAuthStore((e) => e.usuario)
  const papel = useAuthStore((e) => e.papel)
  const { ordens, carregando } = useOrdens({ status: 'patio', quantidade: 100 })
  const metricas = useMetricas()
  const { veiculos: revisaoPorData, porKm } = useAlertasRevisao()

  const mostraDinheiro = vePrecos(papel)
  const primeiroNome = usuario?.nome.split(' ')[0] ?? ''

  const contagem = ORDEM_STATUS.filter((s) => STATUS_NO_PATIO.includes(s)).map((status) => ({
    status,
    total: ordens.filter((o) => o.status === status).length,
  }))

  // Um veículo pode estar vencido pelos dois critérios: não listar duas vezes.
  const revisoes = [...revisaoPorData, ...porKm.filter((v) => !revisaoPorData.some((r) => r.id === v.id))]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">
          Olá{primeiroNome ? `, ${primeiroNome}` : ''}
        </h1>
        <p className="text-sm texto-fraco">
          {ordens.length === 0
            ? 'Nenhum carro no pátio agora.'
            : `${ordens.length} ${ordens.length === 1 ? 'carro no pátio' : 'carros no pátio'}.`}
        </p>
      </div>

      <BuscaPlaca />

      {mostraDinheiro && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            rotulo="Faturamento do mês"
            valor={formatarMoeda(metricas.faturamentoMes)}
            detalhe={`${metricas.entreguesNoMes} ${metricas.entreguesNoMes === 1 ? 'carro entregue' : 'carros entregues'}`}
            destaque
          />
          <Indicador rotulo="Ticket médio" valor={formatarMoeda(metricas.ticketMedio)} />
          <Indicador rotulo="Entregue hoje" valor={formatarMoeda(metricas.faturamentoHoje)} />
          <Link to="/financeiro" className="block">
            <Indicador
              rotulo="A receber"
              valor={formatarMoeda(metricas.aReceber)}
              detalhe={`${metricas.osComSaldo} ${metricas.osComSaldo === 1 ? 'OS em aberto' : 'OS em aberto'}`}
              alerta={metricas.aReceber > 0}
            />
          </Link>
        </section>
      )}

      {/* Resumo por status: cada chip leva à lista já filtrada. */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {contagem.map(({ status, total }) => (
          <ChipStatus key={status} status={status} total={total} />
        ))}
      </section>

      {mostraDinheiro && revisoes.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-titulo text-xl uppercase text-grafite-100">
              Revisão vencida
              <span className="ml-2 text-sm font-normal texto-fraco">{revisoes.length}</span>
            </h2>
          </div>
          <p className="text-sm texto-fraco">
            Carros que passaram do ponto. É a lista de ligações de hoje.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {revisoes.slice(0, 6).map((v) => (
              <li key={v.id}>
                <Link
                  to={`/veiculos/${v.id}`}
                  className="superficie flex min-h-toque items-center justify-between gap-3 rounded-xl border-l-4 border-l-alerta p-3 hover:bg-grafite-800"
                >
                  <span className="min-w-0">
                    <span className="block font-mono font-bold text-grafite-50">
                      {formatarPlaca(v.placa)}
                    </span>
                    <span className="block truncate text-sm texto-fraco">
                      {v.marca} {v.modelo}
                      {v.proximaRevisaoData && ` · desde ${formatarData(v.proximaRevisaoData)}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-grafite-500">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-titulo text-xl uppercase text-grafite-100">No pátio</h2>
          <Link to="/os" className="text-sm text-acento-400 hover:underline">
            Ver todas
          </Link>
        </div>

        {carregando ? (
          <EsqueletoLinha quantidade={3} />
        ) : ordens.length === 0 ? (
          <Vazio
            titulo="Pátio vazio"
            descricao="Quando um carro entrar, abra a OS e ele aparece aqui."
            acao={
              pode(papel, 'os:criar') ? (
                <Link to="/os/nova">
                  <Botao tamanho="lg">Abrir OS</Botao>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ordens.map((os) => (
              <CartaoOS key={os.id} os={os} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  detalhe,
  destaque,
  alerta,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  destaque?: boolean
  alerta?: boolean
}) {
  return (
    <div
      className={[
        'superficie flex h-full flex-col justify-between gap-1 rounded-xl p-3',
        alerta ? 'border-alerta/40' : '',
      ].join(' ')}
    >
      <p className="text-xs texto-fraco">{rotulo}</p>
      <p
        className={[
          'font-mono font-bold leading-tight',
          destaque ? 'text-2xl text-acento-400' : 'text-xl text-grafite-50',
          alerta ? 'text-alerta' : '',
        ].join(' ')}
      >
        {valor}
      </p>
      {detalhe && <p className="text-xs texto-fraco">{detalhe}</p>}
    </div>
  )
}

function ChipStatus({ status, total }: { status: StatusOS; total: number }) {
  return (
    <Link
      to={`/os?status=${status}`}
      className="superficie flex min-h-toque flex-col justify-between gap-1 rounded-xl p-3 transition-colors hover:bg-grafite-800"
    >
      <span className="font-mono text-2xl font-bold text-grafite-50">{total}</span>
      <EtiquetaStatus status={status} tamanho="sm" />
    </Link>
  )
}
