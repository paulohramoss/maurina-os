/**
 * Oficina não tem 5G. Foto de celular moderno tem 4-8 MB;
 * subir isso do pátio trava o app. Comprime no canvas antes de tocar no Storage.
 */

const LARGURA_MAXIMA = 1280
const QUALIDADE = 0.7

export interface ImagemComprimida {
  blob: Blob
  largura: number
  altura: number
  bytesOriginais: number
  bytesFinais: number
}

export async function comprimirImagem(
  arquivo: File,
  larguraMaxima: number = LARGURA_MAXIMA,
  qualidade: number = QUALIDADE,
): Promise<ImagemComprimida> {
  const bitmap = await carregarBitmap(arquivo)

  const escala = Math.min(1, larguraMaxima / Math.max(bitmap.width, bitmap.height))
  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem neste aparelho.')

  ctx.drawImage(bitmap, 0, 0, largura, altura)
  if ('close' in bitmap) bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', qualidade),
  )
  if (!blob) throw new Error('Falha ao comprimir a foto.')

  return {
    blob,
    largura,
    altura,
    bytesOriginais: arquivo.size,
    bytesFinais: blob.size,
  }
}

async function carregarBitmap(arquivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    // Respeita a orientação EXIF — foto tirada deitada não pode subir de lado.
    return createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  }

  const url = URL.createObjectURL(arquivo)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Não foi possível ler a foto.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 2483920 → "2,4 MB" */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
