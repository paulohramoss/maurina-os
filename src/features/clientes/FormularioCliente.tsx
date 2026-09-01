import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Botao } from '@/components/ui/Botao'
import { Entrada } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { useAcoesCliente } from '@/hooks/useClientes'
import { apenasDigitos, documentoValido, mascaraDocumento } from '@/utils/documento'
import { mascaraTelefone, telefoneValido } from '@/utils/telefone'
import { cepValido, enderecoPreenchido, mascaraCep } from '@/utils/endereco'
import { capitalizarNome } from '@/utils/texto'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import type { Cliente } from '@/types'

/**
 * Completar o cadastro do cliente.
 *
 * Nome e telefone já vieram da abertura da OS. Aqui entra o resto — CPF/CNPJ,
 * e-mail e endereço — e **nada disso é obrigatório**: o cadastro fica pela
 * metade sem impedir ninguém de trabalhar. O que é preenchido, porém, é
 * validado: CPF errado na OS impressa é pior do que CPF em branco.
 */

const esquema = z.object({
  nome: z.string().min(3, 'Informe o nome do cliente'),
  telefone: z.string().refine(telefoneValido, 'Telefone incompleto'),
  cpfCnpj: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || documentoValido(v), 'CPF ou CNPJ inválido'),
  email: z.string().optional().refine((v) => !v?.trim() || z.string().email().safeParse(v).success, 'E-mail inválido'),
  cep: z.string().optional().refine((v) => cepValido(v ?? ''), 'CEP incompleto'),
  rua: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional().refine((v) => !v?.trim() || v.trim().length === 2, 'Use a sigla, ex.: SP'),
})

type Formulario = z.infer<typeof esquema>

export function FormularioCliente({
  cliente,
  aberto,
  aoFechar,
}: {
  cliente: Cliente
  aberto: boolean
  aoFechar: () => void
}) {
  const { atualizar } = useAcoesCliente()
  const [erro, setErro] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    values: {
      nome: cliente.nome,
      telefone: mascaraTelefone(cliente.telefone),
      cpfCnpj: cliente.cpfCnpj ? mascaraDocumento(cliente.cpfCnpj) : '',
      email: cliente.email ?? '',
      cep: cliente.endereco?.cep ? mascaraCep(cliente.endereco.cep) : '',
      rua: cliente.endereco?.rua ?? '',
      numero: cliente.endereco?.numero ?? '',
      complemento: cliente.endereco?.complemento ?? '',
      bairro: cliente.endereco?.bairro ?? '',
      cidade: cliente.endereco?.cidade ?? '',
      uf: cliente.endereco?.uf ?? '',
    },
  })

  const gravar = async (dados: Formulario) => {
    setErro(null)

    const documento = dados.cpfCnpj?.trim() ? apenasDigitos(dados.cpfCnpj) : ''
    const endereco = {
      cep: apenasDigitos(dados.cep ?? ''),
      rua: dados.rua?.trim() ?? '',
      numero: dados.numero?.trim() ?? '',
      complemento: dados.complemento?.trim() ?? '',
      bairro: dados.bairro?.trim() ?? '',
      cidade: dados.cidade?.trim() ?? '',
      uf: (dados.uf ?? '').trim().toUpperCase(),
    }

    try {
      await atualizar(cliente.id, {
        nome: capitalizarNome(dados.nome),
        telefone: apenasDigitos(dados.telefone),
        whatsapp: apenasDigitos(dados.telefone),
        // CNPJ com 14 dígitos é empresa — o tipo acompanha o documento.
        tipo: documento.length === 14 ? 'PJ' : 'PF',
        ...(documento ? { cpfCnpj: documento } : {}),
        ...(dados.email?.trim() ? { email: dados.email.trim() } : {}),
        // Formulário em branco não vira um endereço vazio no banco.
        ...(enderecoPreenchido(endereco) ? { endereco } : {}),
      })
      aoFechar()
    } catch (e) {
      setErro(mensagemErroFirestore(e))
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo="Dados do cliente"
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          <Botao variante="secundario" onClick={aoFechar} disabled={isSubmitting}>
            Cancelar
          </Botao>
          <Botao
            larguraTotal
            tamanho="lg"
            onClick={() => void handleSubmit(gravar)()}
            carregando={isSubmitting}
          >
            Salvar
          </Botao>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit(gravar)()
        }}
        className="flex flex-col gap-4"
      >
        <Entrada
          id="cliente-nome"
          label="Nome"
          obrigatorio
          autoComplete="name"
          erro={errors.nome?.message}
          {...register('nome')}
        />

        <Entrada
          id="cliente-telefone"
          label="Telefone / WhatsApp"
          obrigatorio
          inputMode="tel"
          placeholder="(00) 00000-0000"
          erro={errors.telefone?.message}
          {...register('telefone')}
          onChange={(e) => setValue('telefone', mascaraTelefone(e.target.value))}
          value={watch('telefone')}
        />

        <Entrada
          id="cliente-documento"
          label="CPF / CNPJ"
          inputMode="numeric"
          className="font-mono"
          placeholder="000.000.000-00"
          dica="Opcional. Sai na OS impressa quando preenchido."
          erro={errors.cpfCnpj?.message}
          {...register('cpfCnpj')}
          onChange={(e) => setValue('cpfCnpj', mascaraDocumento(e.target.value))}
          value={watch('cpfCnpj')}
        />

        <Entrada
          id="cliente-email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="cliente@email.com"
          dica="Opcional."
          erro={errors.email?.message}
          {...register('email')}
        />

        <fieldset className="flex flex-col gap-4 border-t border-grafite-800 pt-4">
          <legend className="font-titulo text-sm uppercase tracking-wide texto-fraco">
            Endereço — opcional
          </legend>

          <div className="grid gap-4 sm:grid-cols-3">
            <Entrada
              id="cliente-cep"
              label="CEP"
              inputMode="numeric"
              className="font-mono"
              placeholder="00000-000"
              erro={errors.cep?.message}
              {...register('cep')}
              onChange={(e) => setValue('cep', mascaraCep(e.target.value))}
              value={watch('cep')}
            />
            <div className="sm:col-span-2">
              <Entrada
                id="cliente-rua"
                label="Rua"
                autoComplete="address-line1"
                placeholder="Rua das Flores"
                {...register('rua')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Entrada
              id="cliente-numero"
              label="Número"
              inputMode="numeric"
              placeholder="120"
              {...register('numero')}
            />
            <div className="sm:col-span-2">
              <Entrada
                id="cliente-complemento"
                label="Complemento"
                placeholder="Fundos, apto 21…"
                {...register('complemento')}
              />
            </div>
          </div>

          <Entrada
            id="cliente-bairro"
            label="Bairro"
            placeholder="Centro"
            {...register('bairro')}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Entrada
                id="cliente-cidade"
                label="Cidade"
                autoComplete="address-level2"
                placeholder="Campinas"
                {...register('cidade')}
              />
            </div>
            <Entrada
              id="cliente-uf"
              label="UF"
              maxLength={2}
              autoCapitalize="characters"
              className="uppercase"
              placeholder="SP"
              erro={errors.uf?.message}
              {...register('uf')}
            />
          </div>
        </fieldset>

        {erro && (
          <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
            {erro}
          </p>
        )}
      </form>
    </Modal>
  )
}
