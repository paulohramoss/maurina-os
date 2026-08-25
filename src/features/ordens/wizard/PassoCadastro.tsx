import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Botao } from '@/components/ui/Botao'
import { Entrada, Selecao } from '@/components/ui/Campo'
import { mascaraPlaca, placaValida, normalizarPlaca } from '@/utils/placa'
import { mascaraTelefone, telefoneValido } from '@/utils/telefone'
import { capitalizarNome } from '@/utils/texto'
import { apenasDigitos } from '@/utils/documento'
import { useAcoesCliente } from '@/hooks/useClientes'
import { OPCOES_COMBUSTIVEL, useAcoesVeiculo, useVeiculosDoCliente } from '@/hooks/useVeiculos'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import type { Cliente, Combustivel, Veiculo } from '@/types'

/**
 * Cadastro rápido de cliente + veículo.
 *
 * Obrigatório é só nome e telefone do cliente, e placa/marca/modelo do carro.
 * Documento, endereço e e-mail entram depois — o carro está na porta,
 * a fila não pode parar por causa de um CPF que o cliente não lembra.
 */

const anoAtual = new Date().getFullYear()

const esquema = z.object({
  nome: z.string().min(3, 'Informe o nome do cliente'),
  telefone: z.string().refine(telefoneValido, 'Telefone incompleto'),
  placa: z.string().refine(placaValida, 'Placa inválida'),
  marca: z.string().min(2, 'Informe a marca'),
  modelo: z.string().min(1, 'Informe o modelo'),
  anoModelo: z.coerce
    .number()
    .int()
    .min(1900, 'Ano inválido')
    .max(anoAtual + 1, 'Ano inválido'),
  cor: z.string().min(2, 'Informe a cor'),
  combustivel: z.enum(['flex', 'gasolina', 'etanol', 'diesel', 'gnv', 'eletrico', 'hibrido']),
})

type Formulario = z.input<typeof esquema>
type FormularioValidado = z.output<typeof esquema>

interface Props {
  /** Cliente já escolhido na busca — o formulário só pede o veículo. */
  clienteExistente?: Cliente
  placaInicial?: string
  aoConcluir: (dados: { cliente: Cliente; veiculo: Veiculo }) => void
  aoVoltar: () => void
}

export function PassoCadastro({ clienteExistente, placaInicial, aoConcluir, aoVoltar }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const { criar: criarCliente } = useAcoesCliente()
  const { criar: criarVeiculo, buscarPorId: buscarVeiculo } = useAcoesVeiculo()
  const { veiculos } = useVeiculosDoCliente(clienteExistente?.id)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<Formulario, unknown, FormularioValidado>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: clienteExistente?.nome ?? '',
      telefone: clienteExistente ? mascaraTelefone(clienteExistente.telefone) : '',
      placa: placaInicial ? normalizarPlaca(placaInicial) : '',
      combustivel: 'flex',
      anoModelo: anoAtual,
    },
  })

  const aoEnviar = async (dados: FormularioValidado) => {
    setErro(null)
    try {
      const cliente: Cliente =
        clienteExistente ??
        (await (async () => {
          const id = await criarCliente({
            nome: capitalizarNome(dados.nome),
            tipo: 'PF',
            telefone: apenasDigitos(dados.telefone),
            whatsapp: apenasDigitos(dados.telefone),
          })
          // Objeto local para o wizard seguir sem esperar o round-trip do Firestore
          // — importante quando a internet da oficina está ruim.
          return {
            id,
            nome: capitalizarNome(dados.nome),
            tipo: 'PF',
            telefone: apenasDigitos(dados.telefone),
            whatsapp: apenasDigitos(dados.telefone),
            nomeBusca: '',
          } as Cliente
        })())

      const veiculoId = await criarVeiculo({
        clienteId: cliente.id,
        placa: normalizarPlaca(dados.placa),
        marca: dados.marca.trim(),
        modelo: dados.modelo.trim(),
        anoFabricacao: dados.anoModelo,
        anoModelo: dados.anoModelo,
        cor: dados.cor.trim(),
        combustivel: dados.combustivel as Combustivel,
        kmAtual: 0,
      })

      const veiculo = (await buscarVeiculo(veiculoId)) ?? ({
        id: veiculoId,
        clienteId: cliente.id,
        placa: normalizarPlaca(dados.placa),
        marca: dados.marca.trim(),
        modelo: dados.modelo.trim(),
        anoFabricacao: dados.anoModelo,
        anoModelo: dados.anoModelo,
        cor: dados.cor.trim(),
        combustivel: dados.combustivel as Combustivel,
        kmAtual: 0,
      } as Veiculo)

      aoConcluir({ cliente, veiculo })
    } catch (e) {
      console.error('[Wizard] Falha no cadastro:', e)
      setErro(mensagemErroFirestore(e))
    }
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      {/* Cliente já conhecido: mostra os carros dele em vez de pedir cadastro novo. */}
      {clienteExistente && veiculos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-grafite-300">
            Veículos de {clienteExistente.nome.split(' ')[0]}
          </h3>
          {veiculos.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => aoConcluir({ cliente: clienteExistente, veiculo: v })}
              className="superficie flex min-h-toque items-center justify-between gap-3 rounded-xl p-3 text-left hover:bg-grafite-800"
            >
              <span>
                <span className="block font-mono font-bold text-grafite-50">{v.placa}</span>
                <span className="block text-sm texto-fraco">
                  {v.marca} {v.modelo}
                </span>
              </span>
              <span className="text-sm text-acento-400">Usar este →</span>
            </button>
          ))}
          <p className="pt-2 text-sm texto-fraco">Ou cadastre outro veículo abaixo.</p>
        </section>
      )}

      {!clienteExistente && (
        <section className="flex flex-col gap-4">
          <h3 className="font-titulo text-lg uppercase text-grafite-100">Cliente</h3>
          <Entrada
            id="nome"
            label="Nome"
            obrigatorio
            autoFocus
            autoComplete="name"
            placeholder="Nome do cliente"
            erro={errors.nome?.message}
            {...register('nome')}
          />
          <Entrada
            id="telefone"
            label="Telefone / WhatsApp"
            obrigatorio
            inputMode="tel"
            placeholder="(00) 00000-0000"
            erro={errors.telefone?.message}
            {...register('telefone')}
            onChange={(e) => setValue('telefone', mascaraTelefone(e.target.value))}
            value={watch('telefone')}
          />
          <p className="-mt-2 text-sm texto-fraco">
            CPF, e-mail e endereço podem ser preenchidos depois, na ficha do cliente.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h3 className="font-titulo text-lg uppercase text-grafite-100">Veículo</h3>

        <Entrada
          id="placa"
          label="Placa"
          obrigatorio
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={7}
          className="font-mono text-xl font-bold tracking-widest"
          placeholder="ABC1D23"
          erro={errors.placa?.message}
          {...register('placa')}
          onChange={(e) => setValue('placa', mascaraPlaca(e.target.value))}
          value={watch('placa')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Entrada
            id="marca"
            label="Marca"
            obrigatorio
            placeholder="Fiat, VW, Chevrolet…"
            erro={errors.marca?.message}
            {...register('marca')}
          />
          <Entrada
            id="modelo"
            label="Modelo"
            obrigatorio
            placeholder="Uno, Gol, Onix…"
            erro={errors.modelo?.message}
            {...register('modelo')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Entrada
            id="anoModelo"
            label="Ano"
            obrigatorio
            inputMode="numeric"
            type="number"
            erro={errors.anoModelo?.message}
            {...register('anoModelo')}
          />
          <Entrada
            id="cor"
            label="Cor"
            obrigatorio
            placeholder="Prata"
            erro={errors.cor?.message}
            {...register('cor')}
          />
          <Selecao
            id="combustivel"
            label="Combustível"
            opcoes={OPCOES_COMBUSTIVEL.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
            erro={errors.combustivel?.message}
            {...register('combustivel')}
          />
        </div>
      </section>

      {erro && (
        <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <Botao type="button" variante="secundario" onClick={aoVoltar}>
          Voltar
        </Botao>
        <Botao type="submit" tamanho="lg" larguraTotal carregando={isSubmitting}>
          Continuar
        </Botao>
      </div>
    </form>
  )
}
