import { useEffect, useRef, useState } from 'react'
import { Botao } from '@/components/ui/Botao'

interface Props {
  aoConfirmar: (assinaturaBase64: string) => void
  aoCancelar?: () => void
}

/**
 * Assinatura do cliente no dedo, na tela do celular.
 *
 * Vale mais que a via de papel no fim do dia: fica anexada à OS com data e hora,
 * e é o que responde ao "eu não autorizei esse serviço" três semanas depois.
 */
export function Assinatura({ aoConfirmar, aoCancelar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)
  const [temTraco, setTemTraco] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Densidade real da tela: sem isso, a assinatura sai serrilhada no celular.
    const proporcao = window.devicePixelRatio || 1
    const caixa = canvas.getBoundingClientRect()

    canvas.width = caixa.width * proporcao
    canvas.height = caixa.height * proporcao

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(proporcao, proporcao)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111214'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, caixa.width, caixa.height)
  }, [])

  const posicao = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - caixa.left, y: e.clientY - caixa.top }
  }

  const iniciar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const { x, y } = posicao(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    desenhando.current = true
    setTemTraco(true)
  }

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const { x, y } = posicao(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const parar = () => {
    desenhando.current = false
  }

  const limpar = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const caixa = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, caixa.width, caixa.height)
    setTemTraco(false)
  }

  const confirmar = () => {
    const canvas = canvasRef.current
    if (!canvas || !temTraco) return
    // JPEG a 0.8: a assinatura vai dentro do documento da OS, precisa ser leve.
    aoConfirmar(canvas.toDataURL('image/jpeg', 0.8))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm texto-fraco">Peça para o cliente assinar no espaço abaixo.</p>

      <canvas
        ref={canvasRef}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={parar}
        onPointerLeave={parar}
        className="h-44 w-full touch-none rounded-lg border-2 border-dashed border-grafite-600 bg-white"
      />

      <div className="flex gap-2">
        <Botao variante="secundario" onClick={limpar} disabled={!temTraco}>
          Limpar
        </Botao>
        {aoCancelar && (
          <Botao variante="fantasma" onClick={aoCancelar}>
            Cancelar
          </Botao>
        )}
        <Botao larguraTotal onClick={confirmar} disabled={!temTraco}>
          Confirmar assinatura
        </Botao>
      </div>
    </div>
  )
}
