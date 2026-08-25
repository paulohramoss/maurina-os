import { Link, useParams } from 'react-router-dom'
import { useVeiculo } from '@/hooks/useVeiculos'
import { useCliente } from '@/hooks/useClientes'
import { useOrdens } from '@/hooks/useOrdens'
import { Carregando, Vazio } from '@/components/ui/Carregando'
import { CartaoOS } from '@/components/os/CartaoOS'
import { IconeVoltar } from '@/components/layout/Icones'
import { formatarPlaca } from '@/utils/placa'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarData, revisaoVencida } from '@/utils/data'
import { vePrecos } from '@/domain/permissoes'
import { usePapel } from '@/store/authStore'
import { OPCOES_COMBUSTIVEL } from '@/hooks/useVeiculos'

/**
 * Histórico do veículo.
 *
 * É o diferencial que faz o cliente voltar: digitou a placa, aparece tudo que
 * já foi feito no carro, com data, quilometragem e o que foi trocado. Ninguém
 * paga duas vezes pela mesma peça sem perceber, e a oficina sabe o que sugerir.
 */
export function TelaFichaVeiculo() {
  const { id } = useParams<{ id: string }>()
  const { veiculo, carregando } = useVeiculo(id)
  const { cliente } = useCliente(veiculo?.clienteId)
  const { ordens } = useOrdens({ veiculoId: id, quantidade: 50 })
  const papel = usePapel()

  if (carregando) return <Carregando />
  if (!veiculo) return <Vazio titulo="Veículo não encontrado" />

  const entregues = ordens.filter((o) => o.status === 'entregue')
  const totalGasto = entregues.reduce((soma, o) => soma + o.valorTotal, 0)
  const combustivel = OPCOES_COMBUSTIVEL.find((c) => c.valor === veiculo.combustivel)?.rotulo

  const revisaoAtrasadaKm =
    veiculo.proximaRevisaoKm != null && veiculo.kmAtual >= veiculo.proximaRevisaoKm
  const revisaoAtrasadaData = revisaoVencida(veiculo.proximaRevisaoData)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link to="/os" className="inline-flex items-center gap-1 self-start text-sm texto-fraco hover:text-grafite-200">
        <IconeVoltar className="h-4 w-4" />
        Voltar
      </Link>

      <header>
        <h1 className="font-mono text-3xl font-bold tracking-wider text-grafite-50">
          {formatarPlaca(veiculo.placa)}
        </h1>
        <p className="text-grafite-300">
          {veiculo.marca} {veiculo.modelo} {veiculo.anoModelo} · {veiculo.cor}
          {combustivel && ` · ${combustivel}`}
        </p>
        {cliente && (
          <Link to={`/clientes/${cliente.id}`} className="text-sm text-acento-400 hover:underline">
            {cliente.nome}
          </Link>
        )}
      </header>

      {(revisaoAtrasadaKm || revisaoAtrasadaData) && (
        <div className="rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm text-alerta">
          <strong>Revisão vencida.</strong>{' '}
          {revisaoAtrasadaKm &&
            `Passou dos ${veiculo.proximaRevisaoKm?.toLocaleString('pt-BR')} km previstos. `}
          {revisaoAtrasadaData &&
            `Estava marcada para ${formatarData(veiculo.proximaRevisaoData)}. `}
          Boa hora para ligar para o cliente.
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="KM atual" valor={veiculo.kmAtual.toLocaleString('pt-BR')} />
        <Indicador rotulo="Visitas" valor={String(entregues.length)} />
        {vePrecos(papel) && (
          <Indicador rotulo="Total gasto" valor={formatarMoeda(totalGasto)} />
        )}
        <Indicador
          rotulo="Próxima revisão"
          valor={
            veiculo.proximaRevisaoKm
              ? `${veiculo.proximaRevisaoKm.toLocaleString('pt-BR')} km`
              : '—'
          }
        />
      </section>

      {(veiculo.chassi || veiculo.renavam || veiculo.motor) && (
        <section className="superficie rounded-xl p-4">
          <h2 className="mb-2 font-titulo text-lg uppercase text-grafite-200">Ficha técnica</h2>
          <dl className="flex flex-col gap-1 text-sm">
            {veiculo.chassi && <Linha rotulo="Chassi" valor={veiculo.chassi} />}
            {veiculo.renavam && <Linha rotulo="Renavam" valor={veiculo.renavam} />}
            {veiculo.motor && <Linha rotulo="Motor" valor={veiculo.motor} />}
          </dl>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-titulo text-xl uppercase text-grafite-100">
          Histórico de serviços
          {ordens.length > 0 && (
            <span className="ml-2 text-sm font-normal texto-fraco">{ordens.length}</span>
          )}
        </h2>

        {ordens.length === 0 ? (
          <p className="text-sm texto-fraco">Nenhuma OS para este veículo ainda.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {ordens.map((os) => (
                <CartaoOS key={os.id} os={os} />
              ))}
            </div>

            {/* O que já foi trocado neste carro — a memória da oficina. */}
            <div className="superficie mt-2 rounded-xl p-4">
              <h3 className="mb-2 font-titulo text-lg uppercase text-grafite-200">
                Peças já aplicadas
              </h3>
              <PecasAplicadas ordens={ordens} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function PecasAplicadas({ ordens }: { ordens: ReturnType<typeof useOrdens>['ordens'] }) {
  const aplicadas = ordens
    .filter((o) => o.status === 'entregue')
    .flatMap((o) =>
      o.pecas
        .filter((p) => p.aplicada)
        .map((p) => ({ descricao: p.descricao, numero: o.numero, data: o.dataSaida, km: o.kmSaida })),
    )

  if (aplicadas.length === 0) {
    return <p className="text-sm texto-fraco">Nenhuma peça registrada como aplicada ainda.</p>
  }

  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {aplicadas.map((p, i) => (
        <li key={`${p.numero}-${i}`} className="flex flex-wrap justify-between gap-2 border-b border-grafite-800 pb-1.5 last:border-0">
          <span className="text-grafite-100">{p.descricao}</span>
          <span className="texto-fraco">
            {formatarData(p.data)}
            {p.km != null && ` · ${p.km.toLocaleString('pt-BR')} km`}
            <span className="ml-2 font-mono">OS {p.numero}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="superficie rounded-xl p-3">
      <p className="text-xs texto-fraco">{rotulo}</p>
      <p className="font-mono text-lg font-bold text-grafite-50">{valor}</p>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="texto-fraco">{rotulo}</dt>
      <dd className="font-mono text-grafite-100">{valor}</dd>
    </div>
  )
}
