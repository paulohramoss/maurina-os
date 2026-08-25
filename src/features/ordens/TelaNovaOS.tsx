import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PassoBusca } from './wizard/PassoBusca'
import { PassoCadastro } from './wizard/PassoCadastro'
import { PassoChecklist, type DadosChecklist } from './wizard/PassoChecklist'
import { useAcoesOS } from '@/hooks/useOrdemServico'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import { formatarPlaca } from '@/utils/placa'
import type { Cliente, Veiculo } from '@/types'

type Etapa = 'busca' | 'cadastro' | 'checklist'

/**
 * Wizard de abertura. Alvo: OS completa em menos de 90 segundos no celular.
 *
 * O caminho curto (carro conhecido) é busca → checklist: dois toques e a
 * quilometragem. O caminho longo só aparece para carro que nunca esteve aqui.
 */
export function TelaNovaOS() {
  const [etapa, setEtapa] = useState<Etapa>('busca')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null)
  const [placaInicial, setPlacaInicial] = useState<string | undefined>()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { abrir } = useAcoesOS()
  const navegar = useNavigate()

  const irParaChecklist = (dados: { cliente: Cliente; veiculo: Veiculo }) => {
    setCliente(dados.cliente)
    setVeiculo(dados.veiculo)
    setEtapa('checklist')
  }

  const irParaCadastro = (dados: { placa?: string; cliente?: Cliente }) => {
    setPlacaInicial(dados.placa)
    setCliente(dados.cliente ?? null)
    setEtapa('cadastro')
  }

  const concluir = async (dados: DadosChecklist) => {
    if (!cliente || !veiculo) return

    setSalvando(true)
    setErro(null)

    try {
      const { id } = await abrir({ cliente, veiculo, ...dados })
      navegar(`/os/${id}`, { replace: true })
    } catch (e) {
      console.error('[Nova OS] Falha ao abrir:', e)
      setErro(mensagemErroFirestore(e))
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header>
        <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">Nova OS</h1>
        <Trilha etapa={etapa} />
      </header>

      {veiculo && etapa === 'checklist' && (
        <div className="superficie rounded-xl p-3">
          <p className="font-mono text-lg font-bold text-grafite-50">{formatarPlaca(veiculo.placa)}</p>
          <p className="text-sm texto-fraco">
            {veiculo.marca} {veiculo.modelo} · {cliente?.nome}
          </p>
        </div>
      )}

      {etapa === 'busca' && (
        <PassoBusca aoEncontrar={irParaChecklist} aoCadastrar={irParaCadastro} />
      )}

      {etapa === 'cadastro' && (
        <PassoCadastro
          clienteExistente={cliente ?? undefined}
          placaInicial={placaInicial}
          aoConcluir={irParaChecklist}
          aoVoltar={() => setEtapa('busca')}
        />
      )}

      {etapa === 'checklist' && (
        <PassoChecklist
          kmSugerido={veiculo?.kmAtual}
          aoConcluir={(d) => void concluir(d)}
          aoVoltar={() => setEtapa('busca')}
          salvando={salvando}
        />
      )}

      {erro && (
        <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}

function Trilha({ etapa }: { etapa: Etapa }) {
  const passos: { chave: Etapa; rotulo: string }[] = [
    { chave: 'busca', rotulo: 'Cliente e veículo' },
    { chave: 'cadastro', rotulo: 'Cadastro' },
    { chave: 'checklist', rotulo: 'Entrada' },
  ]

  const indiceAtual = passos.findIndex((p) => p.chave === etapa)

  return (
    <ol className="mt-2 flex items-center gap-2 text-xs">
      {passos.map((p, i) => (
        <li key={p.chave} className="flex items-center gap-2">
          <span
            className={[
              'flex h-6 w-6 items-center justify-center rounded-full border font-mono',
              i <= indiceAtual
                ? 'border-acento-500 bg-acento-500 text-grafite-950'
                : 'border-grafite-700 text-grafite-500',
            ].join(' ')}
          >
            {i + 1}
          </span>
          <span className={i === indiceAtual ? 'text-grafite-200' : 'texto-fraco'}>{p.rotulo}</span>
          {i < passos.length - 1 && <span className="text-grafite-700">›</span>}
        </li>
      ))}
    </ol>
  )
}
