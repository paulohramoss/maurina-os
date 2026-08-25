import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLinkAprovacao, useResponderAprovacao } from '@/hooks/useAprovacaoPublica'
import { Carregando } from '@/components/ui/Carregando'
import { Botao } from '@/components/ui/Botao'
import { Entrada, AreaTexto } from '@/components/ui/Campo'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarPlaca } from '@/utils/placa'
import { formatarDataHora } from '@/utils/data'
import { linkWhatsApp } from '@/utils/telefone'
import { IconeCarro } from '@/components/layout/Icones'
import type { ItemPublicoOrcamento } from '@/types/aprovacao'

/**
 * Página pública de aprovação do orçamento.
 *
 * O cliente abre pelo WhatsApp, no celular, sem instalar nada e sem login.
 * Ele vê o que vai ser feito, quanto custa e as fotos — e responde com um toque.
 *
 * É a tela que acaba com o "eu não autorizei isso": a resposta fica gravada
 * com nome e horário, e a oficina consegue mostrar.
 */
export function TelaAprovacao() {
  const { token } = useParams<{ token: string }>()
  const { link, carregando, erro } = useLinkAprovacao(token)
  const { responder, enviando } = useResponderAprovacao(token)

  const [nome, setNome] = useState('')
  const [observacao, setObservacao] = useState('')
  const [recusando, setRecusando] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  if (carregando) return <Carregando mensagem="Abrindo seu orçamento…" />

  if (erro || !link) {
    return (
      <Aviso
        titulo="Link indisponível"
        texto={erro ?? 'Não foi possível abrir este orçamento.'}
      />
    )
  }

  // Já respondido: mostra o comprovante, não o formulário de novo.
  if (link.resposta) {
    const aprovado = link.resposta === 'aprovado'
    return (
      <Moldura oficina={link.nomeOficina}>
        <div
          className={[
            'rounded-xl border p-6 text-center',
            aprovado ? 'border-sucesso/50 bg-sucesso/10' : 'border-alerta/50 bg-alerta/10',
          ].join(' ')}
        >
          <p className="text-4xl">{aprovado ? '✓' : '✕'}</p>
          <h2 className="mt-2 font-titulo text-xl uppercase text-grafite-50">
            {aprovado ? 'Orçamento aprovado' : 'Orçamento recusado'}
          </h2>
          <p className="mt-1 text-sm texto-fraco">
            Por {link.respondidoPor} em {formatarDataHora(link.respondidoEm)}
          </p>
          <p className="mt-4 text-grafite-200">
            {aprovado
              ? 'A oficina já foi avisada e vai tocar o serviço. Obrigado!'
              : 'A oficina foi avisada. Se quiser conversar sobre os valores, é só chamar.'}
          </p>
        </div>

        <ResumoOrcamento link={link} />

        {link.telefoneOficina && (
          <a
            href={linkWhatsApp(
              link.telefoneOficina,
              `Olá! Sobre a OS ${link.osNumero} do meu ${link.veiculo}: `,
            )}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[56px] items-center justify-center rounded-lg border border-sucesso/50 px-4 text-sucesso"
          >
            Falar com a oficina no WhatsApp
          </a>
        )}
      </Moldura>
    )
  }

  const enviar = async (resposta: 'aprovado' | 'recusado') => {
    if (nome.trim().length < 3) {
      setErroLocal('Escreva seu nome para confirmar.')
      return
    }
    setErroLocal(null)
    try {
      await responder(resposta, nome, observacao)
    } catch {
      setErroLocal('Não foi possível registrar. O link pode ter expirado — fale com a oficina.')
    }
  }

  return (
    <Moldura oficina={link.nomeOficina}>
      <header className="text-center">
        <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">
          Orçamento do seu veículo
        </h1>
        <p className="text-sm texto-fraco">
          Olá, {link.nomeCliente.split(' ')[0]}. Confira e responda abaixo.
        </p>
      </header>

      <section className="superficie rounded-xl p-4 text-center">
        <p className="font-mono text-2xl font-bold tracking-wider text-grafite-50">
          {formatarPlaca(link.placa)}
        </p>
        <p className="text-grafite-300">{link.veiculo}</p>
        <p className="mt-1 font-mono text-xs texto-fraco">OS {link.osNumero}</p>
      </section>

      <section className="superficie rounded-xl p-4">
        <h2 className="mb-2 font-titulo text-lg uppercase text-grafite-200">O que você relatou</h2>
        <p className="whitespace-pre-wrap text-grafite-200">{link.reclamacao}</p>

        {link.diagnostico && (
          <>
            <h2 className="mb-2 mt-4 font-titulo text-lg uppercase text-grafite-200">
              O que encontramos
            </h2>
            <p className="whitespace-pre-wrap text-grafite-200">{link.diagnostico}</p>
          </>
        )}
      </section>

      {link.fotos.length > 0 && (
        <section className="superficie rounded-xl p-4">
          <h2 className="mb-2 font-titulo text-lg uppercase text-grafite-200">Fotos</h2>
          <div className="grid grid-cols-3 gap-2">
            {link.fotos.map((url) => (
              <img
                key={url}
                src={url}
                alt="Foto do veículo"
                loading="lazy"
                className="aspect-square w-full rounded-lg border border-grafite-700 object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <ResumoOrcamento link={link} />

      <section className="superficie flex flex-col gap-4 rounded-xl p-4">
        <Entrada
          id="nome-cliente"
          label="Seu nome"
          obrigatorio
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como você se chama"
          autoComplete="name"
        />

        {recusando && (
          <AreaTexto
            id="observacao"
            label="Quer dizer o motivo? (opcional)"
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Achei caro · vou pensar · só quero a parte do freio"
          />
        )}

        {erroLocal && (
          <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
            {erroLocal}
          </p>
        )}

        <Botao tamanho="lg" larguraTotal onClick={() => void enviar('aprovado')} carregando={enviando}>
          Aprovar orçamento
        </Botao>

        {recusando ? (
          <Botao variante="perigo" larguraTotal onClick={() => void enviar('recusado')} carregando={enviando}>
            Confirmar recusa
          </Botao>
        ) : (
          <Botao variante="secundario" larguraTotal onClick={() => setRecusando(true)}>
            Não quero fazer agora
          </Botao>
        )}

        <p className="text-center text-xs texto-fraco">
          Ao aprovar, você autoriza a execução dos serviços listados acima.
          Sua resposta fica registrada com data e hora.
        </p>
      </section>

      {link.telefoneOficina && (
        <a
          href={linkWhatsApp(
            link.telefoneOficina,
            `Olá! Sobre o orçamento da OS ${link.osNumero}: `,
          )}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[56px] items-center justify-center rounded-lg border border-sucesso/50 px-4 text-sucesso"
        >
          Tenho uma dúvida — falar no WhatsApp
        </a>
      )}
    </Moldura>
  )
}

function ResumoOrcamento({ link }: { link: NonNullable<ReturnType<typeof useLinkAprovacao>['link']> }) {
  return (
    <section className="superficie rounded-xl p-4">
      <h2 className="mb-3 font-titulo text-lg uppercase text-grafite-200">Orçamento</h2>

      {link.pecas.length > 0 && <Grupo titulo="Peças" itens={link.pecas} />}
      {link.servicos.length > 0 && <Grupo titulo="Mão de obra" itens={link.servicos} />}

      <dl className="mt-3 flex flex-col gap-1 border-t border-grafite-800 pt-3">
        {link.descontoValor > 0 && (
          <div className="flex justify-between gap-3 text-sm">
            <dt className="texto-fraco">Desconto</dt>
            <dd className="font-mono text-sucesso">- {formatarMoeda(link.descontoValor)}</dd>
          </div>
        )}
        {link.acrescimo > 0 && (
          <div className="flex justify-between gap-3 text-sm">
            <dt className="texto-fraco">Acréscimo</dt>
            <dd className="font-mono text-grafite-100">{formatarMoeda(link.acrescimo)}</dd>
          </div>
        )}
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-grafite-700 pt-3">
          <dt className="font-titulo text-lg uppercase text-grafite-200">Total</dt>
          <dd className="font-mono text-3xl font-bold text-acento-400">
            {formatarMoeda(link.valorTotal)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-center text-xs texto-fraco">
        Garantia de {link.garantiaMeses} meses sobre os serviços executados.
      </p>
    </section>
  )
}

function Grupo({ titulo, itens }: { titulo: string; itens: ItemPublicoOrcamento[] }) {
  return (
    <div className="mb-3">
      <h3 className="mb-1 text-sm font-medium text-grafite-300">{titulo}</h3>
      <ul className="flex flex-col gap-1.5">
        {itens.map((item, i) => (
          <li key={`${item.descricao}-${i}`} className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 text-grafite-100">
              {item.descricao}
              {item.quantidade > 1 && <span className="texto-fraco"> ({item.quantidade}×)</span>}
            </span>
            <span className="shrink-0 font-mono text-grafite-100">
              {formatarMoeda(item.valorTotal)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Moldura({ oficina, children }: { oficina: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-grafite-950 px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-center gap-2 pb-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-acento-500 text-grafite-950">
            <IconeCarro className="h-5 w-5" />
          </span>
          <span className="font-titulo text-lg font-bold uppercase tracking-wider text-grafite-50">
            {oficina}
          </span>
        </div>

        {children}

        <p className="pb-6 pt-2 text-center text-xs texto-fraco">
          Link pessoal e temporário. Não compartilhe.
        </p>
      </div>
    </div>
  )
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-grafite-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-grafite-800 bg-grafite-900 p-6 text-center">
        <h1 className="font-titulo text-xl uppercase text-grafite-50">{titulo}</h1>
        <p className="mt-2 text-grafite-300">{texto}</p>
      </div>
    </div>
  )
}
