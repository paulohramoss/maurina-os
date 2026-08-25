import { useCallback, useEffect, useState } from 'react'
import { getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { refAprovacao } from '@/lib/paths'
import { useAuthStore } from '@/store/authStore'
import { calcularTotais } from '@/domain/calculoOS'
import { paraItemPublico, type LinkAprovacao } from '@/types/aprovacao'
import type { ConfigOficina, OrdemServico } from '@/types'

/** Validade do link. Orçamento de oficina envelhece: preço de peça muda. */
const DIAS_DE_VALIDADE = 7

/**
 * Token do link.
 *
 * `crypto.randomUUID` sem os hífens dá 32 caracteres hexadecimais — espaço
 * grande o bastante para ninguém adivinhar o orçamento de outro cliente,
 * que é a única coisa que protege este documento (ele é lido sem login).
 */
function gerarToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function useAcoesAprovacaoPublica() {
  const oficinaId = useAuthStore((e) => e.oficinaId)

  /**
   * Cria o link com uma cópia do orçamento.
   *
   * A cópia é de propósito: dar ao cliente permissão de ler a OS significaria
   * abrir a coleção inteira para quem não está logado. Aqui ele lê um documento
   * só, que contém apenas o que precisa para decidir.
   */
  const gerar = useCallback(
    async (os: OrdemServico, config: ConfigOficina): Promise<string> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')
      if (os.pecas.length === 0 && os.servicos.length === 0) {
        throw new Error('Lance as peças e serviços antes de mandar o cliente aprovar.')
      }

      const token = gerarToken()
      const totais = calcularTotais(os.pecas, os.servicos, os.desconto, os.acrescimo ?? 0)

      const expira = new Date()
      expira.setDate(expira.getDate() + DIAS_DE_VALIDADE)

      const dados: Omit<LinkAprovacao, 'id' | 'criadoEm'> & { criadoEm: unknown } = {
        oficinaId,
        osId: os.id,
        osNumero: os.numero,
        nomeOficina: config.nome,
        ...(config.telefone ? { telefoneOficina: config.telefone } : {}),
        nomeCliente: os.snapshotCliente.nome,
        veiculo: `${os.snapshotVeiculo.marca} ${os.snapshotVeiculo.modelo} ${os.snapshotVeiculo.anoModelo}`,
        placa: os.snapshotVeiculo.placa,
        reclamacao: os.reclamacaoCliente,
        ...(os.diagnostico ? { diagnostico: os.diagnostico } : {}),
        pecas: os.pecas.map(paraItemPublico),
        servicos: os.servicos.map(paraItemPublico),
        subtotalPecas: totais.subtotalPecas,
        subtotalServicos: totais.subtotalServicos,
        descontoValor: totais.descontoValor,
        acrescimo: totais.acrescimo,
        valorTotal: totais.valorTotal,
        // Só as fotos da entrada: são as que justificam o orçamento.
        fotos: os.checklistEntrada.fotos.slice(0, 6),
        garantiaMeses: os.garantiaServicoMeses ?? config.garantiaPadraoMeses,
        criadoEm: serverTimestamp(),
        expiraEm: Timestamp.fromDate(expira),
        cancelado: false,
        resposta: null,
        respondidoPor: null,
        respondidoEm: null,
      }

      await setDoc(refAprovacao(token), dados)
      return token
    },
    [oficinaId],
  )

  const cancelar = useCallback(async (token: string): Promise<void> => {
    await updateDoc(refAprovacao(token), { cancelado: true })
  }, [])

  return { gerar, cancelar, diasDeValidade: DIAS_DE_VALIDADE }
}

/** Leitura do link pelo cliente — sem login. */
export function useLinkAprovacao(token: string | undefined) {
  const [link, setLink] = useState<LinkAprovacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setCarregando(false)
      return
    }

    return onSnapshot(
      refAprovacao(token),
      (snap) => {
        if (!snap.exists()) {
          setErro('Este link não existe ou já foi encerrado pela oficina.')
          setLink(null)
        } else {
          setLink({ ...(snap.data() as Omit<LinkAprovacao, 'id'>), id: snap.id })
          setErro(null)
        }
        setCarregando(false)
      },
      () => {
        // As Rules recusam a leitura de link vencido ou cancelado: para o cliente
        // é a mesma coisa que não existir, e é isso que a mensagem diz.
        setErro('Este link expirou ou foi encerrado pela oficina. Fale com ela para receber outro.')
        setCarregando(false)
      },
    )
  }, [token])

  return { link, carregando, erro }
}

/** Resposta do cliente. Uma vez só: a Rule recusa a segunda. */
export function useResponderAprovacao(token: string | undefined) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const responder = useCallback(
    async (resposta: 'aprovado' | 'recusado', nome: string, observacao?: string): Promise<void> => {
      if (!token) return

      setEnviando(true)
      setErro(null)
      try {
        await updateDoc(refAprovacao(token), {
          resposta,
          respondidoPor: nome.trim(),
          respondidoEm: serverTimestamp(),
          ...(observacao?.trim() ? { observacaoCliente: observacao.trim() } : {}),
        })
      } catch (e) {
        console.error('[Aprovação] Falha ao responder:', e)
        setErro('Não foi possível registrar sua resposta. O link pode ter expirado.')
        throw e
      } finally {
        setEnviando(false)
      }
    },
    [token],
  )

  return { responder, enviando, erro }
}

/**
 * Acompanhamento do link pelo balcão.
 *
 * O documento vive fora da oficina, então quem observa a resposta é a tela da
 * OS: quando o cliente aprova, o atendente vê aqui e transporta para a OS.
 */
export function useAcompanharAprovacao(token: string | null | undefined) {
  const [link, setLink] = useState<LinkAprovacao | null>(null)

  useEffect(() => {
    if (!token) {
      setLink(null)
      return
    }

    return onSnapshot(
      refAprovacao(token),
      (snap) =>
        setLink(snap.exists() ? { ...(snap.data() as Omit<LinkAprovacao, 'id'>), id: snap.id } : null),
      (e) => console.error('[Aprovação] Falha ao acompanhar:', e),
    )
  }, [token])

  return link
}

/** Busca pontual, usada ao abrir a OS que já tem um link gerado. */
export async function lerLinkAprovacao(token: string): Promise<LinkAprovacao | null> {
  const snap = await getDoc(refAprovacao(token))
  return snap.exists() ? { ...(snap.data() as Omit<LinkAprovacao, 'id'>), id: snap.id } : null
}
