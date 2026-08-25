import { Link, useParams } from 'react-router-dom'
import { useCliente } from '@/hooks/useClientes'
import { useVeiculosDoCliente } from '@/hooks/useVeiculos'
import { useOrdens } from '@/hooks/useOrdens'
import { Carregando, Vazio } from '@/components/ui/Carregando'
import { CartaoOS } from '@/components/os/CartaoOS'
import { IconeVoltar } from '@/components/layout/Icones'
import { formatarPlaca } from '@/utils/placa'
import { formatarTelefone, linkWhatsApp } from '@/utils/telefone'
import { formatarDocumento } from '@/utils/documento'

/** Ficha do cliente: dados, carros e tudo que já passou pela oficina. */
export function TelaFichaCliente() {
  const { id } = useParams<{ id: string }>()
  const { cliente, carregando } = useCliente(id)
  const { veiculos } = useVeiculosDoCliente(id)
  const { ordens } = useOrdens({ clienteId: id, quantidade: 30 })

  if (carregando) return <Carregando />
  if (!cliente) return <Vazio titulo="Cliente não encontrado" />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link to="/clientes" className="inline-flex items-center gap-1 self-start text-sm texto-fraco hover:text-grafite-200">
        <IconeVoltar className="h-4 w-4" />
        Clientes
      </Link>

      <header>
        <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">{cliente.nome}</h1>
        <p className="texto-fraco">
          {formatarTelefone(cliente.telefone)}
          {cliente.cpfCnpj && ` · ${formatarDocumento(cliente.cpfCnpj)}`}
        </p>
        <a
          href={linkWhatsApp(cliente.whatsapp || cliente.telefone)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-toque items-center rounded-lg border border-sucesso/50 px-4 text-sm text-sucesso hover:bg-sucesso/10"
        >
          Falar no WhatsApp
        </a>
      </header>

      {!cliente.cpfCnpj && (
        <p className="rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm text-alerta">
          Cadastro incompleto: sem CPF/CNPJ. Complete antes de imprimir a OS com termos de garantia.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-titulo text-lg uppercase text-grafite-200">Veículos</h2>
        {veiculos.length === 0 ? (
          <p className="text-sm texto-fraco">Nenhum veículo cadastrado.</p>
        ) : (
          veiculos.map((v) => (
            <Link
              key={v.id}
              to={`/os?placa=${v.placa}`}
              className="superficie flex min-h-toque items-center justify-between gap-3 rounded-xl p-3 hover:bg-grafite-800"
            >
              <span>
                <span className="block font-mono font-bold text-grafite-50">{formatarPlaca(v.placa)}</span>
                <span className="block text-sm texto-fraco">
                  {v.marca} {v.modelo} {v.anoModelo} · {v.kmAtual.toLocaleString('pt-BR')} km
                </span>
              </span>
              <span className="shrink-0 text-grafite-500">›</span>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-titulo text-lg uppercase text-grafite-200">
          Histórico de serviços
          {ordens.length > 0 && <span className="ml-2 text-sm font-normal texto-fraco">{ordens.length}</span>}
        </h2>
        {ordens.length === 0 ? (
          <p className="text-sm texto-fraco">Nenhuma OS para este cliente.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ordens.map((os) => (
              <CartaoOS key={os.id} os={os} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
