import { Link } from 'react-router-dom'
import type { OrdemServico } from '@/types'
import { corStatus } from '@/domain/statusOS'
import { EtiquetaStatus } from './EtiquetaStatus'
import { formatarPlaca } from '@/utils/placa'
import { formatarMoeda } from '@/utils/dinheiro'
import { tempoRelativo } from '@/utils/data'
import { usePapel } from '@/store/authStore'
import { vePrecos } from '@/domain/permissoes'

/**
 * O cartão que aparece no pátio, na lista e na busca.
 * A placa é o maior elemento: é por ela que a oficina identifica o carro,
 * não pelo número da OS nem pelo nome do dono.
 */
export function CartaoOS({ os }: { os: OrdemServico }) {
  const papel = usePapel()
  const cor = corStatus(os.status)

  return (
    <Link
      to={`/os/${os.id}`}
      className="superficie block rounded-xl border-l-4 p-4 transition-colors hover:border-grafite-600 hover:bg-grafite-800/60"
      style={{ borderLeftColor: cor.borda }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xl font-bold tracking-wider text-grafite-50">
            {formatarPlaca(os.snapshotVeiculo.placa)}
          </p>
          <p className="truncate text-sm text-grafite-300">
            {os.snapshotVeiculo.marca} {os.snapshotVeiculo.modelo}
          </p>
        </div>
        <EtiquetaStatus status={os.status} tamanho="sm" />
      </div>

      <p className="mt-2 truncate text-sm texto-fraco">{os.snapshotCliente.nome}</p>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-grafite-800 pt-3">
        <div className="text-xs texto-fraco">
          <span className="font-mono">OS {os.numero}</span>
          <span className="mx-1.5">·</span>
          {tempoRelativo(os.dataEntrada)}
        </div>

        {vePrecos(papel) && os.valorTotal > 0 && (
          <span className="font-mono text-base font-semibold text-grafite-100">
            {formatarMoeda(os.valorTotal)}
          </span>
        )}
      </div>
    </Link>
  )
}
