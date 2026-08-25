import { useEffect, useState } from 'react'
import { EditorItens } from '@/components/os/EditorItens'
import { CampoMoeda } from '@/components/ui/CampoMoeda'
import { Botao } from '@/components/ui/Botao'
import { calcularTotais } from '@/domain/calculoOS'
import { formatarMoeda, formatarPercentual, paraBasisPoints } from '@/utils/dinheiro'
import { pode } from '@/domain/permissoes'
import { usePapel } from '@/store/authStore'
import { useAcoesOS } from '@/hooks/useOrdemServico'
import { useCatalogo } from '@/hooks/useCatalogo'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import type { Centavos, Desconto, ItemPeca, ItemServico, OrdemServico } from '@/types'

/**
 * Orçamento da OS.
 *
 * Os totais são recalculados a cada tecla pela mesma função pura que roda no
 * salvamento — o que o atendente vê na tela é, por construção, o que vai ao banco.
 */
export function AbaOrcamento({ os }: { os: OrdemServico }) {
  const papel = usePapel()
  const { salvar } = useAcoesOS()
  const { pecas: catalogoPecas, servicos: catalogoServicos } = useCatalogo()

  const podeEditar = pode(papel, 'os:editar_valores') && os.status !== 'entregue' && os.status !== 'cancelada'

  const [pecas, setPecas] = useState<ItemPeca[]>(os.pecas)
  const [servicos, setServicos] = useState<ItemServico[]>(os.servicos)
  const [desconto, setDesconto] = useState<Desconto>(os.desconto)
  const [acrescimo, setAcrescimo] = useState<Centavos>(os.acrescimo ?? 0)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const totais = calcularTotais(pecas, servicos, desconto, acrescimo)

  /** Há edição na tela que ainda não foi para o banco? */
  const sujo =
    JSON.stringify(pecas) !== JSON.stringify(os.pecas) ||
    JSON.stringify(servicos) !== JSON.stringify(os.servicos) ||
    JSON.stringify(desconto) !== JSON.stringify(os.desconto) ||
    acrescimo !== (os.acrescimo ?? 0)

  // A OS muda em outro aparelho o tempo todo (o mecânico marcou uma peça como
  // aplicada, por exemplo). Enquanto não há edição pendente aqui, a tela
  // acompanha o banco; havendo, o que o atendente digitou tem prioridade.
  useEffect(() => {
    if (sujo) return
    setPecas(os.pecas)
    setServicos(os.servicos)
    setDesconto(os.desconto)
    setAcrescimo(os.acrescimo ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os.pecas, os.servicos, os.desconto, os.acrescimo])

  const gravar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      await salvar(os.id, { pecas, servicos, desconto, acrescimo })
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
      <Secao titulo="Peças">
        <EditorItens
          tipo="peca"
          pecas={pecas}
          aoMudarPecas={setPecas}
          somenteLeitura={!podeEditar}
          sugestoes={catalogoPecas.map((p) => ({
            descricao: p.descricao,
            valorPadrao: p.valorPadrao,
            ...(p.codigo ? { codigo: p.codigo } : {}),
          }))}
        />
      </Secao>

      <Secao titulo="Serviços">
        <EditorItens
          tipo="servico"
          servicos={servicos}
          aoMudarServicos={setServicos}
          somenteLeitura={!podeEditar}
          sugestoes={catalogoServicos.map((s) => ({
            descricao: s.descricao,
            valorPadrao: s.valorPadrao,
          }))}
        />
      </Secao>

      <Secao titulo="Fechamento">
        <div className="flex flex-col gap-4">
          {podeEditar && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-grafite-300">Desconto</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDesconto({ tipo: 'valor', valor: 0 })}
                    className={aba(desconto.tipo === 'valor')}
                  >
                    Em reais
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesconto({ tipo: 'percentual', valor: 0 })}
                    className={aba(desconto.tipo === 'percentual')}
                  >
                    Em %
                  </button>
                </div>
              </div>

              {desconto.tipo === 'valor' ? (
                <CampoMoeda
                  id="desconto-valor"
                  label="Valor do desconto"
                  valor={desconto.valor}
                  aoMudar={(v) => setDesconto({ tipo: 'valor', valor: v })}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="desconto-pct" className="text-sm font-medium text-grafite-300">
                    Percentual de desconto
                  </label>
                  <div className="relative">
                    <input
                      id="desconto-pct"
                      inputMode="decimal"
                      autoComplete="off"
                      defaultValue={desconto.valor ? String(desconto.valor / 100).replace('.', ',') : ''}
                      onChange={(e) =>
                        setDesconto({ tipo: 'percentual', valor: paraBasisPoints(e.target.value) })
                      }
                      placeholder="0"
                      className="min-h-toque w-full rounded-lg border border-grafite-700 bg-grafite-900 py-2.5 pl-3 pr-10 text-right font-mono text-lg text-grafite-50 focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-grafite-500">
                      %
                    </span>
                  </div>
                  <p className="text-sm texto-fraco">
                    Incide sobre o subtotal geral (peças + serviços).
                  </p>
                </div>
              )}

              <CampoMoeda
                id="acrescimo"
                label="Acréscimo"
                valor={acrescimo}
                aoMudar={setAcrescimo}
                dica="Deslocamento, hora extra, taxa de urgência"
              />
            </>
          )}

          <dl className="flex flex-col gap-1 border-t border-grafite-800 pt-4">
            <Total rotulo="Peças" valor={totais.subtotalPecas} />
            <Total rotulo="Serviços" valor={totais.subtotalServicos} />
            {totais.descontoValor > 0 && (
              <Total
                rotulo={
                  desconto.tipo === 'percentual'
                    ? `Desconto (${formatarPercentual(desconto.valor)})`
                    : 'Desconto'
                }
                valor={-totais.descontoValor}
                cor="text-sucesso"
              />
            )}
            {totais.acrescimo > 0 && <Total rotulo="Acréscimo" valor={totais.acrescimo} />}

            <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-grafite-700 pt-3">
              <dt className="font-titulo text-lg uppercase text-grafite-200">Total</dt>
              <dd className="font-mono text-3xl font-bold text-acento-400">
                {formatarMoeda(totais.valorTotal)}
              </dd>
            </div>
          </dl>
        </div>
      </Secao>

      {erro && (
        <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
          {erro}
        </p>
      )}

      {podeEditar && (
        <div className="sticky bottom-20 flex items-center gap-3 md:bottom-4">
          <Botao
            tamanho="lg"
            larguraTotal
            onClick={() => void gravar()}
            carregando={salvando}
            disabled={!sujo}
          >
            {sujo ? 'Salvar orçamento' : salvo ? 'Salvo ✓' : 'Sem alterações'}
          </Botao>
        </div>
      )}
    </div>
  )
}

const aba = (ativo: boolean) =>
  [
    'min-h-toque flex-1 rounded-lg border text-sm transition-colors',
    ativo
      ? 'border-acento-500 bg-acento-500/15 font-medium text-acento-400'
      : 'border-grafite-700 text-grafite-300 hover:bg-grafite-800',
  ].join(' ')

function Total({ rotulo, valor, cor = 'text-grafite-100' }: { rotulo: string; valor: Centavos; cor?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm texto-fraco">{rotulo}</dt>
      <dd className={`font-mono ${cor}`}>{formatarMoeda(valor)}</dd>
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
