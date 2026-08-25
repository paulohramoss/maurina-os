import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { pode, type Acao } from '@/domain/permissoes'
import { Carregando } from '@/components/ui/Carregando'

interface Props {
  children: ReactNode
  /** Se informado, o usuário precisa desta permissão para ver a rota. */
  exige?: Acao
}

export function RotaProtegida({ children, exige }: Props) {
  const usuario = useAuthStore((e) => e.usuario)
  const papel = useAuthStore((e) => e.papel)
  const local = useLocation()

  // undefined = ainda resolvendo a sessão. Não redirecionar antes da hora,
  // ou o usuário logado é chutado para o login a cada refresh.
  if (usuario === undefined) return <Carregando mensagem="Carregando seu acesso…" />

  if (usuario === null) return <Navigate to="/login" replace state={{ de: local.pathname }} />

  if (exige && !pode(papel, exige)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="mb-2 font-titulo text-2xl uppercase text-grafite-100">Acesso restrito</h2>
        <p className="texto-fraco">
          Seu perfil não tem permissão para esta tela. Fale com o administrador da oficina.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
