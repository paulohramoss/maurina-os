import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label: string
  erro?: string
  dica?: string
  obrigatorio?: boolean
}

const CLASSE_CONTROLE = [
  'w-full min-h-toque rounded-lg px-3 py-2.5',
  'bg-grafite-900 border border-grafite-700 text-grafite-50',
  'placeholder:text-grafite-500',
  'focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500',
  'disabled:opacity-60',
].join(' ')

function Envolucro({
  label,
  erro,
  dica,
  obrigatorio,
  children,
  htmlFor,
}: BaseProps & { children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-grafite-300">
        {label}
        {obrigatorio && <span className="ml-1 text-acento-400">*</span>}
      </label>
      {children}
      {erro ? (
        <p className="text-sm text-perigo" role="alert">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-sm texto-fraco">{dica}</p>
      ) : null}
    </div>
  )
}

interface EntradaProps extends InputHTMLAttributes<HTMLInputElement>, BaseProps {}

export const Entrada = forwardRef<HTMLInputElement, EntradaProps>(function Entrada(
  { label, erro, dica, obrigatorio, className = '', ...props },
  ref,
) {
  return (
    <Envolucro label={label} erro={erro} dica={dica} obrigatorio={obrigatorio} htmlFor={props.id}>
      <input
        ref={ref}
        aria-invalid={erro ? true : undefined}
        className={`${CLASSE_CONTROLE} ${erro ? 'border-perigo' : ''} ${className}`}
        {...props}
      />
    </Envolucro>
  )
})

interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseProps {}

export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(function AreaTexto(
  { label, erro, dica, obrigatorio, className = '', rows = 3, ...props },
  ref,
) {
  return (
    <Envolucro label={label} erro={erro} dica={dica} obrigatorio={obrigatorio} htmlFor={props.id}>
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        className={`${CLASSE_CONTROLE} ${erro ? 'border-perigo' : ''} ${className}`}
        {...props}
      />
    </Envolucro>
  )
})

interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseProps {
  opcoes: readonly { valor: string; rotulo: string }[]
  placeholder?: string
}

export const Selecao = forwardRef<HTMLSelectElement, SelecaoProps>(function Selecao(
  { label, erro, dica, obrigatorio, opcoes, placeholder, className = '', ...props },
  ref,
) {
  return (
    <Envolucro label={label} erro={erro} dica={dica} obrigatorio={obrigatorio} htmlFor={props.id}>
      <select
        ref={ref}
        aria-invalid={erro ? true : undefined}
        className={`${CLASSE_CONTROLE} ${erro ? 'border-perigo' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Envolucro>
  )
})
