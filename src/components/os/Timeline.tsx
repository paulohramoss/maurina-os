import type { EventoHistorico } from '@/types'
import { corStatus, rotuloStatus } from '@/domain/statusOS'
import { formatarDataHora } from '@/utils/data'

/**
 * Timeline da OS. Cada mudança de status deixa rastro com autor e horário —
 * é o que responde "quem mandou fazer isso?" três meses depois.
 */
export function Timeline({ eventos }: { eventos: EventoHistorico[] }) {
  if (eventos.length === 0) {
    return <p className="text-sm texto-fraco">Nenhum evento registrado ainda.</p>
  }

  return (
    <ol className="flex flex-col">
      {eventos.map((evento, i) => {
        const cor = evento.para ? corStatus(evento.para).borda : '#5c5e68'
        const ultimo = i === eventos.length - 1

        return (
          <li key={evento.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-grafite-900"
                style={{ backgroundColor: cor }}
              />
              {!ultimo && <span className="w-px flex-1 bg-grafite-700" />}
            </div>

            <div className={ultimo ? 'pb-1' : 'pb-5'}>
              <p className="text-sm font-medium text-grafite-100">
                {evento.para ? rotuloStatus(evento.para) : 'Atualização'}
                {evento.de && (
                  <span className="font-normal texto-fraco"> · veio de {rotuloStatus(evento.de)}</span>
                )}
              </p>
              {evento.observacao && (
                <p className="mt-0.5 text-sm text-grafite-300">{evento.observacao}</p>
              )}
              <p className="mt-0.5 text-xs texto-fraco">
                {evento.autorNome} · {formatarDataHora(evento.em)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
