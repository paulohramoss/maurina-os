import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { marca } from '@/theme'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { pode, ROTULO_PAPEL } from '@/domain/permissoes'
import { sair } from '@/hooks/useAuth'
import { BadgeConexao } from './BadgeConexao'
import { SeletorMecanico } from '@/components/os/SeletorMecanico'
import {
  IconeCarro,
  IconeClientes,
  IconeLua,
  IconeMais,
  IconeMenu,
  IconeOS,
  IconePainel,
  IconeSair,
  IconeSol,
} from './Icones'

/**
 * Casca do app. No celular: cabeçalho fino + barra inferior de 5 alvos grandes.
 * No desktop: mesma barra vira lateral. Uma estrutura só, sem tela duplicada.
 */

interface ItemNav {
  para: string
  rotulo: string
  Icone: typeof IconePainel
  fim?: boolean
  oculto?: boolean
}

export function AppShell() {
  const usuario = useAuthStore((e) => e.usuario)
  const papel = useAuthStore((e) => e.papel)
  const tema = useUIStore((e) => e.tema)
  const alternarTema = useUIStore((e) => e.alternarTema)
  const mecanicoAtivoId = useUIStore((e) => e.mecanicoAtivoId)
  const mecanicoAtivoNome = useUIStore((e) => e.mecanicoAtivoNome)
  const definirMecanicoAtivo = useUIStore((e) => e.definirMecanicoAtivo)
  const [menuAberto, setMenuAberto] = useState(false)
  const navegar = useNavigate()

  const podeAbrirOS = pode(papel, 'os:criar')

  const itens: ItemNav[] = [
    { para: '/', rotulo: 'Início', Icone: IconePainel, fim: true },
    { para: '/os', rotulo: 'Ordens', Icone: IconeOS },
    { para: '/clientes', rotulo: 'Clientes', Icone: IconeClientes, oculto: !podeAbrirOS },
  ]

  const aoSair = async () => {
    await sair()
    navegar('/login', { replace: true })
  }

  // O aparelho do pátio é compartilhado: ninguém mexe em OS sem dizer quem é,
  // senão o histórico perde a autoria — que é justamente para que ele serve.
  if (papel === 'mecanico' && !mecanicoAtivoId) {
    return <SeletorMecanico />
  }

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Lateral — só no desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-grafite-800 bg-grafite-900 md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-grafite-800 px-4">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {itens
            .filter((i) => !i.oculto)
            .map(({ para, rotulo, Icone, fim }) => (
              <NavLink
                key={para}
                to={para}
                end={fim}
                className={({ isActive }) =>
                  [
                    'flex min-h-toque items-center gap-3 rounded-lg px-3 text-base transition-colors',
                    isActive
                      ? 'bg-acento-500/15 text-acento-400 font-medium'
                      : 'text-grafite-300 hover:bg-grafite-800',
                  ].join(' ')
                }
              >
                <Icone className="h-5 w-5" />
                {rotulo}
              </NavLink>
            ))}

          {podeAbrirOS && (
            <NavLink
              to="/os/nova"
              className="mt-2 flex min-h-toque items-center justify-center gap-2 rounded-lg bg-acento-500 px-3 font-semibold text-grafite-950 hover:bg-acento-400"
            >
              <IconeMais className="h-5 w-5" />
              Nova OS
            </NavLink>
          )}
        </nav>

        <div className="flex flex-col gap-2 border-t border-grafite-800 p-3">
          {podeAbrirOS && (
            <NavLink
              to="/equipe"
              className="flex min-h-toque items-center gap-3 rounded-lg px-3 text-sm text-grafite-300 hover:bg-grafite-800"
            >
              <IconeClientes className="h-5 w-5" />
              Equipe do pátio
            </NavLink>
          )}
          <PainelUsuario
            nome={mecanicoAtivoNome ?? usuario?.nome}
            papel={papel}
            aoSair={aoSair}
            aoTrocarMecanico={mecanicoAtivoId ? () => definirMecanicoAtivo(null) : undefined}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho — mobile */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-grafite-800 bg-grafite-900/95 px-4 backdrop-blur md:h-16">
          <div className="md:hidden">
            <Logo compacto />
          </div>
          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            <BadgeConexao />
            <button
              type="button"
              onClick={alternarTema}
              aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
              className="flex h-toque w-toque items-center justify-center rounded-lg text-grafite-400 hover:bg-grafite-800"
            >
              {tema === 'escuro' ? <IconeSol className="h-5 w-5" /> : <IconeLua className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Menu"
              className="flex h-toque w-toque items-center justify-center rounded-lg text-grafite-400 hover:bg-grafite-800 md:hidden"
            >
              <IconeMenu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {menuAberto && (
          <div className="flex flex-col gap-2 border-b border-grafite-800 bg-grafite-900 p-3 md:hidden">
            {podeAbrirOS && (
              <NavLink
                to="/equipe"
                onClick={() => setMenuAberto(false)}
                className="flex min-h-toque items-center gap-3 rounded-lg px-3 text-sm text-grafite-300 hover:bg-grafite-800"
              >
                <IconeClientes className="h-5 w-5" />
                Equipe do pátio
              </NavLink>
            )}
            <PainelUsuario
              nome={mecanicoAtivoNome ?? usuario?.nome}
              papel={papel}
              aoSair={aoSair}
              aoTrocarMecanico={mecanicoAtivoId ? () => definirMecanicoAtivo(null) : undefined}
            />
          </div>
        )}

        {/* Conteúdo. pb-24 no mobile para a barra inferior não cobrir nada. */}
        <main className="flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-grafite-800 bg-grafite-900 pb-[env(safe-area-inset-bottom)] md:hidden">
        {itens
          .filter((i) => !i.oculto)
          .map(({ para, rotulo, Icone, fim }) => (
            <NavLink
              key={para}
              to={para}
              end={fim}
              className={({ isActive }) =>
                [
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs',
                  isActive ? 'text-acento-400' : 'text-grafite-400',
                ].join(' ')
              }
            >
              <Icone className="h-6 w-6" />
              {rotulo}
            </NavLink>
          ))}

        {podeAbrirOS && (
          <NavLink
            to="/os/nova"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs text-acento-400"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-acento-500 text-grafite-950">
              <IconeMais className="h-5 w-5" />
            </span>
            Nova
          </NavLink>
        )}
      </nav>
    </div>
  )
}

function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {marca.logoUrl ? (
        <img src={marca.logoUrl} alt={marca.nome} className="h-8 w-auto" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento-500 text-grafite-950">
          <IconeCarro className="h-5 w-5" />
        </span>
      )}
      <span className="font-titulo text-lg font-bold uppercase tracking-wider text-grafite-50">
        {compacto ? marca.nomeCurto : marca.nome}
      </span>
    </div>
  )
}

function PainelUsuario({
  nome,
  papel,
  aoSair,
  aoTrocarMecanico,
}: {
  nome: string | undefined
  papel: ReturnType<typeof useAuthStore.getState>['papel']
  aoSair: () => void
  /** Só existe no aparelho do pátio, onde o login é compartilhado. */
  aoTrocarMecanico?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-grafite-100">{nome ?? '—'}</p>
        {aoTrocarMecanico ? (
          <button
            type="button"
            onClick={aoTrocarMecanico}
            className="text-xs text-acento-400 hover:underline"
          >
            trocar mecânico
          </button>
        ) : (
          <p className="truncate text-xs texto-fraco">{papel ? ROTULO_PAPEL[papel] : ''}</p>
        )}
      </div>
      <button
        type="button"
        onClick={aoSair}
        aria-label="Sair"
        className="flex h-toque w-toque shrink-0 items-center justify-center rounded-lg text-grafite-400 hover:bg-grafite-800 hover:text-perigo"
      >
        <IconeSair className="h-5 w-5" />
      </button>
    </div>
  )
}
