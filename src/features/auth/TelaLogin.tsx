import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { marca } from '@/theme'
import { Botao } from '@/components/ui/Botao'
import { Entrada } from '@/components/ui/Campo'
import { IconeCarro } from '@/components/layout/Icones'
import { entrar, mensagemErroLogin } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { configuracaoCompleta } from '@/lib/firebase'

const esquema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  senha: z.string().min(6, 'A senha tem no mínimo 6 caracteres'),
})

type Formulario = z.infer<typeof esquema>

export function TelaLogin() {
  const usuario = useAuthStore((e) => e.usuario)
  const erroSessao = useAuthStore((e) => e.erroSessao)
  const [erro, setErro] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  if (usuario) return <Navigate to="/" replace />

  const aoEnviar = async ({ email, senha }: Formulario) => {
    setErro(null)
    try {
      await entrar(email, senha)
    } catch (e) {
      setErro(mensagemErroLogin(e))
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {marca.logoUrl ? (
            <img src={marca.logoUrl} alt={marca.nome} className="h-16 w-auto" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-acento-500 text-grafite-950">
              <IconeCarro className="h-9 w-9" />
            </span>
          )}
          <div>
            <h1 className="font-titulo text-3xl font-bold uppercase tracking-wider text-grafite-50">
              {marca.nome}
            </h1>
            <p className="text-sm texto-fraco">Ordem de serviço</p>
          </div>
        </div>

        {!configuracaoCompleta && (
          <div className="mb-4 rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm text-alerta">
            Firebase não configurado. Copie <code>.env.example</code> para{' '}
            <code>.env.local</code> e preencha as credenciais do projeto.
          </div>
        )}

        <form onSubmit={handleSubmit(aoEnviar)} className="superficie flex flex-col gap-4 rounded-xl p-5">
          <Entrada
            id="email"
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="voce@oficina.com.br"
            erro={errors.email?.message}
            {...register('email')}
          />

          <Entrada
            id="senha"
            label="Senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••"
            erro={errors.senha?.message}
            {...register('senha')}
          />

          {(erro ?? erroSessao) && (
            <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
              {erro ?? erroSessao}
            </p>
          )}

          <Botao type="submit" tamanho="lg" larguraTotal carregando={isSubmitting}>
            Entrar
          </Botao>
        </form>

        <p className="mt-6 text-center text-xs texto-fraco">
          Esqueceu a senha? Fale com o administrador da oficina.
        </p>
      </div>
    </div>
  )
}
