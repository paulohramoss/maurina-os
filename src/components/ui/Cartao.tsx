import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Cartao({ children, className = '', ...props }: Props) {
  return (
    <div className={`superficie rounded-xl ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CartaoCabecalho({ children, className = '' }: Props) {
  return <div className={`border-b border-grafite-800 px-4 py-3 ${className}`}>{children}</div>
}

export function CartaoCorpo({ children, className = '' }: Props) {
  return <div className={`p-4 ${className}`}>{children}</div>
}
