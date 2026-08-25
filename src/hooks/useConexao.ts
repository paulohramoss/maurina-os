import { useEffect } from 'react'
import { onSnapshotsInSync } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUIStore } from '@/store/uiStore'

/**
 * Estado da conexão para o badge do topo.
 *
 * `navigator.onLine` diz se tem rede; `onSnapshotsInSync` diz se o que foi
 * escrito offline já subiu. As duas coisas juntas dão o "sincronizando".
 */
export function useObservadorConexao(): void {
  const { definirOnline, definirSincronizando } = useUIStore()

  useEffect(() => {
    const aoConectar = () => {
      definirOnline(true)
      definirSincronizando(true)
    }
    const aoDesconectar = () => {
      definirOnline(false)
      definirSincronizando(false)
    }

    window.addEventListener('online', aoConectar)
    window.addEventListener('offline', aoDesconectar)

    const cancelar = onSnapshotsInSync(db, () => definirSincronizando(false))

    return () => {
      window.removeEventListener('online', aoConectar)
      window.removeEventListener('offline', aoDesconectar)
      cancelar()
    }
  }, [definirOnline, definirSincronizando])
}
