import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { AreaTexto, Entrada } from '@/components/ui/Campo'
import { EtiquetaStatus } from './EtiquetaStatus'
import { proximosStatus, rotuloStatus, validarTransicao } from '@/domain/statusOS'
import { podeAcionarStatus } from '@/domain/permissoes'
import { usePapel } from '@/store/authStore'
import { paraInputData } from '@/utils/data'
import type { OrdemServico, StatusOS } from '@/types'

/**
 * Mudança de status.
 *
 * Só aparecem os destinos que a máquina de estados aceita a partir do status
 * atual — não existe "mudar para qualquer coisa" e depois validar. O que a
 * transição exigir (motivo, KM de saída, pagamento) é pedido aqui, antes de gravar.
 */
export function PainelStatus({
  os,
  aoMudar,
}: {
  os: OrdemServico
  aoMudar: (para: StatusOS, dados: { motivo?: string; kmSaida?: number; dataSaida?: Date; pagamentoDefinido?: boolean }) => Promise<void>
}) {
  const papel = usePapel()
  const [destino, setDestino] = useState<StatusOS | null>(null)
  const [motivo, setMotivo] = useState('')
  const [kmSaida, setKmSaida] = useState(String(os.kmEntrada || ''))
  const [dataSaida, setDataSaida] = useState(paraInputData(new Date()))
  const [pagamentoOk, setPagamentoOk] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const destinos = proximosStatus(os.status).filter((s) => podeAcionarStatus(papel, s))

  const confirmar = async () => {
    if (!destino) return

    const dados = {
      ...(destino === 'cancelada' ? { motivo } : {}),
      ...(destino === 'entregue'
        ? {
            kmSaida: Number(kmSaida.replace(/\D/g, '')),
            dataSaida: dataSaida ? new Date(`${dataSaida}T12:00:00`) : new Date(),
            pagamentoDefinido: pagamentoOk,
          }
        : {}),
    }

    const validacao = validarTransicao(os, destino, dados)
    if (!validacao.ok) {
      setErro(validacao.erro)
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await aoMudar(destino, dados)
      setDestino(null)
      setMotivo('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar o status.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="superficie flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm texto-fraco">Situação</span>
        <EtiquetaStatus status={os.status} />
      </div>

      {destinos.length === 0 ? (
        <p className="text-sm texto-fraco">
          {os.status === 'entregue'
            ? 'Carro entregue. Esta OS está encerrada.'
            : os.status === 'cancelada'
              ? 'OS cancelada.'
              : 'Seu perfil não muda o status a partir daqui.'}
        </p>
      ) : !destino ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm texto-fraco">Mudar para:</span>
          <div className="flex flex-wrap gap-2">
            {destinos.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setDestino(s)
                  setErro(null)
                }}
                className="min-h-toque rounded-lg border border-grafite-700 px-4 text-sm text-grafite-200 transition-colors hover:border-acento-500 hover:bg-grafite-800"
              >
                {rotuloStatus(s)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-grafite-800 pt-3">
          <p className="text-sm text-grafite-200">
            Mudar para <strong>{rotuloStatus(destino)}</strong>
          </p>

          {destino === 'cancelada' && (
            <AreaTexto
              id="motivo"
              label="Motivo do cancelamento"
              obrigatorio
              rows={2}
              placeholder="Cliente desistiu do orçamento"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          )}

          {destino === 'entregue' && (
            <>
              <Entrada
                id="kmSaida"
                label="KM de saída"
                obrigatorio
                inputMode="numeric"
                className="font-mono"
                value={kmSaida}
                onChange={(e) => setKmSaida(e.target.value.replace(/\D/g, ''))}
                dica="Atualiza o veículo e agenda a próxima revisão"
              />
              <Entrada
                id="dataSaida"
                label="Data de saída"
                obrigatorio
                type="date"
                value={dataSaida}
                onChange={(e) => setDataSaida(e.target.value)}
              />
              <label className="flex min-h-toque cursor-pointer items-center gap-3 rounded-lg border border-grafite-700 px-3">
                <input
                  type="checkbox"
                  checked={pagamentoOk}
                  onChange={(e) => setPagamentoOk(e.target.checked)}
                  className="h-5 w-5 accent-acento-500"
                />
                <span className="text-sm text-grafite-200">
                  Situação do pagamento já foi definida com o cliente
                </span>
              </label>
            </>
          )}

          {erro && (
            <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
              {erro}
            </p>
          )}

          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => setDestino(null)} disabled={salvando}>
              Cancelar
            </Botao>
            <Botao larguraTotal onClick={() => void confirmar()} carregando={salvando}>
              Confirmar
            </Botao>
          </div>
        </div>
      )}
    </div>
  )
}
