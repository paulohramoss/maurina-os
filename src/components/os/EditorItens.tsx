import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { Entrada } from '@/components/ui/Campo'
import { CampoMoeda } from '@/components/ui/CampoMoeda'
import { Modal } from '@/components/ui/Modal'
import { formatarMoeda } from '@/utils/dinheiro'
import { totalItemPeca } from '@/domain/calculoOS'
import type { Centavos, ItemPeca, ItemServico } from '@/types'

/**
 * Lançamento de peças e serviços.
 *
 * O total de cada linha nunca é digitado — é sempre quantidade × unitário,
 * calculado na hora e recalculado de novo no salvamento. Não existe caminho
 * em que o valor exibido e o valor gravado divirjam.
 */

type Tipo = 'peca' | 'servico'

interface Props {
  tipo: Tipo
  pecas?: ItemPeca[]
  servicos?: ItemServico[]
  aoMudarPecas?: (itens: ItemPeca[]) => void
  aoMudarServicos?: (itens: ItemServico[]) => void
  somenteLeitura?: boolean
  /** Sugestões do catálogo (Fase 3). */
  sugestoes?: { descricao: string; valorPadrao: Centavos; codigo?: string }[]
}

const novoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function EditorItens({
  tipo,
  pecas = [],
  servicos = [],
  aoMudarPecas,
  aoMudarServicos,
  somenteLeitura = false,
  sugestoes = [],
}: Props) {
  const ehPeca = tipo === 'peca'
  const itens: (ItemPeca | ItemServico)[] = ehPeca ? pecas : servicos

  const [editando, setEditando] = useState<ItemPeca | ItemServico | null>(null)
  const [aberto, setAberto] = useState(false)

  const salvar = (item: ItemPeca | ItemServico) => {
    const existe = itens.some((i) => i.id === item.id)
    const novos = existe ? itens.map((i) => (i.id === item.id ? item : i)) : [...itens, item]

    if (ehPeca) aoMudarPecas?.(novos as ItemPeca[])
    else aoMudarServicos?.(novos as ItemServico[])

    setAberto(false)
    setEditando(null)
  }

  const remover = (id: string) => {
    const novos = itens.filter((i) => i.id !== id)
    if (ehPeca) aoMudarPecas?.(novos as ItemPeca[])
    else aoMudarServicos?.(novos as ItemServico[])
  }

  const alternarMarcado = (item: ItemPeca | ItemServico) => {
    if (ehPeca) {
      const p = item as ItemPeca
      aoMudarPecas?.(pecas.map((i) => (i.id === p.id ? { ...i, aplicada: !p.aplicada } : i)))
    } else {
      const s = item as ItemServico
      aoMudarServicos?.(servicos.map((i) => (i.id === s.id ? { ...i, concluido: !s.concluido } : i)))
    }
  }

  const subtotal = itens.reduce((soma, i) => soma + totalItemPeca(i), 0)

  return (
    <div className="flex flex-col gap-3">
      {itens.length === 0 ? (
        <p className="text-sm texto-fraco">
          {ehPeca ? 'Nenhuma peça lançada.' : 'Nenhum serviço lançado.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((item) => {
            const marcado = ehPeca ? (item as ItemPeca).aplicada : (item as ItemServico).concluido

            return (
              <li key={item.id} className="rounded-lg border border-grafite-800 bg-grafite-800/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-grafite-50">{item.descricao}</p>
                    <p className="text-sm texto-fraco">
                      {item.quantidade} × {formatarMoeda(item.valorUnitario)}
                      {ehPeca && (item as ItemPeca).codigo && (
                        <span className="ml-2 font-mono">cód. {(item as ItemPeca).codigo}</span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono font-semibold text-grafite-50">
                    {formatarMoeda(totalItemPeca(item))}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-grafite-800 pt-2">
                  <button
                    type="button"
                    onClick={() => alternarMarcado(item)}
                    className={[
                      'min-h-[36px] rounded-lg border px-3 text-sm transition-colors',
                      marcado
                        ? 'border-sucesso/50 bg-sucesso/10 text-sucesso'
                        : 'border-grafite-700 text-grafite-400',
                    ].join(' ')}
                  >
                    {marcado ? '✓ ' : '○ '}
                    {ehPeca ? 'Aplicada' : 'Concluído'}
                  </button>

                  {!somenteLeitura && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(item)
                          setAberto(true)
                        }}
                        className="ml-auto min-h-[36px] px-3 text-sm text-acento-400 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => remover(item.id)}
                        className="min-h-[36px] px-3 text-sm text-grafite-400 hover:text-perigo"
                      >
                        Remover
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-grafite-800 pt-3">
        <span className="text-sm texto-fraco">Subtotal</span>
        <span className="font-mono text-lg font-semibold text-grafite-50">
          {formatarMoeda(subtotal)}
        </span>
      </div>

      {!somenteLeitura && (
        <Botao
          variante="secundario"
          larguraTotal
          onClick={() => {
            setEditando(null)
            setAberto(true)
          }}
        >
          + {ehPeca ? 'Adicionar peça' : 'Adicionar serviço'}
        </Botao>
      )}

      <ModalItem
        aberto={aberto}
        tipo={tipo}
        item={editando}
        sugestoes={sugestoes}
        aoSalvar={salvar}
        aoFechar={() => {
          setAberto(false)
          setEditando(null)
        }}
      />
    </div>
  )
}

function ModalItem({
  aberto,
  tipo,
  item,
  sugestoes,
  aoSalvar,
  aoFechar,
}: {
  aberto: boolean
  tipo: Tipo
  item: ItemPeca | ItemServico | null
  sugestoes: { descricao: string; valorPadrao: Centavos; codigo?: string }[]
  aoSalvar: (item: ItemPeca | ItemServico) => void
  aoFechar: () => void
}) {
  const ehPeca = tipo === 'peca'

  const [descricao, setDescricao] = useState('')
  const [codigo, setCodigo] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [valorUnitario, setValorUnitario] = useState<Centavos>(0)
  const [erro, setErro] = useState<string | null>(null)
  const [chave, setChave] = useState(0)

  // Reabrir o modal reseta os campos para o item em edição (ou vazio).
  const chaveAtual = `${aberto}-${item?.id ?? 'novo'}`
  const [chaveAnterior, setChaveAnterior] = useState(chaveAtual)
  if (chaveAtual !== chaveAnterior) {
    setChaveAnterior(chaveAtual)
    setDescricao(item?.descricao ?? '')
    setCodigo(ehPeca ? ((item as ItemPeca | null)?.codigo ?? '') : '')
    setQuantidade(String(item?.quantidade ?? 1))
    setValorUnitario(item?.valorUnitario ?? 0)
    setErro(null)
    setChave((c) => c + 1)
  }

  const filtradas =
    descricao.trim().length >= 2
      ? sugestoes
          .filter((s) => s.descricao.toLowerCase().includes(descricao.toLowerCase().trim()))
          .slice(0, 5)
      : []

  const confirmar = () => {
    const qtd = Number(quantidade.replace(',', '.'))

    if (descricao.trim().length < 2) {
      setErro('Descreva o item.')
      return
    }
    if (!Number.isFinite(qtd) || qtd <= 0) {
      setErro('Quantidade inválida.')
      return
    }
    if (valorUnitario <= 0) {
      setErro('Informe o valor unitário.')
      return
    }

    const base = {
      id: item?.id ?? novoId(),
      descricao: descricao.trim(),
      quantidade: qtd,
      valorUnitario,
      valorTotal: Math.round(qtd * valorUnitario),
    }

    aoSalvar(
      ehPeca
        ? {
            ...base,
            ...(codigo.trim() ? { codigo: codigo.trim() } : {}),
            aplicada: (item as ItemPeca | null)?.aplicada ?? false,
          }
        : { ...base, concluido: (item as ItemServico | null)?.concluido ?? false },
    )
  }

  return (
    <Modal
      aberto={aberto}
      titulo={`${item ? 'Editar' : 'Nova'} ${ehPeca ? 'peça' : 'serviço'}`}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao larguraTotal tamanho="lg" onClick={confirmar}>
            Salvar
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-4" key={chave}>
        <div className="relative">
          <Entrada
            id="descricao-item"
            label="Descrição"
            obrigatorio
            autoFocus
            autoComplete="off"
            placeholder={ehPeca ? 'Pastilha de freio dianteira' : 'Troca de pastilha'}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          {filtradas.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-grafite-700 bg-grafite-800 shadow-xl">
              {filtradas.map((s) => (
                <li key={s.descricao}>
                  <button
                    type="button"
                    onClick={() => {
                      setDescricao(s.descricao)
                      setValorUnitario(s.valorPadrao)
                      if (s.codigo) setCodigo(s.codigo)
                    }}
                    className="flex min-h-toque w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-grafite-700"
                  >
                    <span className="min-w-0 truncate text-grafite-100">{s.descricao}</span>
                    <span className="shrink-0 font-mono texto-fraco">
                      {formatarMoeda(s.valorPadrao)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {ehPeca && (
          <Entrada
            id="codigo-item"
            label="Código da peça"
            autoComplete="off"
            placeholder="Opcional"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Entrada
            id="quantidade-item"
            label="Quantidade"
            obrigatorio
            inputMode="decimal"
            className="text-right font-mono text-lg"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value.replace(/[^\d,.]/g, ''))}
          />
          <CampoMoeda
            id="valor-item"
            label="Valor unitário"
            obrigatorio
            valor={valorUnitario}
            aoMudar={setValorUnitario}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-grafite-800 px-3 py-2.5">
          <span className="text-sm texto-fraco">Total da linha</span>
          <span className="font-mono text-lg font-semibold text-acento-400">
            {formatarMoeda(Math.round((Number(quantidade.replace(',', '.')) || 0) * valorUnitario))}
          </span>
        </div>

        {erro && (
          <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
            {erro}
          </p>
        )}
      </div>
    </Modal>
  )
}
