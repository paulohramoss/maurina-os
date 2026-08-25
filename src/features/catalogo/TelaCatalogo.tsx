import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { Entrada } from '@/components/ui/Campo'
import { CampoMoeda } from '@/components/ui/CampoMoeda'
import { Modal } from '@/components/ui/Modal'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { useAcoesCatalogo, useCatalogo } from '@/hooks/useCatalogo'
import { formatarMoeda } from '@/utils/dinheiro'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import type { Centavos } from '@/types'

/**
 * Catálogo de peças e serviços com preço padrão.
 *
 * Alimenta o autocomplete do orçamento: a oficina troca pastilha toda semana,
 * e ninguém deveria redigitar descrição e preço a cada OS — nem errar o preço
 * por digitar de memória.
 */
export function TelaCatalogo() {
  const [tipo, setTipo] = useState<'peca' | 'servico'>('peca')
  const [busca, setBusca] = useState('')
  const { todasPecas, todosServicos, carregando } = useCatalogo()
  const { atualizar, excluir } = useAcoesCatalogo()
  const [editando, setEditando] = useState<ItemEditavel | null>(null)
  const [aberto, setAberto] = useState(false)

  const ehPeca = tipo === 'peca'
  const lista = (ehPeca ? todasPecas : todosServicos).filter((i) =>
    busca.trim() ? i.descricao.toLowerCase().includes(busca.toLowerCase().trim()) : true,
  )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">Catálogo</h1>
        <p className="text-sm texto-fraco">
          Preços padrão que aparecem como sugestão ao montar o orçamento.
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTipo('peca')} className={chip(ehPeca)}>
          Peças
          <span className="ml-2 font-mono texto-fraco">{todasPecas.length}</span>
        </button>
        <button type="button" onClick={() => setTipo('servico')} className={chip(!ehPeca)}>
          Serviços
          <span className="ml-2 font-mono texto-fraco">{todosServicos.length}</span>
        </button>
      </div>

      <Entrada
        id="busca-catalogo"
        label="Buscar"
        placeholder={ehPeca ? 'Pastilha, filtro, correia…' : 'Troca de óleo, alinhamento…'}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        autoComplete="off"
      />

      <Botao
        larguraTotal
        onClick={() => {
          setEditando(null)
          setAberto(true)
        }}
      >
        + {ehPeca ? 'Nova peça' : 'Novo serviço'}
      </Botao>

      {carregando ? (
        <EsqueletoLinha quantidade={3} />
      ) : lista.length === 0 ? (
        <Vazio
          titulo={busca ? 'Nada encontrado' : `Nenhum${ehPeca ? 'a peça' : ' serviço'} no catálogo`}
          descricao={
            busca
              ? 'Tente outra palavra.'
              : 'Cadastre o que a oficina mais usa. Depois é só escolher na hora do orçamento.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((item) => (
            <li
              key={item.id}
              className={[
                'superficie flex items-center justify-between gap-3 rounded-xl p-3',
                item.ativo ? '' : 'opacity-50',
              ].join(' ')}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-grafite-50">{item.descricao}</p>
                <p className="text-sm texto-fraco">
                  {'codigo' in item && item.codigo && (
                    <span className="mr-2 font-mono">cód. {item.codigo}</span>
                  )}
                  {'fornecedor' in item && item.fornecedor && <span>{item.fornecedor}</span>}
                  {'tempoEstimadoMin' in item && item.tempoEstimadoMin && (
                    <span>{item.tempoEstimadoMin} min</span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono font-semibold text-grafite-100">
                  {formatarMoeda(item.valorPadrao)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditando({
                      id: item.id,
                      descricao: item.descricao,
                      valorPadrao: item.valorPadrao,
                      codigo: 'codigo' in item ? item.codigo : undefined,
                      fornecedor: 'fornecedor' in item ? item.fornecedor : undefined,
                    })
                    setAberto(true)
                  }}
                  aria-label={`Editar ${item.descricao}`}
                  className="flex h-toque w-toque items-center justify-center rounded-lg text-grafite-400 hover:bg-grafite-800 hover:text-acento-400"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => void excluir(tipo, item.id)}
                  aria-label={`Remover ${item.descricao}`}
                  className="flex h-toque w-toque items-center justify-center rounded-lg text-grafite-400 hover:bg-grafite-800 hover:text-perigo"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ModalItemCatalogo
        aberto={aberto}
        tipo={tipo}
        item={editando}
        aoFechar={() => {
          setAberto(false)
          setEditando(null)
        }}
        aoAtualizar={(id, dados) => atualizar(tipo, id, dados)}
      />
    </div>
  )
}

interface ItemEditavel {
  id: string
  descricao: string
  valorPadrao: Centavos
  codigo?: string
  fornecedor?: string
}

function ModalItemCatalogo({
  aberto,
  tipo,
  item,
  aoFechar,
  aoAtualizar,
}: {
  aberto: boolean
  tipo: 'peca' | 'servico'
  item: ItemEditavel | null
  aoFechar: () => void
  aoAtualizar: (id: string, dados: Record<string, unknown>) => Promise<void>
}) {
  const { criarPeca, criarServico } = useAcoesCatalogo()
  const ehPeca = tipo === 'peca'

  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState<Centavos>(0)
  const [codigo, setCodigo] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Reabrir reseta os campos para o item em edição (ou vazio).
  const chaveAtual = `${aberto}-${item?.id ?? 'novo'}-${tipo}`
  const [chaveAnterior, setChaveAnterior] = useState(chaveAtual)
  if (chaveAtual !== chaveAnterior) {
    setChaveAnterior(chaveAtual)
    setDescricao(item?.descricao ?? '')
    setValor(item?.valorPadrao ?? 0)
    setCodigo(item?.codigo ?? '')
    setFornecedor(item?.fornecedor ?? '')
    setErro(null)
  }

  const salvar = async () => {
    if (descricao.trim().length < 2) {
      setErro('Descreva o item.')
      return
    }
    if (valor <= 0) {
      setErro('Informe o preço padrão.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      if (item) {
        await aoAtualizar(item.id, {
          descricao: descricao.trim(),
          valorPadrao: valor,
          ...(ehPeca ? { codigo: codigo.trim() || undefined, fornecedor: fornecedor.trim() || undefined } : {}),
        })
      } else if (ehPeca) {
        await criarPeca({
          descricao: descricao.trim(),
          valorPadrao: valor,
          ...(codigo.trim() ? { codigo: codigo.trim() } : {}),
          ...(fornecedor.trim() ? { fornecedor: fornecedor.trim() } : {}),
        })
      } else {
        await criarServico({ descricao: descricao.trim(), valorPadrao: valor })
      }
      aoFechar()
    } catch (e) {
      setErro(mensagemErroFirestore(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={`${item ? 'Editar' : 'Nov' + (ehPeca ? 'a peça' : 'o serviço')}`}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao larguraTotal tamanho="lg" onClick={() => void salvar()} carregando={salvando}>
            Salvar
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Entrada
          id="cat-descricao"
          label="Descrição"
          obrigatorio
          autoFocus
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={ehPeca ? 'Pastilha de freio dianteira' : 'Troca de óleo e filtro'}
        />

        <CampoMoeda
          id="cat-valor"
          label="Preço padrão"
          obrigatorio
          valor={valor}
          aoMudar={setValor}
          dica="Sugestão na hora do orçamento — dá para alterar em cada OS."
        />

        {ehPeca && (
          <>
            <Entrada
              id="cat-codigo"
              label="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Opcional"
            />
            <Entrada
              id="cat-fornecedor"
              label="Fornecedor"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Opcional"
            />
          </>
        )}

        {erro && (
          <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
            {erro}
          </p>
        )}
      </div>
    </Modal>
  )
}

const chip = (ativo: boolean) =>
  [
    'min-h-toque flex-1 rounded-lg border px-4 text-sm transition-colors',
    ativo
      ? 'border-acento-500 bg-acento-500/15 font-medium text-acento-400'
      : 'border-grafite-700 text-grafite-300 hover:bg-grafite-800',
  ].join(' ')
