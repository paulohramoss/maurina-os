import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage'

/**
 * Ponto único de conexão com o Firebase.
 *
 * A persistência offline é ligada aqui, na criação do Firestore: a oficina fica
 * num galpão e o mecânico precisa abrir e editar a OS mesmo sem sinal.
 * (`persistentLocalCache` é a forma atual do antigo `enableIndexedDbPersistence`,
 * e o multi-tab manager evita que duas abas briguem pelo lock do IndexedDB.)
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const configuracaoCompleta = Object.values(config).every(
  (valor) => typeof valor === 'string' && valor.length > 0,
)

if (!configuracaoCompleta) {
  console.warn(
    '[Firebase] Credenciais ausentes. Copie .env.example para .env.local e preencha ' +
      'com os dados do Console do Firebase (Configurações do projeto > Seus apps > Web).',
  )
}

export const app: FirebaseApp = initializeApp(config)

export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export const auth: Auth = getAuth(app)
export const storage: FirebaseStorage = getStorage(app)

const usarEmulador = import.meta.env.VITE_USAR_EMULADOR === 'true'

if (usarEmulador) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  console.info('[Firebase] Rodando contra o Emulator Suite.')
}
