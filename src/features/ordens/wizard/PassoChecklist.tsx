import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { AreaTexto, Entrada } from '@/components/ui/Campo'
import type { ChecklistEntrada, ChecklistItens, NivelCombustivel } from '@/types'

/**
 * Checklist de entrada.
 *
 * É o que protege a oficina da discussão de "esse risco não estava aí".
 * Por isso os itens são toque único (não formulário) e a avaria é texto livre,
 * do jeito que o atendente descreve andando em volta do carro.
 */

const ITENS: { chave: keyof ChecklistItens; rotulo: string }[] = [
  { chave: 'estepe', rotulo: 'Estepe' },
  { chave: 'macaco', rotulo: 'Macaco' },
  { chave: 'chaveRoda', rotulo: 'Chave de roda' },
  { chave: 'triangulo', rotulo: 'Triângulo' },
  { chave: 'documentos', rotulo: 'Documentos' },
  { chave: 'tapetes', rotulo: 'Tapetes' },
  { chave: 'radio', rotulo: 'Rádio' },
  { chave: 'calotas', rotulo: 'Calotas' },
]

const NIVEIS: { valor: NivelCombustivel; rotulo: string }[] = [
  { valor: 0, rotulo: 'Vazio' },
  { valor: 1, rotulo: '1/4' },
  { valor: 2, rotulo: '1/2' },
  { valor: 3, rotulo: '3/4' },
  { valor: 4, rotulo: 'Cheio' },
]

export interface DadosChecklist {
  kmEntrada: number
  nivelCombustivel: NivelCombustivel
  checklistEntrada: ChecklistEntrada
  reclamacaoCliente: string
}

interface Props {
  kmSugerido?: number
  aoConcluir: (dados: DadosChecklist) => void
  aoVoltar: () => void
  salvando: boolean
}

export function PassoChecklist({ kmSugerido, aoConcluir, aoVoltar, salvando }: Props) {
  const [km, setKm] = useState(kmSugerido ? String(kmSugerido) : '')
  const [nivel, setNivel] = useState<NivelCombustivel>(2)
  const [itens, setItens] = useState<ChecklistItens>({
    estepe: false,
    macaco: false,
    chaveRoda: false,
    triangulo: false,
    documentos: false,
    tapetes: false,
    radio: false,
    calotas: false,
  })
  const [avarias, setAvarias] = useState<string[]>([])
  const [novaAvaria, setNovaAvaria] = useState('')
  const [reclamacao, setReclamacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const alternarItem = (chave: keyof ChecklistItens) =>
    setItens((atual) => ({ ...atual, [chave]: !atual[chave] }))

  const adicionarAvaria = () => {
    const texto = novaAvaria.trim()
    if (!texto) return
    setAvarias((lista) => [...lista, texto])
    setNovaAvaria('')
  }

  const enviar = () => {
    const kmNumero = Number(km.replace(/\D/g, ''))
    if (!kmNumero) {
      setErro('Informe a quilometragem de entrada.')
      return
    }
    if (reclamacao.trim().length < 3) {
      setErro('Escreva o que o cliente relatou.')
      return
    }

    setErro(null)
    aoConcluir({
      kmEntrada: kmNumero,
      nivelCombustivel: nivel,
      checklistEntrada: { itens, avarias, fotos: [] },
      reclamacaoCliente: reclamacao.trim(),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Entrada
        id="km"
        label="KM de entrada"
        obrigatorio
        inputMode="numeric"
        autoFocus
        placeholder="Ex.: 87450"
        className="font-mono text-xl"
        value={km}
        onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-grafite-300">Combustível</span>
        <div className="grid grid-cols-5 gap-1.5">
          {NIVEIS.map((n) => (
            <button
              key={n.valor}
              type="button"
              onClick={() => setNivel(n.valor)}
              className={[
                'min-h-toque rounded-lg border px-1 text-sm transition-colors',
                nivel === n.valor
                  ? 'border-acento-500 bg-acento-500/15 font-medium text-acento-400'
                  : 'border-grafite-700 text-grafite-300 hover:bg-grafite-800',
              ].join(' ')}
            >
              {n.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-grafite-300">
          O que veio no carro
          <span className="ml-2 font-normal texto-fraco">toque no que estiver presente</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          {ITENS.map(({ chave, rotulo }) => (
            <button
              key={chave}
              type="button"
              onClick={() => alternarItem(chave)}
              aria-pressed={itens[chave]}
              className={[
                'flex min-h-toque items-center gap-2 rounded-lg border px-3 text-left text-sm transition-colors',
                itens[chave]
                  ? 'border-sucesso bg-sucesso/15 text-sucesso'
                  : 'border-grafite-700 text-grafite-400 hover:bg-grafite-800',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                  itens[chave] ? 'border-sucesso bg-sucesso text-grafite-950' : 'border-grafite-600',
                ].join(' ')}
              >
                {itens[chave] && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-grafite-300">
          Avarias
          <span className="ml-2 font-normal texto-fraco">riscos, amassados, trincas</span>
        </span>

        {avarias.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {avarias.map((a, i) => (
              <li
                key={`${a}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-grafite-800 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 text-grafite-100">{a}</span>
                <button
                  type="button"
                  onClick={() => setAvarias((lista) => lista.filter((_, idx) => idx !== i))}
                  className="shrink-0 px-2 text-grafite-400 hover:text-perigo"
                  aria-label={`Remover avaria: ${a}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            value={novaAvaria}
            onChange={(e) => setNovaAvaria(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarAvaria()
              }
            }}
            placeholder="Risco na porta dianteira esquerda"
            className="min-h-toque flex-1 rounded-lg border border-grafite-700 bg-grafite-900 px-3 text-grafite-50 placeholder:text-grafite-500 focus:border-acento-500 focus:outline-none"
          />
          <Botao type="button" variante="secundario" onClick={adicionarAvaria}>
            Add
          </Botao>
        </div>

        <p className="text-sm texto-fraco">Fotos do checklist entram na Fase 2.</p>
      </div>

      <AreaTexto
        id="reclamacao"
        label="O que o cliente relatou"
        obrigatorio
        rows={4}
        placeholder="Escreva com as palavras dele: “tá fazendo um barulho na roda quando freia”"
        value={reclamacao}
        onChange={(e) => setReclamacao(e.target.value)}
      />

      {erro && (
        <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <Botao type="button" variante="secundario" onClick={aoVoltar} disabled={salvando}>
          Voltar
        </Botao>
        <Botao type="button" tamanho="lg" larguraTotal onClick={enviar} carregando={salvando}>
          Abrir OS
        </Botao>
      </div>
    </div>
  )
}
