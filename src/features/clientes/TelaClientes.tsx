import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClientes } from '@/hooks/useClientes'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { Entrada } from '@/components/ui/Campo'
import { formatarTelefone } from '@/utils/telefone'

export function TelaClientes() {
  const [termo, setTermo] = useState('')
  const { clientes, carregando } = useClientes(termo)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">Clientes</h1>

      <Entrada
        id="busca-cliente"
        label="Buscar"
        placeholder="Nome do cliente"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        autoComplete="off"
      />

      {carregando ? (
        <EsqueletoLinha quantidade={4} />
      ) : clientes.length === 0 ? (
        <Vazio
          titulo={termo ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          descricao={
            termo
              ? 'Tente outro nome — a busca é pelo começo do nome.'
              : 'Os clientes são cadastrados na abertura da OS.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link
                to={`/clientes/${c.id}`}
                className="superficie flex min-h-toque items-center justify-between gap-3 rounded-xl p-3 hover:bg-grafite-800"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-grafite-50">{c.nome}</span>
                  <span className="block text-sm texto-fraco">{formatarTelefone(c.telefone)}</span>
                </span>
                <span className="shrink-0 text-grafite-500">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
