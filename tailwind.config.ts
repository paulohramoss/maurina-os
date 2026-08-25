import type { Config } from 'tailwindcss'
import { cores, fontes, ergonomia } from './src/theme'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        grafite: cores.grafite,
        acento: cores.acento,
        sucesso: cores.sucesso,
        alerta: cores.alerta,
        perigo: cores.perigo,
        info: cores.info,
      },
      fontFamily: {
        titulo: fontes.titulo.split(', '),
        sans: fontes.corpo.split(', '),
        mono: fontes.mono.split(', '),
      },
      spacing: {
        toque: `${ergonomia.toqueMinimo}px`,
      },
      minHeight: {
        toque: `${ergonomia.toqueMinimo}px`,
      },
      minWidth: {
        toque: `${ergonomia.toqueMinimo}px`,
      },
      fontSize: {
        // Nada abaixo de 14px: "xs" no app já é 14.
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
      },
    },
  },
  plugins: [],
} satisfies Config
