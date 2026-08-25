import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { Entrada, Selecao } from '@/components/ui/Campo'
import { CampoMoeda } from '@/components/ui/CampoMoeda'
import { Modal } from '@/components/ui/Modal'
import { Assinatura } from '@/components/os/Assinatura'
import { PainelLinkAprovacao } from '@/components/os/PainelLinkAprovacao'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarDataHora } from '@/utils/data'
import { OPCOES_FORMA, rotuloForma, useAcoesPagamento, usePagamentos } from '@/hooks/usePagamentos'
import { useAcoesOS } from '@/hooks/useOrdemServico'
import { saldoDevedor } from '@/domain/calculoOS'
import { pode } from '@/domain/permissoes'
import { usePapel } from '@/store/authStore'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import { Timestamp } from 'firebase/firestore'
import type { CanalAprovacao, Centavos, FormaPagamento, OrdemServico } from '@/types'

/**
 * Aprovação do orçamento e recebimento.
 *
 * A aprovação assinada é o que encerra a discussão do "eu não autorizei isso":
 * fica gravada com quem aprovou, por qual canal e em que minuto.
 */
export function AbaFinanceiro({ os }: { os: OrdemServico }) {
  const papel = usePapel()
  const podeLancar = pode(papel, 'financeiro:lancar')

  return (
    <div className="flex flex-col gap-5">
      <BlocoAprovacao os={os} podeEditar={podeLancar} />
      {podeLancar && !os.aprovacao && <PainelLinkAprovacao os={os} />}
      <BlocoPagamento os={os} podeEditar={podeLancar} />
    </div>
  )
}

const CANAIS: { valor: CanalAprovacao; rotulo: string }[] = [
  { valor: 'presencial', rotulo: 'Presencial' },
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'telefone', rotulo: 'Telefone' },
  { valor: 'link', rotulo: 'Link de aprovação' },
]

function BlocoAprovacao({ os, podeEditar }: { os: OrdemServico; podeEditar: boolean }) {
  const { salvar } = useAcoesOS()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState(os.snapshotCliente.nome)
  const [canal, setCanal] = useState<CanalAprovacao>('presencial')
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const confirmar = async () => {
    if (nome.trim().length < 3) {
      setErro('Informe quem aprovou.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await salvar(os.id, {
        aprovacao: {
          aprovadoPor: nome.trim(),
          canal,
          ...(assinatura ? { assinaturaBase64: assinatura } : {}),
          // Horário do aparelho, e não do servidor: a assinatura é colhida
          // presencialmente e precisa ser gravada mesmo com o app offline.
          aprovadoEm: Timestamp.now(),
        },
      })
      setAberto(false)
      setAssinatura(null)
    } catch (e) {
      setErro(mensagemErroFirestore(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="superficie rounded-xl p-4">
      <h2 className="mb-3 font-titulo text-lg uppercase tracking-wide text-grafite-200">Aprovação</h2>

      {os.aprovacao ? (
        <div className="flex flex-col gap-2">
          <p className="text-grafite-100">
            Aprovado por <strong>{os.aprovacao.aprovadoPor}</strong>
          </p>
          <p className="text-sm texto-fraco">
            {CANAIS.find((c) => c.valor === os.aprovacao?.canal)?.rotulo ?? os.aprovacao.canal} ·{' '}
            {formatarDataHora(os.aprovacao.aprovadoEm)}
          </p>
          {os.aprovacao.assinaturaBase64 && (
            <img
              src={os.aprovacao.assinaturaBase64}
              alt="Assinatura do cliente"
              className="mt-1 h-20 w-auto self-start rounded-lg bg-white p-1"
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm texto-fraco">
            Orçamento ainda não aprovado. Registre a autorização antes de começar o serviço.
          </p>
          {podeEditar && (
            <Botao variante="secundario" larguraTotal onClick={() => setAberto(true)}>
              Registrar aprovação
            </Botao>
          )}
        </div>
      )}

      <Modal
        aberto={aberto}
        titulo="Registrar aprovação"
        aoFechar={() => setAberto(false)}
        rodape={
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao larguraTotal tamanho="lg" onClick={() => void confirmar()} carregando={salvando}>
              Confirmar
            </Botao>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-grafite-800 p-3">
            <p className="text-sm texto-fraco">Valor aprovado</p>
            <p className="font-mono text-2xl font-bold text-acento-400">
              {formatarMoeda(os.valorTotal)}
            </p>
          </div>

          <Entrada
            id="aprovado-por"
            label="Quem aprovou"
            obrigatorio
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <Selecao
            id="canal"
            label="Por onde aprovou"
            opcoes={CANAIS.map((c) => ({ valor: c.valor, rotulo: c.rotulo }))}
            value={canal}
            onChange={(e) => setCanal(e.target.value as CanalAprovacao)}
          />

          {assinatura ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-grafite-300">Assinatura</span>
              <img src={assinatura} alt="Assinatura" className="h-24 rounded-lg bg-white object-contain p-1" />
              <Botao variante="fantasma" onClick={() => setAssinatura(null)}>
                Assinar de novo
              </Botao>
            </div>
          ) : (
            canal === 'presencial' && <Assinatura aoConfirmar={setAssinatura} />
          )}

          {erro && (
            <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
              {erro}
            </p>
          )}
        </div>
      </Modal>
    </section>
  )
}

function BlocoPagamento({ os, podeEditar }: { os: OrdemServico; podeEditar: boolean }) {
  const { pagamentos } = usePagamentos({ osId: os.id })
  const { registrar, definirPendente } = useAcoesPagamento()

  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState<Centavos>(0)
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [parcelas, setParcelas] = useState('1')
  const [nota, setNota] = useState(os.pagamento?.numeroNota ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const pago = os.pagamento?.valorPago ?? 0
  const saldo = saldoDevedor(os.valorTotal, pago)

  const abrir = () => {
    setValor(saldo)
    setErro(null)
    setAberto(true)
  }

  const confirmar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      await registrar(os, {
        valor,
        forma,
        ...(forma === 'credito' && Number(parcelas) > 1 ? { parcelas: Number(parcelas) } : {}),
        ...(nota.trim() ? { numeroNota: nota.trim() } : {}),
      })
      setAberto(false)
    } catch (e) {
      setErro(e instanceof Error && e.message.includes('valor') ? e.message : mensagemErroFirestore(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="superficie rounded-xl p-4">
      <h2 className="mb-3 font-titulo text-lg uppercase tracking-wide text-grafite-200">Pagamento</h2>

      <dl className="flex flex-col gap-1 border-b border-grafite-800 pb-3">
        <Linha rotulo="Total da OS" valor={formatarMoeda(os.valorTotal)} />
        <Linha rotulo="Recebido" valor={formatarMoeda(pago)} cor="text-sucesso" />
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-grafite-800 pt-2">
          <dt className="font-medium text-grafite-200">Falta receber</dt>
          <dd
            className={`font-mono text-xl font-bold ${saldo === 0 ? 'text-sucesso' : 'text-acento-400'}`}
          >
            {formatarMoeda(saldo)}
          </dd>
        </div>
      </dl>

      {pagamentos.length > 0 && (
        <ul className="flex flex-col gap-1.5 py-3 text-sm">
          {pagamentos.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 border-b border-grafite-800 pb-1.5 last:border-0">
              <span className="text-grafite-100">
                {rotuloForma(p.forma)}
                {p.parcelas && p.parcelas > 1 && ` em ${p.parcelas}x`}
              </span>
              <span className="text-right">
                <span className="block font-mono text-grafite-100">{formatarMoeda(p.valor)}</span>
                <span className="block text-xs texto-fraco">{formatarDataHora(p.recebidoEm)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <div className="flex flex-col gap-2 pt-3">
          {saldo > 0 && (
            <Botao larguraTotal onClick={abrir}>
              Registrar recebimento
            </Botao>
          )}
          {!os.pagamento && (
            <Botao variante="secundario" larguraTotal onClick={() => void definirPendente(os, 'prazo')}>
              Marcar para pagar na retirada
            </Botao>
          )}
        </div>
      )}

      <Modal
        aberto={aberto}
        titulo="Registrar recebimento"
        aoFechar={() => setAberto(false)}
        rodape={
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao larguraTotal tamanho="lg" onClick={() => void confirmar()} carregando={salvando}>
              Confirmar
            </Botao>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <CampoMoeda
            id="valor-recebido"
            label="Valor recebido"
            obrigatorio
            valor={valor}
            aoMudar={setValor}
            dica={`Falta receber ${formatarMoeda(saldo)}`}
          />

          <Selecao
            id="forma-pagamento"
            label="Forma"
            opcoes={OPCOES_FORMA.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
            value={forma}
            onChange={(e) => setForma(e.target.value as FormaPagamento)}
          />

          {forma === 'credito' && (
            <Entrada
              id="parcelas"
              label="Parcelas"
              inputMode="numeric"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value.replace(/\D/g, '') || '1')}
            />
          )}

          <Entrada
            id="nota"
            label="Número da nota"
            placeholder="Opcional — digitado à mão"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            dica="O sistema não emite NF-e. Este campo é só um registro."
          />

          {erro && (
            <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
              {erro}
            </p>
          )}
        </div>
      </Modal>
    </section>
  )
}

function Linha({ rotulo, valor, cor = 'text-grafite-100' }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm texto-fraco">{rotulo}</dt>
      <dd className={`font-mono ${cor}`}>{valor}</dd>
    </div>
  )
}
