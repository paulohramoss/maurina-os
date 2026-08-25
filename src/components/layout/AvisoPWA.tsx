import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Aviso de nova versão.
 *
 * O app fica instalado no celular do pátio e não se atualiza sozinho no meio
 * de uma OS aberta — isso perderia o que a pessoa está digitando. Em vez disso,
 * avisa e deixa a hora ser escolhida por quem está usando.
 */
export function AvisoPWA() {
  const {
    offlineReady: [prontoOffline, setProntoOffline],
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(erro) {
      console.error('[PWA] Falha ao registrar o service worker:', erro)
    },
  })

  const fechar = () => {
    setProntoOffline(false)
    setPrecisaAtualizar(false)
  }

  if (!prontoOffline && !precisaAtualizar) return null

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 mx-auto w-[min(28rem,calc(100%-2rem))] md:bottom-6">
      <div className="superficie flex items-center gap-3 rounded-xl p-3 shadow-2xl">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-grafite-50">
            {precisaAtualizar ? 'Nova versão disponível' : 'Pronto para uso offline'}
          </p>
          <p className="text-xs texto-fraco">
            {precisaAtualizar
              ? 'Atualize quando terminar o que está fazendo.'
              : 'O app agora abre mesmo sem internet no pátio.'}
          </p>
        </div>

        {precisaAtualizar && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="min-h-toque shrink-0 rounded-lg bg-acento-500 px-4 text-sm font-semibold text-grafite-950"
          >
            Atualizar
          </button>
        )}

        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar aviso"
          className="flex h-toque w-toque shrink-0 items-center justify-center rounded-lg text-grafite-400 hover:bg-grafite-800"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
