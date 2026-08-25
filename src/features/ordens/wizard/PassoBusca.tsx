import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { Entrada } from '@/components/ui/Campo'
import { Cartao } from '@/components/ui/Cartao'
import { IconeBusca, IconeCarro, IconeClientes } from '@/components/layout/Icones'
import { mascaraPlaca, formatarPlaca, placaValida } from '@/utils/placa'
import { formatarTelefone } from '@/utils/telefone'
import { useBuscaPorPlaca } from '@/hooks/useVeiculos'
import { useClientes, useAcoesCliente } from '@/hooks/useClientes'
import type { Cliente, Veiculo } from '@/types'

type Caminho = 'escolha' | 'placa' | 'cliente'

interface Props {
  /** Achou tudo: veículo já cadastrado e seu dono. Pula direto para o checklist. */
  aoEncontrar: (dados: { cliente: Cliente; veiculo: Veiculo }) => void
  /** Não achou: segue para o cadastro, já com o que foi digitado. */
  aoCadastrar: (dados: { placa?: string; cliente?: Cliente }) => void
}

/**
 * Primeira etapa. O carro que chega pode ser conhecido ou não, e o atendente
 * sabe qual dos dois antes de digitar — por isso ele escolhe o caminho,
 * em vez de o sistema impor uma ordem.
 */
export function PassoBusca({ aoEncontrar, aoCadastrar }: Props) {
  const [caminho, setCaminho] = useState<Caminho>('escolha')

  if (caminho === 'placa') {
    return <BuscaPorPlaca aoEncontrar={aoEncontrar} aoCadastrar={aoCadastrar} aoVoltar={() => setCaminho('escolha')} />
  }

  if (caminho === 'cliente') {
    return <BuscaPorCliente aoCadastrar={aoCadastrar} aoVoltar={() => setCaminho('escolha')} />
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm texto-fraco">Como você quer começar?</p>

      <BotaoCaminho
        Icone={IconeCarro}
        titulo="Buscar pela placa"
        descricao="Carro já conhecido — puxa o cliente junto"
        onClick={() => setCaminho('placa')}
      />
      <BotaoCaminho
        Icone={IconeClientes}
        titulo="Buscar pelo cliente"
        descricao="Cliente conhecido, escolher entre os carros dele"
        onClick={() => setCaminho('cliente')}
      />
      <BotaoCaminho
        Icone={IconeBusca}
        titulo="Cliente novo"
        descricao="Primeira vez na oficina"
        onClick={() => aoCadastrar({})}
      />
    </div>
  )
}

function BotaoCaminho({
  Icone,
  titulo,
  descricao,
  onClick,
}: {
  Icone: typeof IconeCarro
  titulo: string
  descricao: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="superficie flex min-h-[72px] items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-grafite-800"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-acento-500/15 text-acento-400">
        <Icone className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-grafite-50">{titulo}</span>
        <span className="block text-sm texto-fraco">{descricao}</span>
      </span>
    </button>
  )
}

function BuscaPorPlaca({
  aoEncontrar,
  aoCadastrar,
  aoVoltar,
}: Props & { aoVoltar: () => void }) {
  const [placa, setPlaca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [naoAchou, setNaoAchou] = useState(false)
  const buscarPorPlaca = useBuscaPorPlaca()
  const { buscarPorId } = useAcoesCliente()

  const buscar = async () => {
    if (!placaValida(placa)) return
    setBuscando(true)
    setNaoAchou(false)

    try {
      const veiculos = await buscarPorPlaca(placa)
      const veiculo = veiculos[0]

      if (!veiculo) {
        setNaoAchou(true)
        return
      }

      const cliente = await buscarPorId(veiculo.clienteId)
      if (cliente) aoEncontrar({ cliente, veiculo })
      // Veículo órfão (dono excluído): cai no cadastro com a placa preenchida.
      else aoCadastrar({ placa })
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Entrada
        id="placa-busca"
        label="Placa do veículo"
        value={placa}
        onChange={(e) => {
          setPlaca(mascaraPlaca(e.target.value))
          setNaoAchou(false)
        }}
        onKeyDown={(e) => e.key === 'Enter' && void buscar()}
        placeholder="ABC1D23"
        autoCapitalize="characters"
        autoComplete="off"
        autoFocus
        maxLength={7}
        className="font-mono text-2xl font-bold tracking-widest"
        dica="Aceita o formato antigo e o Mercosul"
      />

      <Botao tamanho="lg" larguraTotal onClick={() => void buscar()} carregando={buscando} disabled={!placaValida(placa)}>
        Buscar
      </Botao>

      {naoAchou && (
        <Cartao className="p-4">
          <p className="mb-3 text-sm text-grafite-200">
            Nenhum veículo com a placa <strong className="font-mono">{formatarPlaca(placa)}</strong>. É a
            primeira vez dele aqui?
          </p>
          <Botao variante="secundario" larguraTotal onClick={() => aoCadastrar({ placa })}>
            Cadastrar este veículo
          </Botao>
        </Cartao>
      )}

      <Botao variante="fantasma" larguraTotal onClick={aoVoltar}>
        Voltar
      </Botao>
    </div>
  )
}

function BuscaPorCliente({
  aoCadastrar,
  aoVoltar,
}: Pick<Props, 'aoCadastrar'> & { aoVoltar: () => void }) {
  const [termo, setTermo] = useState('')
  const { clientes, carregando } = useClientes(termo)

  return (
    <div className="flex flex-col gap-4">
      <Entrada
        id="cliente-busca"
        label="Nome do cliente"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Digite o nome"
        autoFocus
        autoComplete="off"
      />

      {termo.length > 0 && (
        <div className="flex flex-col gap-2">
          {carregando ? (
            <p className="text-sm texto-fraco">Buscando…</p>
          ) : clientes.length === 0 ? (
            <Cartao className="p-4">
              <p className="mb-3 text-sm text-grafite-200">Nenhum cliente com esse nome.</p>
              <Botao variante="secundario" larguraTotal onClick={() => aoCadastrar({})}>
                Cadastrar cliente novo
              </Botao>
            </Cartao>
          ) : (
            clientes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => aoCadastrar({ cliente: c })}
                className="superficie flex min-h-toque flex-col items-start rounded-xl p-3 text-left hover:bg-grafite-800"
              >
                <span className="font-medium text-grafite-50">{c.nome}</span>
                <span className="text-sm texto-fraco">{formatarTelefone(c.telefone)}</span>
              </button>
            ))
          )}
        </div>
      )}

      <Botao variante="fantasma" larguraTotal onClick={aoVoltar}>
        Voltar
      </Botao>
    </div>
  )
}
