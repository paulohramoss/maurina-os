import type { SVGProps } from 'react'

/**
 * Ícones inline. Traço grosso porque a tela é vista de longe, no galpão,
 * e porque uma lib de ícones inteira não se justifica para oito desenhos.
 */

type Props = SVGProps<SVGSVGElement>

const base = (props: Props) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-6 w-6',
  'aria-hidden': true,
  ...props,
})

export const IconePainel = (p: Props) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
)

export const IconeOS = (p: Props) => (
  <svg {...base(p)}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M5 8V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3" />
    <path d="M8 13h6M8 17h4" />
  </svg>
)

export const IconeMais = (p: Props) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconeClientes = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 11a3 3 0 1 0 0-6M17.5 20a5.5 5.5 0 0 0-2-4.2" />
  </svg>
)

export const IconeCarro = (p: Props) => (
  <svg {...base(p)}>
    <path d="M3 17h18M5 17v-3.5l1.8-4.2A2 2 0 0 1 8.6 8h6.8a2 2 0 0 1 1.8 1.3L19 13.5V17" />
    <circle cx="7.5" cy="18" r="1.6" />
    <circle cx="16.5" cy="18" r="1.6" />
    <path d="M5 13.5h14" />
  </svg>
)

export const IconeBusca = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconeMenu = (p: Props) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const IconeSair = (p: Props) => (
  <svg {...base(p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
)

export const IconeSol = (p: Props) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const IconeLua = (p: Props) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)

export const IconeVoltar = (p: Props) => (
  <svg {...base(p)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

export const IconeNuvemCortada = (p: Props) => (
  <svg {...base(p)}>
    <path d="M6.5 19a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17 8.3" />
    <path d="M3 3l18 18" />
  </svg>
)
