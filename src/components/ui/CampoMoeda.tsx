import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react'
import { formatarMoedaSemSimbolo, mascaraMoeda, paraCentavos } from '@/utils/dinheiro'
import type { Centavos } from '@/types'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label: string
  /** Sempre em centavos. Este componente é a única fronteira entre texto e número. */
  valor: Centavos
  aoMudar: (centavos: Centavos) => void
  erro?: string
  dica?: string
  obrigatorio?: boolean
}

/**
 * Entrada de dinheiro com digitação contínua: cada dígito empurra a vírgula,
 * do jeito que quem trabalha com caixa está acostumado. Digitar 1-5-0 dá 1,50.
 *
 * Para fora, só existe centavo inteiro — o texto formatado nunca sai daqui.
 */
export const CampoMoeda = forwardRef<HTMLInputElement, Props>(function CampoMoeda(
  { label, valor, aoMudar, erro, dica, obrigatorio, className = '', ...props },
  ref,
) {
  const [texto, setTexto] = useState(() => (valor ? formatarMoedaSemSimbolo(valor) : ''))

  // Mudança vinda de fora (ex.: escolher item do catálogo) reflete no campo.
  useEffect(() => {
    const atual = paraCentavos(texto)
    if (atual !== valor) setTexto(valor ? formatarMoedaSemSimbolo(valor) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-sm font-medium text-grafite-300">
        {label}
        {obrigatorio && <span className="ml-1 text-acento-400">*</span>}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grafite-500">
          R$
        </span>
        <input
          ref={ref}
          inputMode="numeric"
          autoComplete="off"
          value={texto}
          onChange={(e) => {
            const mascarado = mascaraMoeda(e.target.value)
            setTexto(mascarado)
            aoMudar(paraCentavos(mascarado))
          }}
          className={[
            'w-full min-h-toque rounded-lg border bg-grafite-900 py-2.5 pl-10 pr-3',
            'text-right font-mono text-lg text-grafite-50',
            'focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500',
            erro ? 'border-perigo' : 'border-grafite-700',
            className,
          ].join(' ')}
          placeholder="0,00"
          {...props}
        />
      </div>

      {erro ? (
        <p className="text-sm text-perigo" role="alert">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-sm texto-fraco">{dica}</p>
      ) : null}
    </div>
  )
})
