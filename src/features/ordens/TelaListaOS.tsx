import { useSearchParams } from 'react-router-dom'
import { useOrdens } from '@/hooks/useOrdens'
import { CartaoOS } from '@/components/os/CartaoOS'
import { BuscaPlaca } from '@/components/os/BuscaPlaca'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { ORDEM_STATUS, rotuloStatus } from '@/domain/statusOS'
import type { StatusOS } from '@/types'

/** Lista com filtros. O estado dos filtros vive na URL: link filtrado é compartilhável. */
export function TelaListaOS() {
  const [params, setParams] = useSearchParams()

  const statusParam = params.get('status') ?? 'todos'
  const placa = params.get('placa') ?? ''

  const { ordens, carregando, erro } = useOrdens({
    status: statusParam as StatusOS | 'todos' | 'patio',
    placa,
    quantidade: 100,
  })

  const definirStatus = (status: string) => {
    const novos = new URLSearchParams(params)
    if (status === 'todos') novos.delete('status')
    else novos.set('status', status)
    setParams(novos, { replace: true })
  }

  const buscarPlaca = (nova: string) => {
    const novos = new URLSearchParams(params)
    if (nova) novos.set('placa', nova)
    else novos.delete('placa')
    setParams(novos, { replace: true })
  }

  const limparPlaca = () => buscarPlaca('')

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">
        Ordens de serviço
      </h1>

      <BuscaPlaca aoBuscar={buscarPlaca} />

      {placa && (
        <button
          type="button"
          onClick={limparPlaca}
          className="self-start rounded-full bg-acento-500/15 px-3 py-1 text-sm text-acento-400"
        >
          Placa {placa} · limpar ✕
        </button>
      )}

      {/* Filtros de status roláveis: cabem no celular sem quebrar linha. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <FiltroChip ativo={statusParam === 'todos'} onClick={() => definirStatus('todos')}>
          Todas
        </FiltroChip>
        <FiltroChip ativo={statusParam === 'patio'} onClick={() => definirStatus('patio')}>
          No pátio
        </FiltroChip>
        {ORDEM_STATUS.map((s) => (
          <FiltroChip key={s} ativo={statusParam === s} onClick={() => definirStatus(s)}>
            {rotuloStatus(s)}
          </FiltroChip>
        ))}
      </div>

      {erro && <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo">{erro}</p>}

      {carregando ? (
        <EsqueletoLinha quantidade={4} />
      ) : ordens.length === 0 ? (
        <Vazio
          titulo="Nenhuma OS encontrada"
          descricao={
            placa
              ? `Nenhuma ordem de serviço para a placa ${placa}.`
              : 'Ajuste os filtros ou abra uma nova OS.'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordens.map((os) => (
            <CartaoOS key={os.id} os={os} />
          ))}
        </div>
      )}
    </div>
  )
}

function FiltroChip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-toque whitespace-nowrap rounded-full border px-4 text-sm transition-colors',
        ativo
          ? 'border-acento-500 bg-acento-500/15 font-medium text-acento-400'
          : 'border-grafite-700 text-grafite-300 hover:bg-grafite-800',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
