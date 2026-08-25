interface Props {
  mensagem?: string
}

export function Carregando({ mensagem = 'Carregando…' }: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-grafite-700 border-t-acento-500" />
      <p className="text-sm texto-fraco">{mensagem}</p>
    </div>
  )
}

export function EsqueletoLinha({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-grafite-800/60" />
      ))}
    </div>
  )
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-grafite-700 px-6 py-12 text-center">
      <h3 className="font-titulo text-xl uppercase text-grafite-200">{titulo}</h3>
      {descricao && <p className="max-w-sm text-sm texto-fraco">{descricao}</p>}
      {acao}
    </div>
  )
}
