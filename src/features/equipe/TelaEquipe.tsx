import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAcoesMecanico, useMecanicos } from '@/hooks/useMecanicos'
import { Botao } from '@/components/ui/Botao'
import { Entrada } from '@/components/ui/Campo'
import { EsqueletoLinha, Vazio } from '@/components/ui/Carregando'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'

/**
 * Equipe do pátio, cadastrada pelo balcão.
 *
 * Não são contas de login — são os nomes que aparecem no celular da oficina
 * para o mecânico se identificar antes de mexer nas OS.
 */

const esquema = z.object({
  nome: z.string().min(3, 'Informe o nome'),
  apelido: z.string().optional(),
})

type Formulario = z.infer<typeof esquema>

export function TelaEquipe() {
  const { mecanicos, carregando } = useMecanicos()
  const { criar, definirAtivo } = useAcoesMecanico()
  const [erro, setErro] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  const adicionar = async (dados: Formulario) => {
    setErro(null)
    try {
      await criar(dados.nome, dados.apelido)
      reset()
    } catch (e) {
      setErro(mensagemErroFirestore(e))
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">
          Equipe do pátio
        </h1>
        <p className="text-sm texto-fraco">
          Quem aparece na lista do celular da oficina na hora de assinar um serviço.
        </p>
      </div>

      <form onSubmit={handleSubmit(adicionar)} className="superficie flex flex-col gap-4 rounded-xl p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Entrada
            id="nome"
            label="Nome"
            obrigatorio
            placeholder="José da Silva"
            erro={errors.nome?.message}
            {...register('nome')}
          />
          <Entrada
            id="apelido"
            label="Como é chamado"
            placeholder="Zé"
            erro={errors.apelido?.message}
            {...register('apelido')}
          />
        </div>

        {erro && <p className="text-sm text-perigo">{erro}</p>}

        <Botao type="submit" carregando={isSubmitting} className="self-start">
          Adicionar
        </Botao>
      </form>

      {carregando ? (
        <EsqueletoLinha quantidade={2} />
      ) : mecanicos.length === 0 ? (
        <Vazio
          titulo="Nenhum mecânico cadastrado"
          descricao="Cadastre a equipe acima para que o pessoal do pátio consiga se identificar no aparelho."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {mecanicos.map((m) => (
            <li
              key={m.id}
              className="superficie flex min-h-toque items-center justify-between gap-3 rounded-xl p-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-grafite-50">
                  {m.nome}
                  {m.apelido && <span className="ml-2 font-normal texto-fraco">({m.apelido})</span>}
                </span>
                <span className={`block text-sm ${m.ativo ? 'text-sucesso' : 'texto-fraco'}`}>
                  {m.ativo ? 'Na equipe' : 'Fora da equipe'}
                </span>
              </span>
              <Botao
                variante="secundario"
                onClick={() => void definirAtivo(m.id, !m.ativo)}
                className="shrink-0"
              >
                {m.ativo ? 'Desativar' : 'Reativar'}
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
