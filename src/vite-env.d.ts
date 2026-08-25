/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** Variáveis de ambiente tipadas — nada de `any` vindo do import.meta.env. */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_DATABASE_ID: string
  readonly VITE_USAR_EMULADOR: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
