import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Botao } from '@/components/ui/Botao'
import { AreaTexto, Entrada, Selecao } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { useConfigOficina, TERMOS_PADRAO } from '@/hooks/useConfigOficina'
import { useAcoesUsuario, useUsuarios, mensagemErroCriacao } from '@/hooks/useUsuarios'
import { ROTULO_PAPEL } from '@/domain/permissoes'
import { mascaraDocumento } from '@/utils/documento'
import { mascaraTelefone } from '@/utils/telefone'
import { mensagemErroFirestore } from '@/lib/firestoreHelpers'
import { useAuthStore } from '@/store/authStore'
import type { Papel } from '@/types'

type Painel = 'oficina' | 'termos' | 'acessos'

export function TelaConfig() {
  const [painel, setPainel] = useState<Painel>('oficina')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="font-titulo text-2xl uppercase tracking-wide text-grafite-50">Configurações</h1>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-grafite-800 px-4 md:mx-0 md:px-0">
        {(
          [
            { chave: 'oficina', rotulo: 'Oficina' },
            { chave: 'termos', rotulo: 'Termos da OS' },
            { chave: 'acessos', rotulo: 'Acessos' },
          ] as const
        ).map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setPainel(a.chave)}
            className={[
              'min-h-toque whitespace-nowrap border-b-2 px-4 text-sm transition-colors',
              painel === a.chave
                ? 'border-acento-500 font-medium text-acento-400'
                : 'border-transparent text-grafite-400 hover:text-grafite-200',
            ].join(' ')}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      {painel === 'oficina' && <PainelOficina />}
      {painel === 'termos' && <PainelTermos />}
      {painel === 'acessos' && <PainelAcessos />}
    </div>
  )
}

const esquemaOficina = z.object({
  nome: z.string().min(2, 'Informe o nome da oficina'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  logoUrl: z.string().url('URL inválida').or(z.literal('')).optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2, 'Use a sigla, ex.: SP').optional(),
  revisaoPadraoKm: z.coerce.number().int().min(1000).max(100000),
  revisaoPadraoMeses: z.coerce.number().int().min(1).max(60),
  garantiaPadraoMeses: z.coerce.number().int().min(1).max(60),
})

type FormOficina = z.input<typeof esquemaOficina>
type FormOficinaValidado = z.output<typeof esquemaOficina>

function PainelOficina() {
  const { config, salvar } = useConfigOficina()
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormOficina, unknown, FormOficinaValidado>({
    resolver: zodResolver(esquemaOficina),
    values: {
      nome: config.nome,
      cnpj: config.cnpj ? mascaraDocumento(config.cnpj) : '',
      telefone: config.telefone ? mascaraTelefone(config.telefone) : '',
      logoUrl: config.logoUrl ?? '',
      cep: config.endereco?.cep ?? '',
      rua: config.endereco?.rua ?? '',
      numero: config.endereco?.numero ?? '',
      bairro: config.endereco?.bairro ?? '',
      cidade: config.endereco?.cidade ?? '',
      uf: config.endereco?.uf ?? '',
      revisaoPadraoKm: config.revisaoPadraoKm,
      revisaoPadraoMeses: config.revisaoPadraoMeses,
      garantiaPadraoMeses: config.garantiaPadraoMeses,
    },
  })

  const enviar = async (dados: FormOficinaValidado) => {
    setErro(null)
    try {
      await salvar({
        nome: dados.nome.trim(),
        cnpj: dados.cnpj?.replace(/\D/g, '') || undefined,
        telefone: dados.telefone?.replace(/\D/g, '') || undefined,
        logoUrl: dados.logoUrl || undefined,
        ...(dados.rua
          ? {
              endereco: {
                cep: dados.cep ?? '',
                rua: dados.rua,
                numero: dados.numero ?? '',
                bairro: dados.bairro ?? '',
                cidade: dados.cidade ?? '',
                uf: (dados.uf ?? '').toUpperCase(),
              },
            }
          : {}),
        revisaoPadraoKm: dados.revisaoPadraoKm,
        revisaoPadraoMeses: dados.revisaoPadraoMeses,
        garantiaPadraoMeses: dados.garantiaPadraoMeses,
      })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch (e) {
      setErro(mensagemErroFirestore(e))
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} className="flex flex-col gap-5">
      <Secao titulo="Dados da oficina" descricao="Aparecem no cabeçalho da OS impressa.">
        <Entrada id="nome-oficina" label="Nome" obrigatorio erro={errors.nome?.message} {...register('nome')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Entrada
            id="cnpj"
            label="CNPJ"
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            erro={errors.cnpj?.message}
            {...register('cnpj')}
            onChange={(e) => setValue('cnpj', mascaraDocumento(e.target.value))}
            value={watch('cnpj')}
          />
          <Entrada
            id="tel-oficina"
            label="Telefone"
            inputMode="tel"
            placeholder="(00) 0000-0000"
            {...register('telefone')}
            onChange={(e) => setValue('telefone', mascaraTelefone(e.target.value))}
            value={watch('telefone')}
          />
        </div>

        <Entrada
          id="logo"
          label="URL da logo"
          placeholder="https://…"
          erro={errors.logoUrl?.message}
          dica="Deixe em branco para usar o nome em texto."
          {...register('logoUrl')}
        />
      </Secao>

      <Secao titulo="Endereço">
        <div className="grid gap-4 sm:grid-cols-3">
          <Entrada id="cep" label="CEP" inputMode="numeric" {...register('cep')} />
          <div className="sm:col-span-2">
            <Entrada id="rua" label="Rua" {...register('rua')} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Entrada id="numero" label="Número" {...register('numero')} />
          <Entrada id="bairro" label="Bairro" {...register('bairro')} />
          <Entrada id="cidade" label="Cidade" {...register('cidade')} />
          <Entrada id="uf" label="UF" maxLength={2} erro={errors.uf?.message} {...register('uf')} />
        </div>
      </Secao>

      <Secao
        titulo="Padrões"
        descricao="Usados ao entregar o carro para agendar a próxima revisão."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Entrada
            id="revisao-km"
            label="Revisão a cada (km)"
            inputMode="numeric"
            type="number"
            erro={errors.revisaoPadraoKm?.message}
            {...register('revisaoPadraoKm')}
          />
          <Entrada
            id="revisao-meses"
            label="ou a cada (meses)"
            inputMode="numeric"
            type="number"
            erro={errors.revisaoPadraoMeses?.message}
            {...register('revisaoPadraoMeses')}
          />
          <Entrada
            id="garantia"
            label="Garantia (meses)"
            inputMode="numeric"
            type="number"
            erro={errors.garantiaPadraoMeses?.message}
            {...register('garantiaPadraoMeses')}
          />
        </div>
      </Secao>

      {erro && (
        <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Botao type="submit" tamanho="lg" carregando={isSubmitting}>
          Salvar
        </Botao>
        {salvo && <span className="text-sm text-sucesso">Salvo ✓</span>}
      </div>
    </form>
  )
}

function PainelTermos() {
  const { config, salvar } = useConfigOficina()
  const [texto, setTexto] = useState(config.termos ?? '')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const gravar = async () => {
    setSalvando(true)
    try {
      await salvar({ termos: texto.trim() })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm texto-fraco">
        Este texto sai no rodapé das duas vias da OS impressa. Se ficar em branco, o sistema usa
        um texto padrão de garantia.
      </p>

      <AreaTexto
        id="termos"
        label="Condições e garantia"
        rows={14}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={TERMOS_PADRAO}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Botao onClick={() => void gravar()} carregando={salvando}>
          Salvar termos
        </Botao>
        <Botao variante="secundario" onClick={() => setTexto(TERMOS_PADRAO)}>
          Usar o texto padrão
        </Botao>
        {salvo && <span className="text-sm text-sucesso">Salvo ✓</span>}
      </div>
    </div>
  )
}

function PainelAcessos() {
  const { usuarios, carregando } = useUsuarios()
  const { criar, definirAtivo, mudarPapel } = useAcoesUsuario()
  const eu = useAuthStore((e) => e.usuario)

  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState<Papel>('atendente')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const adicionar = async () => {
    if (nome.trim().length < 3) {
      setErro('Informe o nome.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await criar({ nome, email, senha, papel })
      setAberto(false)
      setNome('')
      setEmail('')
      setSenha('')
    } catch (e) {
      setErro(mensagemErroCriacao(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm texto-fraco">
        Quem entra no sistema e com qual permissão. O acesso de mecânico é compartilhado: um
        login por oficina, usado no aparelho do pátio.
      </p>

      <Botao larguraTotal onClick={() => setAberto(true)}>
        + Novo acesso
      </Botao>

      {carregando ? (
        <p className="text-sm texto-fraco">Carregando…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {usuarios.map((u) => (
            <li
              key={u.id}
              className={[
                'superficie flex flex-wrap items-center justify-between gap-3 rounded-xl p-3',
                u.ativo ? '' : 'opacity-60',
              ].join(' ')}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-grafite-50">
                  {u.nome}
                  {u.id === eu?.id && <span className="ml-2 text-xs texto-fraco">(você)</span>}
                </p>
                <p className="truncate text-sm texto-fraco">{u.email}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={u.papel}
                  disabled={u.id === eu?.id}
                  onChange={(e) => void mudarPapel(u.id, e.target.value as Papel)}
                  className="min-h-toque rounded-lg border border-grafite-700 bg-grafite-900 px-2 text-sm text-grafite-100 disabled:opacity-50"
                >
                  {(['admin', 'atendente', 'mecanico'] as Papel[]).map((p) => (
                    <option key={p} value={p}>
                      {ROTULO_PAPEL[p]}
                    </option>
                  ))}
                </select>

                <Botao
                  variante="secundario"
                  disabled={u.id === eu?.id}
                  onClick={() => void definirAtivo(u.id, !u.ativo)}
                >
                  {u.ativo ? 'Desativar' : 'Reativar'}
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={aberto}
        titulo="Novo acesso"
        aoFechar={() => setAberto(false)}
        rodape={
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao larguraTotal tamanho="lg" onClick={() => void adicionar()} carregando={salvando}>
              Criar acesso
            </Botao>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Entrada
            id="novo-nome"
            label="Nome"
            obrigatorio
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Entrada
            id="novo-email"
            label="E-mail"
            obrigatorio
            type="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Entrada
            id="nova-senha"
            label="Senha provisória"
            obrigatorio
            type="text"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            dica="Mínimo 6 caracteres. Anote e entregue à pessoa."
          />
          <Selecao
            id="novo-papel"
            label="Permissão"
            opcoes={[
              { valor: 'atendente', rotulo: 'Atendente — balcão, OS, valores e caixa' },
              { valor: 'mecanico', rotulo: 'Mecânico — pátio, sem ver valores' },
              { valor: 'admin', rotulo: 'Administrador — acesso total' },
            ]}
            value={papel}
            onChange={(e) => setPapel(e.target.value as Papel)}
          />

          {erro && (
            <p className="rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo" role="alert">
              {erro}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao?: string
  children: React.ReactNode
}) {
  return (
    <section className="superficie flex flex-col gap-4 rounded-xl p-4">
      <div>
        <h2 className="font-titulo text-lg uppercase tracking-wide text-grafite-200">{titulo}</h2>
        {descricao && <p className="text-sm texto-fraco">{descricao}</p>}
      </div>
      {children}
    </section>
  )
}
