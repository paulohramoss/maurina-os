import type { StatusOS } from '@/types'
import { corStatus } from '@/domain/statusOS'

interface Props {
  status: StatusOS
  tamanho?: 'sm' | 'md'
}

/**
 * A cor do status é a mesma no kanban, na lista, na timeline e no PDF.
 * Vem sempre de theme.ts — nunca de classe Tailwind escrita à mão.
 */
export function EtiquetaStatus({ status, tamanho = 'md' }: Props) {
  const cor = corStatus(status)

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        tamanho === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      ].join(' ')}
      style={{ backgroundColor: cor.bg, color: cor.texto, borderColor: cor.borda }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor.borda }} />
      {cor.rotulo}
    </span>
  )
}
