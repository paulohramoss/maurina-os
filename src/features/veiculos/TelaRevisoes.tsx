import { Link } from 'react-router-dom'
import { useAlertasRevisao } from '@/hooks/useMetricas'
import { useClientes } from '@/hooks/useClientes'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { Botao } from '@/components/ui/Botao'
import { formatarPlaca } from '@/utils/placa'
import { formatarData } from '@/utils/data'
import { linkWhatsApp } from '@/utils/telefone'
import { exportarCSV } from '@/utils/csv'
import type { Veiculo } from '@/types'

/**
 * Campanha de retorno.
 *
 * A oficina que espera o carro quebrar perde o cliente para quem ligou antes.
 * Esta tela é a lista de quem deveria estar recebendo uma mensagem hoje.
 */
export function TelaRevisoes() {
  const { veiculos, porKm, carregando } = useAlertasRevisao()
  const { clientes } = useClientes()

  // Um veículo pode estar vencido pelos dois critérios: não listar duas vezes.
  const lista = [...veiculos, ...porKm.filter((v) => !veiculos.some((r) => r.id === v.id))]

  const clientePorId = new Map(clientes.map((c) => [c.id, c]))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">
          Revisões vencidas
        </h1>
        <p className="text-sm texto-fraco">
          Carros que passaram do prazo ou da quilometragem prevista na última entrega.
        </p>
      </div>

      {lista.length > 0 && (
        <Botao
          variante="secundario"
          onClick={() =>
            exportarCSV(
              'revisoes-vencidas',
              lista.map((v) => {
                const cliente = clientePorId.get(v.clienteId)
                return {
                  Placa: formatarPlaca(v.placa),
                  Veiculo: `${v.marca} ${v.modelo} ${v.anoModelo}`,
                  Cliente: cliente?.nome ?? '',
                  Telefone: cliente?.telefone ?? '',
                  KM_atual: v.kmAtual,
                  KM_revisao: v.proximaRevisaoKm ?? '',
                  Data_revisao: v.proximaRevisaoData ? formatarData(v.proximaRevisaoData) : '',
                }
              }),
            )
          }
        >
          Exportar CSV
        </Botao>
      )}

      {carregando ? (
        <EsqueletoLinha quantidade={4} />
      ) : lista.length === 0 ? (
        <Vazio
          titulo="Nenhuma revisão vencida"
          descricao="A lista se enche sozinha conforme os carros entregues passam do prazo ou da quilometragem."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((v) => (
            <ItemRevisao key={v.id} veiculo={v} cliente={clientePorId.get(v.clienteId)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ItemRevisao({
  veiculo,
  cliente,
}: {
  veiculo: Veiculo
  cliente: { nome: string; telefone: string; whatsapp: string } | undefined
}) {
  const vencidoKm =
    veiculo.proximaRevisaoKm != null && veiculo.kmAtual >= veiculo.proximaRevisaoKm
  const excedente =
    vencidoKm && veiculo.proximaRevisaoKm != null ? veiculo.kmAtual - veiculo.proximaRevisaoKm : 0

  const mensagem = cliente
    ? `Olá, ${cliente.nome.split(' ')[0]}! Aqui é da oficina. ` +
      `Notamos que o ${veiculo.marca} ${veiculo.modelo} (placa ${formatarPlaca(veiculo.placa)}) ` +
      `já está no período de revisão. Quer agendar uma passada aqui?`
    : ''

  return (
    <li className="superficie flex flex-col gap-3 rounded-xl border-l-4 border-l-alerta p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/veiculos/${veiculo.id}`}
            className="block font-mono text-lg font-bold text-grafite-50 hover:text-acento-400"
          >
            {formatarPlaca(veiculo.placa)}
          </Link>
          <p className="truncate text-sm text-grafite-300">
            {veiculo.marca} {veiculo.modelo} {veiculo.anoModelo}
          </p>
          {cliente && <p className="truncate text-sm texto-fraco">{cliente.nome}</p>}
        </div>

        <div className="shrink-0 text-right text-sm">
          {vencidoKm && (
            <p className="text-alerta">
              +{excedente.toLocaleString('pt-BR')} km
            </p>
          )}
          {veiculo.proximaRevisaoData && (
            <p className="texto-fraco">desde {formatarData(veiculo.proximaRevisaoData)}</p>
          )}
        </div>
      </div>

      {cliente && (
        <a
          href={linkWhatsApp(cliente.whatsapp || cliente.telefone, mensagem)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-toque items-center justify-center rounded-lg border border-sucesso/50 px-4 text-sm text-sucesso hover:bg-sucesso/10"
        >
          Chamar no WhatsApp
        </a>
      )}
    </li>
  )
}
