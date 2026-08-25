import { useMecanicos } from '@/hooks/useMecanicos'
import { useUIStore } from '@/store/uiStore'
import { Carregando } from '@/components/ui/Carregando'
import { marca } from '@/theme'
import { IconeCarro } from '@/components/layout/Icones'

/**
 * "Quem é você?"
 *
 * O celular do pátio tem um login só para a oficina inteira. Sem esta tela,
 * o histórico da OS diria apenas "Mecânico" — e a pergunta "quem mexeu nesse
 * carro?" ficaria sem resposta. Aparece uma vez por sessão e some até fechar o app.
 */
export function SeletorMecanico() {
  const { ativos, carregando } = useMecanicos()
  const definirMecanicoAtivo = useUIStore((e) => e.definirMecanicoAtivo)

  if (carregando) return <Carregando mensagem="Carregando a equipe…" />

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-acento-500 text-grafite-950">
          <IconeCarro className="h-8 w-8" />
        </span>
        <h1 className="font-titulo text-2xl uppercase tracking-wider text-grafite-50">
          Quem está no aparelho?
        </h1>
        <p className="text-sm texto-fraco">
          Toque no seu nome. É ele que vai assinar o que você fizer nas OS de hoje.
        </p>
      </div>

      {ativos.length === 0 ? (
        <div className="w-full max-w-sm rounded-xl border border-dashed border-grafite-700 p-6 text-center">
          <p className="text-grafite-200">Nenhum mecânico cadastrado ainda.</p>
          <p className="mt-2 text-sm texto-fraco">
            Peça para o balcão cadastrar a equipe em {marca.nomeCurto} › Equipe do pátio.
          </p>
        </div>
      ) : (
        <ul className="flex w-full max-w-sm flex-col gap-2">
          {ativos.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => definirMecanicoAtivo({ id: m.id, nome: m.nome })}
                className="superficie flex min-h-[60px] w-full items-center gap-3 rounded-xl px-4 text-left transition-colors hover:bg-grafite-800"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acento-500/15 font-titulo text-lg font-bold text-acento-400">
                  {m.nome.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg text-grafite-50">{m.nome}</span>
                  {m.apelido && <span className="block text-sm texto-fraco">{m.apelido}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
