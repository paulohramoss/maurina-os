import { useRef, useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { useFotos } from '@/hooks/useFotos'

interface Props {
  osId: string
  fotos: string[]
  aoMudar: (fotos: string[]) => void
  somenteLeitura?: boolean
  rotulo?: string
}

/**
 * Fotos do checklist e da execução.
 *
 * `capture="environment"` faz o celular abrir direto a câmera traseira —
 * um toque a menos para quem está com a mão suja ao lado do carro.
 */
export function GaleriaFotos({ osId, fotos, aoMudar, somenteLeitura = false, rotulo = 'Fotos' }: Props) {
  const entradaRef = useRef<HTMLInputElement>(null)
  const { enviar, remover, enviando, progresso, erro } = useFotos(osId)
  const [ampliada, setAmpliada] = useState<string | null>(null)

  const adicionar = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return
    try {
      const novas = await enviar(lista)
      aoMudar([...fotos, ...novas])
    } catch {
      // A mensagem já está em `erro`.
    } finally {
      if (entradaRef.current) entradaRef.current.value = ''
    }
  }

  const apagar = async (url: string) => {
    aoMudar(fotos.filter((f) => f !== url))
    await remover(url)
  }

  return (
    <div className="flex flex-col gap-3">
      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((url) => (
            <li key={url} className="group relative aspect-square">
              <button
                type="button"
                onClick={() => setAmpliada(url)}
                className="h-full w-full overflow-hidden rounded-lg border border-grafite-700"
              >
                <img
                  src={url}
                  alt={rotulo}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>

              {!somenteLeitura && (
                <button
                  type="button"
                  onClick={() => void apagar(url)}
                  aria-label="Remover foto"
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-perigo"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!somenteLeitura && (
        <>
          <input
            ref={entradaRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => void adicionar(e.target.files)}
            className="hidden"
          />
          <Botao
            variante="secundario"
            larguraTotal
            onClick={() => entradaRef.current?.click()}
            carregando={enviando}
          >
            {progresso ? `Enviando ${progresso.atual} de ${progresso.total}…` : '📷 Tirar ou escolher foto'}
          </Botao>
          <p className="text-sm texto-fraco">
            As fotos são reduzidas no aparelho antes de subir, para não travar com internet fraca.
          </p>
        </>
      )}

      {erro && (
        <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
          {erro}
        </p>
      )}

      {ampliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setAmpliada(null)}
          role="dialog"
          aria-label="Foto ampliada"
        >
          <img src={ampliada} alt={rotulo} className="max-h-full max-w-full rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setAmpliada(null)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-toque w-toque items-center justify-center rounded-full bg-grafite-900 text-2xl text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
