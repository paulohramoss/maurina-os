import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Maurina AutoCar — Ordem de Serviço',
        short_name: 'Maurina OS',
        description: 'Ordens de serviço da oficina Maurina AutoCar',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icone-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // O SDK do Firebase sozinho passa de 500 kB e não há como fatiar mais:
    // ele já está isolado no próprio chunk e é cacheado entre deploys.
    // O código do app fica em ~100 kB, que é o número que importa vigiar.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // A internet da oficina é ruim: separar os pacotes grandes faz o
        // navegador reaproveitar o cache do Firebase entre um deploy e outro,
        // em vez de rebaixar tudo a cada correção de tela.
        manualChunks: {
          // Firestore é o maior pedaço e o único que muda de versão com
          // frequência; separá-lo do resto poupa download nos deploys.
          firestore: ['firebase/firestore'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/storage'],
          react: ['react', 'react-dom', 'react-router-dom'],
          formulario: ['react-hook-form', '@hookform/resolvers/zod', 'zod'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/teste/setup.ts'],
    // teste-rules/ fala com o emulador e tem config própria (vitest.rules.config.ts).
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
