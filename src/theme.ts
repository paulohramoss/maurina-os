/**
 * Identidade visual da Maurina AutoCar — FONTE ÚNICA.
 *
 * Trocar a marca (logo, cores oficiais) mexe SÓ neste arquivo.
 * `tailwind.config.ts` importa daqui; nenhum hex solto no resto do código.
 *
 * Direção: oficina mecânica. Sério, industrial, alto contraste,
 * legível sob a luz do galpão. Escuro por padrão.
 */

/** Dados da marca. Substituir quando a logo oficial chegar. */
export const marca = {
  nome: 'Maurina AutoCar',
  nomeCurto: 'Maurina',
  slogan: 'Oficina multimarcas',
  /** Caminho em /public ou URL do Storage. Vazio = usa o wordmark de texto. */
  logoUrl: '',
  instagram: 'https://www.instagram.com/maurina_autocar/',
} as const

/** Cinza-grafite: a base do app. */
const grafite = {
  50: '#f6f6f7',
  100: '#e2e2e5',
  200: '#c5c6cb',
  300: '#9fa1a9',
  400: '#787a84',
  500: '#5c5e68',
  600: '#494b53',
  700: '#3a3b42',
  800: '#2a2b30',
  900: '#1c1d21',
  950: '#111214',
} as const

/** Âmbar de sinalização automotiva: o acento. */
const acento = {
  50: '#fff8eb',
  100: '#ffecc6',
  200: '#ffd688',
  300: '#ffbb4a',
  400: '#ffa11f',
  500: '#f97f06',
  600: '#dd5c02',
  700: '#b73e06',
  800: '#942f0c',
  900: '#7a280d',
  950: '#461202',
} as const

export const cores = {
  grafite,
  acento,
  sucesso: '#16a34a',
  alerta: '#f59e0b',
  perigo: '#dc2626',
  info: '#2563eb',
} as const

/**
 * Cores de status da OS. Consistentes em TODO o app:
 * badge, card do kanban, borda da lista, timeline, impressão.
 */
export const coresStatus = {
  orcamento: { bg: '#3a3b42', texto: '#e2e2e5', borda: '#5c5e68', rotulo: 'Orçamento' },
  aguardando_aprovacao: { bg: '#78350f', texto: '#fde68a', borda: '#f59e0b', rotulo: 'Aguardando aprovação' },
  aprovada: { bg: '#14532d', texto: '#bbf7d0', borda: '#22c55e', rotulo: 'Aprovada' },
  em_execucao: { bg: '#1e3a8a', texto: '#bfdbfe', borda: '#3b82f6', rotulo: 'Em execução' },
  aguardando_peca: { bg: '#4c1d95', texto: '#ddd6fe', borda: '#8b5cf6', rotulo: 'Aguardando peça' },
  pronta: { bg: '#166534', texto: '#dcfce7', borda: '#4ade80', rotulo: 'Pronta' },
  entregue: { bg: '#052e16', texto: '#86efac', borda: '#15803d', rotulo: 'Entregue' },
  cancelada: { bg: '#7f1d1d', texto: '#fecaca', borda: '#ef4444', rotulo: 'Cancelada' },
} as const

/** Ergonomia de pátio: mão suja, luz forte, celular. */
export const ergonomia = {
  /** Alvo de toque mínimo (px). Não reduzir. */
  toqueMinimo: 44,
  /** Fonte mínima (px). Não reduzir. */
  fonteMinima: 14,
} as const

export const fontes = {
  titulo: "'Barlow Condensed', 'Oswald', system-ui, sans-serif",
  corpo: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
} as const
