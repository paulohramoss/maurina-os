import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'
type Tamanho = 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  carregando?: boolean
  larguraTotal?: boolean
  iconeEsquerda?: ReactNode
}

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-acento-500 text-grafite-950 hover:bg-acento-400 active:bg-acento-600 font-semibold',
  secundario:
    'bg-grafite-800 text-grafite-100 hover:bg-grafite-700 active:bg-grafite-600 border border-grafite-700',
  fantasma: 'bg-transparent text-grafite-300 hover:bg-grafite-800 active:bg-grafite-700',
  perigo: 'bg-perigo text-white hover:brightness-110 active:brightness-95 font-semibold',
}

// Nada abaixo de 44px de altura: o alvo de toque é requisito, não estética.
const TAMANHOS: Record<Tamanho, string> = {
  md: 'min-h-toque px-4 text-base',
  lg: 'min-h-[56px] px-6 text-lg',
}

export const Botao = forwardRef<HTMLButtonElement, Props>(function Botao(
  {
    variante = 'primario',
    tamanho = 'md',
    carregando = false,
    larguraTotal = false,
    iconeEsquerda,
    className = '',
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || carregando}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed select-none',
        VARIANTES[variante],
        TAMANHOS[tamanho],
        larguraTotal ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {carregando ? <Girando /> : iconeEsquerda}
      {children}
    </button>
  )
})

function Girando() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )
}
