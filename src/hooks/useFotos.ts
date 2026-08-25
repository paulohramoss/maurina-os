import { useCallback, useState } from 'react'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { caminhoFotosOS } from '@/lib/paths'
import { useAuthStore } from '@/store/authStore'
import { comprimirImagem } from '@/utils/imagem'

/**
 * Fotos da OS.
 *
 * Toda imagem passa pela compressão antes de subir (1280px, qualidade 0.7):
 * foto de celular tem 5 MB, e 5 MB pelo 3G do galpão é o app travado.
 */
export function useFotos(osId: string | undefined) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = useCallback(
    async (arquivos: FileList | File[]): Promise<string[]> => {
      if (!oficinaId || !osId) throw new Error('Sessão não carregada.')

      const lista = Array.from(arquivos).filter((a) => a.type.startsWith('image/'))
      if (lista.length === 0) return []

      setEnviando(true)
      setErro(null)
      setProgresso({ atual: 0, total: lista.length })

      const urls: string[] = []

      try {
        for (const [indice, arquivo] of lista.entries()) {
          setProgresso({ atual: indice + 1, total: lista.length })

          const { blob } = await comprimirImagem(arquivo)
          const nome = `${Date.now()}-${indice}.jpg`
          const destino = ref(storage, `${caminhoFotosOS(oficinaId, osId)}/${nome}`)

          await uploadBytes(destino, blob, { contentType: 'image/jpeg' })
          urls.push(await getDownloadURL(destino))
        }
        return urls
      } catch (e) {
        console.error('[Fotos] Falha no envio:', e)
        setErro(mensagemErroStorage(e))
        throw e
      } finally {
        setEnviando(false)
        setProgresso(null)
      }
    },
    [oficinaId, osId],
  )

  const remover = useCallback(async (url: string): Promise<void> => {
    try {
      await deleteObject(ref(storage, url))
    } catch (e) {
      // Arquivo já sumiu do Storage: seguir e tirar da lista da OS assim mesmo.
      console.warn('[Fotos] Não foi possível apagar do Storage:', e)
    }
  }, [])

  return { enviar, remover, enviando, progresso, erro }
}

function mensagemErroStorage(erro: unknown): string {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? String(erro.code) : ''

  switch (codigo) {
    case 'storage/unauthorized':
      return 'Sem permissão para enviar fotos nesta OS.'
    case 'storage/canceled':
      return 'Envio cancelado.'
    case 'storage/retry-limit-exceeded':
      return 'A conexão caiu no meio do envio. Tente de novo com sinal melhor.'
    case 'storage/unknown':
      return 'O armazenamento de fotos ainda não foi ativado no Firebase (Console → Storage → Começar).'
    default:
      return 'Não foi possível enviar a foto. Tente de novo.'
  }
}
