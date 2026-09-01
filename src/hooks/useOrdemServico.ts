import { useCallback, useEffect, useState } from 'react'
import {
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { colHistorico, colOrdens, refConfigGeral, refOrdem, refVeiculo } from '@/lib/paths'
import { auditoriaEdicao, comId, semUndefined } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { proximoNumeroOS, type EstadoContador } from '@/domain/numeracaoOS'
import { validarTransicao, type DadosTransicao } from '@/domain/statusOS'
import { comTotaisRecalculados } from '@/domain/calculoOS'
import { proximaRevisaoPorData } from '@/utils/data'
import type {
  Cliente,
  ConfigOficina,
  EventoHistorico,
  OrdemServico,
  StatusOS,
  Veiculo,
} from '@/types'

/** O que a tela de abertura junta antes de criar a OS. */
export interface NovaOS {
  cliente: Cliente
  veiculo: Veiculo
  kmEntrada: number
  nivelCombustivel: OrdemServico['nivelCombustivel']
  checklistEntrada: OrdemServico['checklistEntrada']
  reclamacaoCliente: string
  previsaoEntrega?: Date
  observacoesInternas?: string
}

export function useOrdem(osId: string | undefined) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [os, setOS] = useState<OrdemServico | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!oficinaId || !osId) {
      setCarregando(false)
      return
    }
    return onSnapshot(refOrdem(oficinaId, osId), (snap) => {
      setOS(snap.exists() ? { ...(snap.data() as Omit<OrdemServico, 'id'>), id: snap.id } : null)
      setCarregando(false)
    })
  }, [oficinaId, osId])

  return { os, carregando }
}

/** Timeline da OS, do mais recente para o mais antigo. */
export function useHistoricoOS(osId: string | undefined) {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const [eventos, setEventos] = useState<EventoHistorico[]>([])

  useEffect(() => {
    if (!oficinaId || !osId) return
    return onSnapshot(
      query(colHistorico(oficinaId, osId), orderBy('em', 'desc')),
      (snap) => setEventos(snap.docs.map((d) => comId<EventoHistorico>(d))),
      (erro) => console.error('[Histórico] Falha ao carregar:', erro),
    )
  }, [oficinaId, osId])

  return eventos
}

export function useAcoesOS() {
  const oficinaId = useAuthStore((e) => e.oficinaId)
  const usuario = useAuthStore((e) => e.usuario)
  const mecanicoAtivoNome = useUIStore((e) => e.mecanicoAtivoNome)
  const mecanicoAtivoId = useUIStore((e) => e.mecanicoAtivoId)

  /** Quem assina o evento: no pátio, o mecânico escolhido; no balcão, o usuário. */
  const autor = useCallback(
    () => ({
      autorId: usuario?.id ?? 'desconhecido',
      autorNome:
        usuario?.papel === 'mecanico' ? (mecanicoAtivoNome ?? 'Mecânico') : (usuario?.nome ?? '—'),
    }),
    [usuario, mecanicoAtivoNome],
  )

  /**
   * Abre a OS.
   *
   * A numeração roda dentro de runTransaction: duas OS com o mesmo número
   * é problema jurídico, não bug de tela. Se dois atendentes abrirem ao mesmo
   * tempo, um dos dois refaz a leitura e pega o número seguinte.
   */
  const abrir = useCallback(
    async (dados: NovaOS): Promise<{ id: string; numero: string }> => {
      if (!oficinaId || !usuario) throw new Error('Sessão não carregada.')

      const novaRef = doc(colOrdens(oficinaId))
      const configRef = refConfigGeral(oficinaId)

      const numero = await runTransaction(db, async (tx) => {
        const configSnap = await tx.get(configRef)
        const config = configSnap.exists() ? (configSnap.data() as ConfigOficina) : null

        const estadoAtual: EstadoContador | null = config
          ? { contadorOS: config.contadorOS ?? 0, anoContador: config.anoContador ?? 0 }
          : null

        const { numero, estado } = proximoNumeroOS(estadoAtual)

        const os: Omit<OrdemServico, 'id'> = {
          numero,
          clienteId: dados.cliente.id,
          veiculoId: dados.veiculo.id,
          snapshotCliente: {
            nome: dados.cliente.nome,
            telefone: dados.cliente.telefone,
            ...(dados.cliente.cpfCnpj ? { cpfCnpj: dados.cliente.cpfCnpj } : {}),
            ...(dados.cliente.endereco ? { endereco: dados.cliente.endereco } : {}),
          },
          snapshotVeiculo: {
            placa: dados.veiculo.placa,
            marca: dados.veiculo.marca,
            modelo: dados.veiculo.modelo,
            anoModelo: dados.veiculo.anoModelo,
            cor: dados.veiculo.cor,
          },
          status: 'orcamento',
          dataEntrada: serverTimestamp() as unknown as Timestamp,
          ...(dados.previsaoEntrega
            ? { previsaoEntrega: Timestamp.fromDate(dados.previsaoEntrega) }
            : {}),
          kmEntrada: dados.kmEntrada,
          nivelCombustivel: dados.nivelCombustivel,
          checklistEntrada: dados.checklistEntrada,
          reclamacaoCliente: dados.reclamacaoCliente,
          pecas: [],
          servicos: [],
          subtotalPecas: 0,
          subtotalServicos: 0,
          desconto: { tipo: 'valor', valor: 0 },
          valorTotal: 0,
          ...(dados.observacoesInternas ? { observacoesInternas: dados.observacoesInternas } : {}),
          criadoEm: serverTimestamp() as unknown as Timestamp,
          atualizadoEm: serverTimestamp() as unknown as Timestamp,
          criadoPor: usuario.id,
          excluidoEm: null,
        }

        tx.set(novaRef, semUndefined(os as unknown as Record<string, unknown>))

        // Contador e OS na MESMA transação: ou as duas gravações valem, ou nenhuma.
        if (configSnap.exists()) {
          tx.update(configRef, { contadorOS: estado.contadorOS, anoContador: estado.anoContador })
        } else {
          tx.set(configRef, {
            nome: 'Maurina AutoCar',
            contadorOS: estado.contadorOS,
            anoContador: estado.anoContador,
            revisaoPadraoKm: 10000,
            revisaoPadraoMeses: 6,
            garantiaPadraoMeses: 3,
          } satisfies Partial<ConfigOficina>)
        }

        // A quilometragem lida na entrada é a mais recente que a oficina tem.
        tx.update(refVeiculo(oficinaId, dados.veiculo.id), {
          kmAtual: dados.kmEntrada,
          atualizadoEm: serverTimestamp(),
        })

        return numero
      })

      await addDoc(colHistorico(oficinaId, novaRef.id), {
        tipo: 'criacao',
        para: 'orcamento',
        observacao: `OS ${numero} aberta`,
        ...autor(),
        em: serverTimestamp(),
      })

      return { id: novaRef.id, numero }
    },
    [oficinaId, usuario, autor],
  )

  /**
   * Muda o status. Passa pela máquina de estados e grava o evento na timeline —
   * status e histórico nunca saem de sincronia porque vão na mesma transação.
   */
  const mudarStatus = useCallback(
    async (os: OrdemServico, para: StatusOS, dados: DadosTransicao = {}): Promise<void> => {
      if (!oficinaId || !usuario) throw new Error('Sessão não carregada.')

      const validacao = validarTransicao(os, para, dados)
      if (!validacao.ok) throw new Error(validacao.erro)

      const osRef = refOrdem(oficinaId, os.id)
      const eventoRef = doc(colHistorico(oficinaId, os.id))
      const configRef = refConfigGeral(oficinaId)

      await runTransaction(db, async (tx) => {
        const atual = await tx.get(osRef)
        if (!atual.exists()) throw new Error('OS não encontrada.')

        // Releitura dentro da transação: outra pessoa pode ter mexido no status
        // enquanto esta tela estava aberta.
        const osAtual = { ...(atual.data() as Omit<OrdemServico, 'id'>), id: os.id }
        const revalidacao = validarTransicao(osAtual, para, dados)
        if (!revalidacao.ok) throw new Error(revalidacao.erro)

        const atualizacao: Record<string, unknown> = {
          status: para,
          ...auditoriaEdicao(),
        }

        if (para === 'cancelada') {
          atualizacao.motivoCancelamento = dados.motivo
        }

        if (para === 'entregue') {
          atualizacao.dataSaida = dados.dataSaida
            ? Timestamp.fromDate(dados.dataSaida)
            : serverTimestamp()
          atualizacao.kmSaida = dados.kmSaida

          // Entrega fecha o ciclo do veículo: km atualizado e próxima revisão agendada.
          const configSnap = await tx.get(configRef)
          const config = configSnap.exists() ? (configSnap.data() as ConfigOficina) : null
          const revisaoKm = config?.revisaoPadraoKm ?? 10000
          const revisaoMeses = config?.revisaoPadraoMeses ?? 6

          tx.update(refVeiculo(oficinaId, osAtual.veiculoId), {
            kmAtual: dados.kmSaida,
            proximaRevisaoKm: (dados.kmSaida ?? 0) + revisaoKm,
            proximaRevisaoData: Timestamp.fromDate(proximaRevisaoPorData(revisaoMeses)),
            atualizadoEm: serverTimestamp(),
          })
        }

        tx.update(osRef, atualizacao)

        tx.set(eventoRef, {
          tipo: 'status',
          de: osAtual.status,
          para,
          ...(dados.motivo ? { observacao: dados.motivo } : {}),
          ...autor(),
          em: serverTimestamp(),
        })
      })
    },
    [oficinaId, usuario, autor],
  )

  /** Edição livre dos campos da OS — os totais são sempre recalculados aqui. */
  const salvar = useCallback(
    async (osId: string, campos: Partial<OrdemServico>): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')

      const precisaRecalcular =
        campos.pecas !== undefined || campos.servicos !== undefined || campos.desconto !== undefined

      const dados = precisaRecalcular
        ? comTotaisRecalculados({
            pecas: campos.pecas ?? [],
            servicos: campos.servicos ?? [],
            desconto: campos.desconto ?? { tipo: 'valor', valor: 0 },
            acrescimo: campos.acrescimo ?? 0,
          })
        : {}

      await updateDoc(
        refOrdem(oficinaId, osId),
        semUndefined({ ...campos, ...dados, ...auditoriaEdicao() } as Record<string, unknown>),
      )
    },
    [oficinaId],
  )

  /** Diagnóstico do mecânico. Registra na timeline quem escreveu. */
  const salvarDiagnostico = useCallback(
    async (osId: string, diagnostico: string): Promise<void> => {
      if (!oficinaId) throw new Error('Sessão não carregada.')

      await updateDoc(refOrdem(oficinaId, osId), {
        diagnostico,
        ...(mecanicoAtivoId ? { mecanicoResponsavelId: mecanicoAtivoId } : {}),
        ...auditoriaEdicao(),
      })

      await addDoc(colHistorico(oficinaId, osId), {
        tipo: 'edicao',
        observacao: 'Diagnóstico lançado',
        ...autor(),
        em: serverTimestamp(),
      })
    },
    [oficinaId, mecanicoAtivoId, autor],
  )

  return { abrir, mudarStatus, salvar, salvarDiagnostico }
}
