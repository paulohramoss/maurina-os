import { useUIStore } from '@/store/uiStore'
import { IconeNuvemCortada } from './Icones'

/**
 * "Tá salvando?" é a pergunta número um de quem trabalha em galpão.
 * O badge responde antes de perguntarem — e some quando está tudo certo.
 */
export function BadgeConexao() {
  const online = useUIStore((e) => e.online)
  const sincronizando = useUIStore((e) => e.sincronizando)

  if (online && !sincronizando) return null

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-alerta/15 px-2.5 py-1 text-xs font-medium text-alerta">
        <IconeNuvemCortada className="h-4 w-4" />
        Offline — salvo no aparelho
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-info/15 px-2.5 py-1 text-xs font-medium text-info">
      <span className="h-2 w-2 animate-pulse rounded-full bg-info" />
      Sincronizando…
    </span>
  )
}
