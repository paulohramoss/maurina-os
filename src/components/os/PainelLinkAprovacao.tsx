import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import {
  useAcompanharAprovacao,
  useAcoesAprovacaoPublica,
} from '@/hooks/useAprovacaoPublica'
import { useAcoesOS } from '@/hooks/useOrdemServico'
import { useConfigOficina } from '@/hooks/useConfigOficina'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarDataHora } from '@/utils/data'
import { linkWhatsApp } from '@/utils/telefone'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import { Timestamp } from 'firebase/firestore'
import type { OrdemServico } from '@/types'

/**
 * Aprovação por WhatsApp.
 *
 * Gera um link público com o orçamento, manda pelo WhatsApp e fica escutando
 * a resposta. Quando o cliente aprova, o balcão recebe aqui e transporta para
 * a OS com um toque — com o nome de quem aprovou e o horário exato.
 */
export function PainelLinkAprovacao({ os }: { os: OrdemServico }) {
  const { config } = useConfigOficina()
  const { gerar, cancelar, diasDeValidade } = useAcoesAprovacaoPublica()
  const { salvar } = useAcoesOS()
  const link = useAcompanharAprovacao(os.tokenAprovacao)

  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const url = os.tokenAprovacao ? `${window.location.origin}/aprovar/${os.tokenAprovacao}` : null

  const criar = async () => {
    setGerando(true)
    setErro(null)
    try {
      const token = await gerar(os, config)
      await salvar(os.id, { tokenAprovacao: token })
    } catch (e) {
      setErro(e instanceof Error && e.message.includes('Lance') ? e.message : mensagemErroFirestore(e))
    } finally {
      setGerando(false)
    }
  }

  const desligar = async () => {
    if (!os.tokenAprovacao) return
    await cancelar(os.tokenAprovacao)
    await salvar(os.id, { tokenAprovacao: '' })
  }

  const copiar = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Navegador sem permissão de área de transferência: o link está à vista
      // logo abaixo e dá para copiar na mão.
      setErro('Não consegui copiar sozinho — o link está aí embaixo.')
    }
  }

  /** Traz a resposta do cliente para dentro da OS. */
  const registrarNaOS = async () => {
    if (!link?.resposta || !link.respondidoEm) return

    if (link.resposta === 'aprovado') {
      await salvar(os.id, {
        aprovacao: {
          aprovadoPor: link.respondidoPor ?? link.nomeCliente,
          canal: 'link',
          aprovadoEm: link.respondidoEm as Timestamp,
        },
      })
    } else {
      const nota = `Cliente recusou o orçamento pelo link${
        link.observacaoCliente ? `: "${link.observacaoCliente}"` : '.'
      }`
      await salvar(os.id, {
        observacoesInternas: os.observacoesInternas ? `${os.observacoesInternas}\n${nota}` : nota,
      })
    }
  }

  const mensagem =
    `Olá, ${os.snapshotCliente.nome.split(' ')[0]}! Aqui é da ${config.nome}. ` +
    `O orçamento do seu ${os.snapshotVeiculo.marca} ${os.snapshotVeiculo.modelo} ficou em ` +
    `${formatarMoeda(os.valorTotal)}. Dá uma olhada e aprove por aqui, é rapidinho:\n${url ?? ''}`

  return (
    <section className="superficie rounded-xl p-4">
      <h2 className="mb-3 font-titulo text-lg uppercase tracking-wide text-grafite-200">
        Aprovação por WhatsApp
      </h2>

      {!os.tokenAprovacao ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm texto-fraco">
            Gera um link com o orçamento e as fotos. O cliente abre no celular, sem instalar nada,
            e aprova com um toque. A resposta fica registrada com nome e horário.
          </p>
          {erro && (
            <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
              {erro}
            </p>
          )}
          <Botao larguraTotal onClick={() => void criar()} carregando={gerando}>
            Gerar link de aprovação
          </Botao>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {link?.resposta ? (
            <div
              className={[
                'rounded-lg border p-3',
                link.resposta === 'aprovado'
                  ? 'border-sucesso/50 bg-sucesso/10'
                  : 'border-alerta/50 bg-alerta/10',
              ].join(' ')}
            >
              <p className="font-medium text-grafite-50">
                {link.resposta === 'aprovado' ? '✓ Cliente aprovou' : '✕ Cliente recusou'}
              </p>
              <p className="text-sm texto-fraco">
                {link.respondidoPor} · {formatarDataHora(link.respondidoEm)}
              </p>
              {link.observacaoCliente && (
                <p className="mt-1 text-sm text-grafite-200">“{link.observacaoCliente}”</p>
              )}

              {link.resposta === 'aprovado' && !os.aprovacao && (
                <Botao className="mt-3" larguraTotal onClick={() => void registrarNaOS()}>
                  Registrar aprovação na OS
                </Botao>
              )}
              {link.resposta === 'recusado' && (
                <Botao
                  className="mt-3"
                  variante="secundario"
                  larguraTotal
                  onClick={() => void registrarNaOS()}
                >
                  Anotar recusa nas observações
                </Botao>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-grafite-700 bg-grafite-800/40 p-3">
              <p className="text-sm text-grafite-200">Aguardando a resposta do cliente…</p>
              {link?.expiraEm && (
                <p className="text-xs texto-fraco">
                  O link vale até {formatarDataHora(link.expiraEm)} ({diasDeValidade} dias).
                </p>
              )}
            </div>
          )}

          {url && (
            <p className="break-all rounded-lg bg-grafite-800 p-2 font-mono text-xs text-grafite-300">
              {url}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={linkWhatsApp(os.snapshotCliente.telefone, mensagem)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-toque flex-1 items-center justify-center rounded-lg bg-sucesso px-4 text-sm font-semibold text-white hover:brightness-110"
            >
              Enviar no WhatsApp
            </a>
            <Botao variante="secundario" onClick={() => void copiar()}>
              {copiado ? 'Copiado ✓' : 'Copiar'}
            </Botao>
          </div>

          <Botao variante="fantasma" larguraTotal onClick={() => void desligar()}>
            Encerrar este link
          </Botao>

          {erro && <p className="text-sm text-perigo">{erro}</p>}
        </div>
      )}
    </section>
  )
}
