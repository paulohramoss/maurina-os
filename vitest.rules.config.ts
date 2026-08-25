import { defineConfig } from 'vitest/config'

/**
 * Suíte separada: estes testes falam com o emulador do Firestore,
 * então não rodam junto com os testes de unidade (que são offline e instantâneos).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['teste-rules/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
