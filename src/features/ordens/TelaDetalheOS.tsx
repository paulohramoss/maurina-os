import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useHistoricoOS, useAcoesOS, useOrdem } from '@/hooks/useOrdemServico'
import { Carregando, Vazio } from '@/components/ui/Carregando'
import { PainelStatus } from '@/components/os/PainelStatus'
import { Timeline } from '@/components/os/Timeline'
import { EtiquetaStatus } from '@/components/os/EtiquetaStatus'
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
    `(placa ${formatarPlaca(os.snapshotVeiculo.placa)}), OS ${os.numero}: `

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link to="/os" className="inline-flex items-center gap-1 self-start text-sm texto-fraco hover:text-grafite-200">
        <IconeVoltar className="h-4 w-4" />
        Ordens de serviço
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm texto-fraco">OS {os.numero}</p>
          <h1 className="font-mono text-3xl font-bold tracking-wider text-grafite-50">
            {formatarPlaca(os.snapshotVeiculo.placa)}
          </h1>
          <p className="text-grafite-300">
            {os.snapshotVeiculo.marca} {os.snapshotVeiculo.modelo} {os.snapshotVeiculo.anoModelo} ·{' '}
            {os.snapshotVeiculo.cor}
          </p>
        </div>
        <EtiquetaStatus status={os.status} />
      </header>

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

      {aba === 'dados' && (
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
          </Secao>

          {os.motivoCancelamento && (
            <Secao titulo="Motivo do cancelamento">
              <p className="text-perigo">{os.motivoCancelamento}</p>
            </Secao>
          )}

          <Secao titulo="Histórico">
            <Timeline eventos={eventos} />
          </Secao>
        </div>
      )}

      {aba === 'execucao' && <AbaExecucao os={os} />}

      {aba === 'orcamento' && (
        <Secao titulo="Orçamento">
          {os.pecas.length === 0 && os.servicos.length === 0 ? (
            <p className="texto-fraco">
              Nenhuma peça ou serviço lançado. O lançamento de itens entra na Fase 2.
            </p>
          ) : (
            <p className="font-mono text-2xl font-bold text-grafite-50">
              {formatarMoeda(os.valorTotal)}
            </p>
          )}
        </Secao>
      )}

      {aba === 'financeiro' && (
        <Secao titulo="Financeiro">
          <p className="texto-fraco">Registro de pagamentos entra na Fase 3.</p>
        </Secao>
      )}
    </div>
  )
}

function AbaExecucao({ os }: { os: OrdemServico }) {
  const papel = usePapel()
  const { salvarDiagnostico } = useAcoesOS()
  const [diagnostico, setDiagnostico] = useState(os.diagnostico ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const podeEditar = pode(papel, 'os:editar_diagnostico')

  const salvar = async () => {
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
              <Botao onClick={() => void salvar()} carregando={salvando} disabled={!diagnostico.trim()}>
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

      <Secao titulo="Serviços a executar">
        {os.servicos.length === 0 ? (
          <p className="texto-fraco">Nenhum serviço lançado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {os.servicos.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg bg-grafite-800 px-3 py-2">
                <span className={s.concluido ? 'text-sucesso' : 'text-grafite-500'}>
                  {s.concluido ? '✓' : '○'}
                </span>
                <span className="flex-1 text-sm text-grafite-100">{s.descricao}</span>
              </li>
            ))}
          </ul>
        )}
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
