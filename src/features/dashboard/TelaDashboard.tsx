import { Link } from 'react-router-dom'
import { useOrdens } from '@/hooks/useOrdens'
import { BuscaPlaca } from '@/components/os/BuscaPlaca'
import { CartaoOS } from '@/components/os/CartaoOS'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { Botao } from '@/components/ui/Botao'
import { EtiquetaStatus } from '@/components/os/EtiquetaStatus'
import { ORDEM_STATUS, STATUS_NO_PATIO } from '@/domain/statusOS'
import { useAuthStore } from '@/store/authStore'
import { pode } from '@/domain/permissoes'
import type { StatusOS } from '@/types'

/**
 * Home. Responde as três perguntas do dia:
 * "cadê aquele carro?", "o que tem no pátio agora?" e "o que trava a fila?".
 */
export function TelaDashboard() {
  const usuario = useAuthStore((e) => e.usuario)
  const papel = useAuthStore((e) => e.papel)
  const { ordens, carregando } = useOrdens({ status: 'patio', quantidade: 100 })

  const contagem = ORDEM_STATUS.filter((s) => STATUS_NO_PATIO.includes(s)).map((status) => ({
    status,
    total: ordens.filter((o) => o.status === status).length,
  }))

  const primeiroNome = usuario?.nome.split(' ')[0] ?? ''

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

      {/* Resumo por status: cada chip leva à lista já filtrada. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {contagem.map(({ status, total }) => (
          <ChipStatus key={status} status={status} total={total} />
        ))}
      </div>

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
