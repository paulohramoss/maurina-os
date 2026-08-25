import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  aberto: boolean
  titulo: string
  aoFechar: () => void
  children: ReactNode
  /** Rodapé fixo, fora da área rolável — o botão de salvar não pode fugir. */
  rodape?: ReactNode
}

/**
 * No celular sobe de baixo ocupando a tela quase toda (bottom sheet);
 * no desktop vira um diálogo centrado. Mesma marcação nos dois.
 */
export function Modal({ aberto, titulo, aoFechar, children, rodape }: Props) {
  useEffect(() => {
    if (!aberto) return

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)

    // Trava o fundo: rolar o modal não pode rolar a página atrás.
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={aoFechar}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-grafite-800 bg-grafite-900 sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-grafite-800 px-4 py-3">
          <h2 className="font-titulo text-lg uppercase tracking-wide text-grafite-50">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="flex h-toque w-toque items-center justify-center rounded-lg text-grafite-400 hover:bg-grafite-800"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {rodape && (
          <footer className="shrink-0 border-t border-grafite-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {rodape}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
