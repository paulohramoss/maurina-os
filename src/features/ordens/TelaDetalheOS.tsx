import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useHistoricoOS, useAcoesOS, useOrdem } from '@/hooks/useOrdemServico'
import { Carregando, Vazio } from '@/components/ui/Carregando'
import { PainelStatus } from '@/components/os/PainelStatus'
import { Timeline } from '@/components/os/Timeline'
import { EtiquetaStatus } from '@/components/os/EtiquetaStatus'
import { GaleriaFotos } from '@/components/os/GaleriaFotos'
import { AbaOrcamento } from './abas/AbaOrcamento'
import { AbaFinanceiro } from './abas/AbaFinanceiro'
import { Botao } from '@/components/ui/Botao'
import { AreaTexto } from '@/components/ui/Campo'
import { IconeVoltar } from '@/components/layout/Icones'
import { formatarPlaca } from '@/utils/placa'
import { formatarTelefone, linkWhatsApp } from '@/utils/telefone'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarData, formatarDataHora } from '@/utils/data'
import { pode, vePrecos } from '@/domain/permissoes'
import { usePapel } from '@/store/authStore'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import type { ChecklistItens, OrdemServico } from '@/types'

type Aba = 'dados' | 'orcamento' | 'execucao' | 'financeiro'

const NIVEIS = ['Vazio', '1/4', '1/2', '3/4', 'Cheio']

const ROTULO_ITEM: Record<keyof ChecklistItens, string> = {
  estepe: 'Estepe',
  macaco: 'Macaco',
  chaveRoda: 'Chave de roda',
  triangulo: 'Triângulo',
  documentos: 'Documentos',
  tapetes: 'Tapetes',
  radio: 'Rádio',
  calotas: 'Calotas',
}

export function TelaDetalheOS() {
  const { id } = useParams<{ id: string }>()
  const { os, carregando } = useOrdem(id)
  const eventos = useHistoricoOS(id)
  const { mudarStatus } = useAcoesOS()
  const papel = usePapel()
  const [aba, setAba] = useState<Aba>('dados')

  if (carregando) return <Carregando mensagem="Abrindo a OS…" />

  if (!os) {
    return (
      <Vazio
        titulo="OS não encontrada"
        descricao="Ela pode ter sido removida, ou o link está errado."
        acao={
          <Link to="/os">
            <Botao variante="secundario">Ver todas as OS</Botao>
          </Link>
        }
      />
    )
  }

  const abas: { chave: Aba; rotulo: string; oculta?: boolean }[] = [
    { chave: 'dados', rotulo: 'Dados' },
    { chave: 'orcamento', rotulo: 'Orçamento', oculta: !vePrecos(papel) },
    { chave: 'execucao', rotulo: 'Execução' },
    { chave: 'financeiro', rotulo: 'Financeiro', oculta: !pode(papel, 'financeiro:ver') },
  ]

  const mensagemWhats =
    `Olá, ${os.snapshotCliente.nome.split(' ')[0]}! Aqui é da oficina. ` +
    `Sobre o ${os.snapshotVeiculo.marca} ${os.snapshotVeiculo.modelo} ` +
    `(placa ${formatarPlaca(os.snapshotVeiculo.placa)}), OS ${os.numero}: ` +
    (vePrecos(papel) && os.valorTotal > 0
      ? `o orçamento ficou em ${formatarMoeda(os.valorTotal)}. Podemos seguir?`
      : '')

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link to="/os" className="inline-flex items-center gap-1 self-start text-sm texto-fraco hover:text-grafite-200">
        <IconeVoltar className="h-4 w-4" />
        Ordens de serviço
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm texto-fraco">OS {os.numero}</p>
          <Link
            to={`/veiculos/${os.veiculoId}`}
            className="font-mono text-3xl font-bold tracking-wider text-grafite-50 hover:text-acento-400"
          >
            {formatarPlaca(os.snapshotVeiculo.placa)}
          </Link>
          <p className="text-grafite-300">
            {os.snapshotVeiculo.marca} {os.snapshotVeiculo.modelo} {os.snapshotVeiculo.anoModelo} ·{' '}
            {os.snapshotVeiculo.cor}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <EtiquetaStatus status={os.status} />
          {vePrecos(papel) && os.valorTotal > 0 && (
            <span className="font-mono text-2xl font-bold text-acento-400">
              {formatarMoeda(os.valorTotal)}
            </span>
          )}
        </div>
      </header>

      {pode(papel, 'os:imprimir') && (
        <div className="flex flex-wrap gap-2">
          <a
            href={linkWhatsApp(os.snapshotCliente.telefone, mensagemWhats)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-toque items-center rounded-lg border border-sucesso/50 px-4 text-sm text-sucesso hover:bg-sucesso/10"
          >
            Enviar no WhatsApp
          </a>
          <Link
            to={`/os/${os.id}/imprimir`}
            className="inline-flex min-h-toque items-center rounded-lg border border-grafite-700 px-4 text-sm text-grafite-200 hover:bg-grafite-800"
          >
            Imprimir / PDF
          </Link>
        </div>
      )}

      <PainelStatus os={os} aoMudar={(para, dados) => mudarStatus(os, para, dados)} />

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-grafite-800 px-4 md:mx-0 md:px-0">
        {abas
          .filter((a) => !a.oculta)
          .map((a) => (
            <button
              key={a.chave}
              type="button"
              onClick={() => setAba(a.chave)}
              className={[
                'min-h-toque whitespace-nowrap border-b-2 px-4 text-sm transition-colors',
                aba === a.chave
                  ? 'border-acento-500 font-medium text-acento-400'
                  : 'border-transparent text-grafite-400 hover:text-grafite-200',
              ].join(' ')}
            >
              {a.rotulo}
            </button>
          ))}
      </nav>

      {aba === 'dados' && <AbaDados os={os} eventos={eventos} />}
      {aba === 'orcamento' && <AbaOrcamento os={os} />}
      {aba === 'execucao' && <AbaExecucao os={os} />}
      {aba === 'financeiro' && <AbaFinanceiro os={os} />}
    </div>
  )
}

function AbaDados({ os, eventos }: { os: OrdemServico; eventos: ReturnType<typeof useHistoricoOS> }) {
  const papel = usePapel()
  const { salvar } = useAcoesOS()

  const mensagemWhats = `Olá, ${os.snapshotCliente.nome.split(' ')[0]}! Aqui é da oficina, sobre a OS ${os.numero}: `

  return (
    <div className="flex flex-col gap-5">
      <Secao titulo="Cliente">
        <Linha rotulo="Nome" valor={os.snapshotCliente.nome} />
        <Linha rotulo="Telefone" valor={formatarTelefone(os.snapshotCliente.telefone)} />
        <a
          href={linkWhatsApp(os.snapshotCliente.telefone, mensagemWhats)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-toque items-center gap-2 self-start rounded-lg border border-sucesso/50 px-4 text-sm text-sucesso hover:bg-sucesso/10"
        >
          Falar no WhatsApp
        </a>
      </Secao>

      <Secao titulo="Entrada">
        <Linha rotulo="Data" valor={formatarDataHora(os.dataEntrada)} />
        <Linha rotulo="KM de entrada" valor={os.kmEntrada.toLocaleString('pt-BR')} />
        <Linha rotulo="Combustível" valor={NIVEIS[os.nivelCombustivel] ?? '—'} />
        {os.previsaoEntrega && (
          <Linha rotulo="Previsão de entrega" valor={formatarData(os.previsaoEntrega)} />
        )}
        {os.dataSaida && <Linha rotulo="Saída" valor={formatarDataHora(os.dataSaida)} />}
        {os.kmSaida != null && (
          <Linha rotulo="KM de saída" valor={os.kmSaida.toLocaleString('pt-BR')} />
        )}
      </Secao>

      <Secao titulo="Reclamação do cliente">
        <p className="whitespace-pre-wrap text-grafite-200">{os.reclamacaoCliente}</p>
      </Secao>

      <Secao titulo="Checklist de entrada">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ROTULO_ITEM) as (keyof ChecklistItens)[]).map((chave) => (
            <span
              key={chave}
              className={[
                'rounded-full border px-2.5 py-0.5 text-xs',
                os.checklistEntrada.itens[chave]
                  ? 'border-sucesso/50 bg-sucesso/10 text-sucesso'
                  : 'border-grafite-700 text-grafite-500 line-through',
              ].join(' ')}
            >
              {ROTULO_ITEM[chave]}
            </span>
          ))}
        </div>

        {os.checklistEntrada.avarias.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-sm font-medium text-grafite-300">Avarias registradas</p>
            <ul className="list-inside list-disc text-sm text-grafite-200">
              {os.checklistEntrada.avarias.map((a, i) => (
                <li key={`${a}-${i}`}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-grafite-300">
            Fotos da entrada
            <span className="ml-2 font-normal texto-fraco">
              o que protege a oficina do “esse risco não estava aí”
            </span>
          </p>
          <GaleriaFotos
            osId={os.id}
            fotos={os.checklistEntrada.fotos}
            somenteLeitura={!pode(papel, 'os:editar_dados') && !pode(papel, 'os:marcar_execucao')}
            aoMudar={(fotos) =>
              void salvar(os.id, { checklistEntrada: { ...os.checklistEntrada, fotos } })
            }
            rotulo="Foto da entrada do veículo"
          />
        </div>
      </Secao>

      {os.motivoCancelamento && (
        <Secao titulo="Motivo do cancelamento">
          <p className="text-perigo">{os.motivoCancelamento}</p>
        </Secao>
      )}

      {pode(papel, 'os:ver_observacoes_internas') && <ObservacoesInternas os={os} />}

      <Secao titulo="Histórico">
        <Timeline eventos={eventos} />
      </Secao>
    </div>
  )
}

function ObservacoesInternas({ os }: { os: OrdemServico }) {
  const { salvar } = useAcoesOS()
  const [texto, setTexto] = useState(os.observacoesInternas ?? '')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const gravar = async () => {
    setSalvando(true)
    try {
      await salvar(os.id, { observacoesInternas: texto.trim() })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Secao titulo="Observações internas">
      <div className="flex flex-col gap-3">
        <AreaTexto
          id="obs-internas"
          label="Só a oficina vê"
          rows={3}
          placeholder="Cliente pechincha muito · peça veio errada do fornecedor · carro já veio com esse barulho"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          dica="Não sai na via do cliente, sai só na via da oficina."
        />
        <div className="flex items-center gap-3">
          <Botao
            variante="secundario"
            onClick={() => void gravar()}
            carregando={salvando}
            disabled={texto === (os.observacoesInternas ?? '')}
          >
            Salvar observações
          </Botao>
          {salvo && <span className="text-sm text-sucesso">Salvo ✓</span>}
        </div>
      </div>
    </Secao>
  )
}

function AbaExecucao({ os }: { os: OrdemServico }) {
  const papel = usePapel()
  const { salvarDiagnostico, salvar } = useAcoesOS()
  const [diagnostico, setDiagnostico] = useState(os.diagnostico ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const podeEditar = pode(papel, 'os:editar_diagnostico')
  const podeMarcar = pode(papel, 'os:marcar_execucao')

  const gravar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      await salvarDiagnostico(os.id, diagnostico.trim())
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch (e) {
      setErro(mensagemErroFirestore(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Secao titulo="Reclamação do cliente">
        <p className="whitespace-pre-wrap text-grafite-200">{os.reclamacaoCliente}</p>
      </Secao>

      <Secao titulo="Diagnóstico do mecânico">
        {podeEditar ? (
          <div className="flex flex-col gap-3">
            <AreaTexto
              id="diagnostico"
              label="O que você encontrou"
              rows={5}
              placeholder="Pastilha dianteira no fim, disco empenado do lado direito…"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
            />
            {erro && <p className="text-sm text-perigo">{erro}</p>}
            <div className="flex items-center gap-3">
              <Botao
                onClick={() => void gravar()}
                carregando={salvando}
                disabled={!diagnostico.trim() || diagnostico === (os.diagnostico ?? '')}
              >
                Salvar diagnóstico
              </Botao>
              {salvo && <span className="text-sm text-sucesso">Salvo ✓</span>}
            </div>
          </div>
        ) : os.diagnostico ? (
          <p className="whitespace-pre-wrap text-grafite-200">{os.diagnostico}</p>
        ) : (
          <p className="texto-fraco">Diagnóstico ainda não lançado.</p>
        )}
      </Secao>

      {/* Checklist de trabalho do pátio: sem preço nenhum à vista. */}
      <Secao titulo="Serviços a executar">
        {os.servicos.length === 0 ? (
          <p className="texto-fraco">Nenhum serviço lançado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {os.servicos.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!podeMarcar}
                  onClick={() =>
                    void salvar(os.id, {
                      servicos: os.servicos.map((i) =>
                        i.id === s.id ? { ...i, concluido: !i.concluido } : i,
                      ),
                      pecas: os.pecas,
                    })
                  }
                  className={[
                    'flex min-h-toque w-full items-center gap-3 rounded-lg border px-3 text-left transition-colors',
                    s.concluido
                      ? 'border-sucesso/50 bg-sucesso/10'
                      : 'border-grafite-700 hover:bg-grafite-800',
                    podeMarcar ? '' : 'cursor-default',
                  ].join(' ')}
                >
                  <span className={s.concluido ? 'text-sucesso' : 'text-grafite-500'}>
                    {s.concluido ? '✓' : '○'}
                  </span>
                  <span
                    className={`flex-1 ${s.concluido ? 'text-sucesso line-through' : 'text-grafite-100'}`}
                  >
                    {s.descricao}
                    {s.quantidade > 1 && ` (${s.quantidade}×)`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Peças a aplicar">
        {os.pecas.length === 0 ? (
          <p className="texto-fraco">Nenhuma peça lançada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {os.pecas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!podeMarcar}
                  onClick={() =>
                    void salvar(os.id, {
                      pecas: os.pecas.map((i) =>
                        i.id === p.id ? { ...i, aplicada: !i.aplicada } : i,
                      ),
                      servicos: os.servicos,
                    })
                  }
                  className={[
                    'flex min-h-toque w-full items-center gap-3 rounded-lg border px-3 text-left transition-colors',
                    p.aplicada
                      ? 'border-sucesso/50 bg-sucesso/10'
                      : 'border-grafite-700 hover:bg-grafite-800',
                    podeMarcar ? '' : 'cursor-default',
                  ].join(' ')}
                >
                  <span className={p.aplicada ? 'text-sucesso' : 'text-grafite-500'}>
                    {p.aplicada ? '✓' : '○'}
                  </span>
                  <span
                    className={`flex-1 ${p.aplicada ? 'text-sucesso line-through' : 'text-grafite-100'}`}
                  >
                    {p.descricao}
                    {p.quantidade > 1 && ` (${p.quantidade}×)`}
                    {p.codigo && <span className="ml-2 font-mono text-xs texto-fraco">{p.codigo}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Fotos do serviço">
        <p className="mb-2 text-sm texto-fraco">
          O antes e depois. Vale mais que explicação no balcão na hora de entregar.
        </p>
        <GaleriaFotos
          osId={os.id}
          fotos={os.fotosExecucao ?? []}
          somenteLeitura={!podeMarcar}
          aoMudar={(fotosExecucao) => void salvar(os.id, { fotosExecucao })}
          rotulo="Foto do serviço"
        />
      </Secao>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="superficie rounded-xl p-4">
      <h2 className="mb-3 font-titulo text-lg uppercase tracking-wide text-grafite-200">{titulo}</h2>
      {children}
    </section>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-grafite-800 py-2 last:border-0">
      <span className="text-sm texto-fraco">{rotulo}</span>
      <span className="text-right text-sm text-grafite-100">{valor}</span>
    </div>
  )
}
