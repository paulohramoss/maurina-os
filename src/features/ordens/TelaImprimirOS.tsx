import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrdem } from '@/hooks/useOrdemServico'
import { useConfigOficina, TERMOS_PADRAO } from '@/hooks/useConfigOficina'
import { Carregando, Vazio } from '@/components/ui/Carregando'
import { Botao } from '@/components/ui/Botao'
import { formatarMoeda } from '@/utils/dinheiro'
import { formatarPlaca } from '@/utils/placa'
import { formatarTelefone } from '@/utils/telefone'
import { formatarDocumento } from '@/utils/documento'
import { formatarData, formatarDataHora } from '@/utils/data'
import { calcularTotais } from '@/domain/calculoOS'
import { rotuloStatus } from '@/domain/statusOS'
import { marca } from '@/theme'
import type { ChecklistItens, ConfigOficina, OrdemServico } from '@/types'

/**
 * A OS em papel.
 *
 * Duas vias na mesma folha A4: a do cliente e a da oficina. Impressão em preto
 * no branco — tinta de oficina é cara e o papel vai para uma pasta, não para a parede.
 *
 * Usa o diálogo de impressão do próprio navegador, que também salva em PDF.
 * É mais fiel ao A4 do que rasterizar a tela com html2canvas, e não custa
 * nenhuma biblioteca a mais no download da oficina.
 */
export function TelaImprimirOS() {
  const { id } = useParams<{ id: string }>()
  const { os, carregando } = useOrdem(id)
  const { config } = useConfigOficina()

  // Título da janela vira o nome sugerido do arquivo ao salvar em PDF.
  useEffect(() => {
    if (!os) return
    const anterior = document.title
    document.title = `OS ${os.numero} - ${os.snapshotVeiculo.placa}`
    return () => {
      document.title = anterior
    }
  }, [os])

  if (carregando) return <Carregando mensagem="Montando a via impressa…" />
  if (!os) return <Vazio titulo="OS não encontrada" />

  return (
    <div className="bg-white">
      <div className="nao-imprimir sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-grafite-800 bg-grafite-900 px-4 py-3">
        <Link to={`/os/${os.id}`} className="text-sm text-grafite-300 hover:text-grafite-100">
          ← Voltar para a OS
        </Link>
        <div className="flex gap-2">
          <Botao onClick={() => window.print()}>Imprimir / Salvar PDF</Botao>
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] bg-white px-4 py-6 text-black print:p-0">
        <Via os={os} config={config} via="CLIENTE" />
        <div className="my-6 border-t-2 border-dashed border-gray-400 print:my-4">
          <p className="pt-1 text-center text-[8pt] text-gray-500">recorte aqui</p>
        </div>
        <Via os={os} config={config} via="OFICINA" />
      </div>
    </div>
  )
}

const ROTULO_ITEM: Record<keyof ChecklistItens, string> = {
  estepe: 'Estepe',
  macaco: 'Macaco',
  chaveRoda: 'Chave de roda',
  triangulo: 'Triângulo',
  documentos: 'Documentos',
  tapetes: 'Tapetes',
  radio: 'Rádio',
  calotas: 'Calotas',
}

const NIVEIS = ['Vazio', '1/4', '1/2', '3/4', 'Cheio']

function Via({ os, config, via }: { os: OrdemServico; config: ConfigOficina; via: 'CLIENTE' | 'OFICINA' }) {
  const totais = calcularTotais(os.pecas, os.servicos, os.desconto, os.acrescimo ?? 0)
  const ehViaOficina = via === 'OFICINA'

  return (
    <article className="break-inside-avoid text-[9pt] leading-snug text-black">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
        <div className="flex items-start gap-3">
          {config.logoUrl && <img src={config.logoUrl} alt="" className="h-12 w-auto" />}
          <div>
            <h1 className="text-[15pt] font-bold uppercase leading-none tracking-wide">
              {config.nome || marca.nome}
            </h1>
            <p className="mt-0.5 text-[8pt] text-gray-700">
              {config.cnpj && `CNPJ ${formatarDocumento(config.cnpj)}`}
              {config.telefone && ` · ${formatarTelefone(config.telefone)}`}
            </p>
            {config.endereco && (
              <p className="text-[8pt] text-gray-700">
                {config.endereco.rua}, {config.endereco.numero} — {config.endereco.bairro},{' '}
                {config.endereco.cidade}/{config.endereco.uf}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[8pt] uppercase text-gray-600">Ordem de serviço</p>
          <p className="font-mono text-[17pt] font-bold leading-none">{os.numero}</p>
          <p className="mt-1 inline-block border border-black px-1.5 text-[7.5pt] font-bold uppercase">
            Via {via}
          </p>
        </div>
      </header>

      {/* Cliente e veículo */}
      <section className="mt-2 grid grid-cols-2 gap-3">
        <Bloco titulo="Cliente">
          <Campo rotulo="Nome" valor={os.snapshotCliente.nome} />
          <Campo rotulo="Telefone" valor={formatarTelefone(os.snapshotCliente.telefone)} />
          {os.snapshotCliente.cpfCnpj && (
            <Campo rotulo="CPF/CNPJ" valor={formatarDocumento(os.snapshotCliente.cpfCnpj)} />
          )}
        </Bloco>

        <Bloco titulo="Veículo">
          <Campo rotulo="Placa" valor={formatarPlaca(os.snapshotVeiculo.placa)} destaque />
          <Campo
            rotulo="Modelo"
            valor={`${os.snapshotVeiculo.marca} ${os.snapshotVeiculo.modelo} ${os.snapshotVeiculo.anoModelo}`}
          />
          <Campo rotulo="Cor" valor={os.snapshotVeiculo.cor} />
        </Bloco>
      </section>

      {/* Entrada */}
      <section className="mt-2 grid grid-cols-4 gap-3 border-y border-gray-300 py-1.5">
        <Campo rotulo="Entrada" valor={formatarDataHora(os.dataEntrada)} />
        <Campo rotulo="KM entrada" valor={os.kmEntrada.toLocaleString('pt-BR')} />
        <Campo rotulo="Combustível" valor={NIVEIS[os.nivelCombustivel] ?? '—'} />
        <Campo rotulo="Situação" valor={rotuloStatus(os.status)} />
      </section>

      {/* Relato e diagnóstico */}
      <section className="mt-2">
        <Bloco titulo="Relato do cliente">
          <p className="whitespace-pre-wrap">{os.reclamacaoCliente}</p>
        </Bloco>

        {os.diagnostico && (
          <div className="mt-1.5">
            <Bloco titulo="Diagnóstico">
              <p className="whitespace-pre-wrap">{os.diagnostico}</p>
            </Bloco>
          </div>
        )}
      </section>

      {/* Itens */}
      {os.pecas.length > 0 && (
        <Tabela
          titulo="Peças"
          colunas={['Descrição', 'Qtd.', 'Unitário', 'Total']}
          linhas={os.pecas.map((p) => [
            p.codigo ? `${p.descricao} (cód. ${p.codigo})` : p.descricao,
            String(p.quantidade),
            formatarMoeda(p.valorUnitario),
            formatarMoeda(p.valorTotal),
          ])}
        />
      )}

      {os.servicos.length > 0 && (
        <Tabela
          titulo="Serviços"
          colunas={['Descrição', 'Qtd.', 'Unitário', 'Total']}
          linhas={os.servicos.map((s) => [
            s.descricao,
            String(s.quantidade),
            formatarMoeda(s.valorUnitario),
            formatarMoeda(s.valorTotal),
          ])}
        />
      )}

      {/* Totais */}
      <section className="mt-2 flex justify-end">
        <table className="w-64 text-[9pt]">
          <tbody>
            <LinhaTotal rotulo="Peças" valor={formatarMoeda(totais.subtotalPecas)} />
            <LinhaTotal rotulo="Serviços" valor={formatarMoeda(totais.subtotalServicos)} />
            {totais.descontoValor > 0 && (
              <LinhaTotal rotulo="Desconto" valor={`- ${formatarMoeda(totais.descontoValor)}`} />
            )}
            {totais.acrescimo > 0 && (
              <LinhaTotal rotulo="Acréscimo" valor={formatarMoeda(totais.acrescimo)} />
            )}
            <tr className="border-t-2 border-black">
              <td className="py-1 text-[11pt] font-bold uppercase">Total</td>
              <td className="py-1 text-right font-mono text-[13pt] font-bold">
                {formatarMoeda(totais.valorTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Checklist de entrada */}
      <section className="mt-2">
        <Bloco titulo="Checklist de entrada">
          <p className="text-[8pt]">
            {(Object.keys(ROTULO_ITEM) as (keyof ChecklistItens)[])
              .map((c) => `${os.checklistEntrada.itens[c] ? '[X]' : '[ ]'} ${ROTULO_ITEM[c]}`)
              .join('   ')}
          </p>
          {os.checklistEntrada.avarias.length > 0 && (
            <p className="mt-1 text-[8pt]">
              <strong>Avarias registradas na entrada:</strong>{' '}
              {os.checklistEntrada.avarias.join('; ')}.
            </p>
          )}
        </Bloco>
      </section>

      {/* Pagamento e garantia */}
      <section className="mt-2 grid grid-cols-2 gap-3">
        <Bloco titulo="Pagamento">
          <Campo rotulo="Situação" valor={rotuloPagamento(os)} />
          {os.pagamento?.forma && <Campo rotulo="Forma" valor={rotuloForma(os.pagamento.forma)} />}
          {os.pagamento?.numeroNota && <Campo rotulo="Nota" valor={os.pagamento.numeroNota} />}
        </Bloco>

        <Bloco titulo="Garantia">
          <Campo
            rotulo="Serviços"
            valor={`${os.garantiaServicoMeses ?? config.garantiaPadraoMeses} meses`}
          />
          {os.garantiaServicoKm && (
            <Campo rotulo="ou" valor={`${os.garantiaServicoKm.toLocaleString('pt-BR')} km`} />
          )}
          {os.dataSaida && <Campo rotulo="Entrega" valor={formatarData(os.dataSaida)} />}
        </Bloco>
      </section>

      {/* Termos */}
      <section className="mt-2 border-t border-gray-300 pt-1.5">
        <h3 className="text-[8pt] font-bold uppercase">Condições e garantia</h3>
        <p className="whitespace-pre-wrap text-[7pt] leading-tight text-gray-800">
          {config.termos?.trim() || TERMOS_PADRAO}
        </p>
      </section>

      {/* Observações internas: SÓ na via da oficina */}
      {ehViaOficina && os.observacoesInternas && (
        <section className="mt-2 border border-black p-1.5">
          <h3 className="text-[8pt] font-bold uppercase">Observações internas (não entregar ao cliente)</h3>
          <p className="whitespace-pre-wrap text-[8pt]">{os.observacoesInternas}</p>
        </section>
      )}

      {/* Assinaturas */}
      <section className="mt-4 grid grid-cols-2 gap-8">
        <div>
          {os.aprovacao?.assinaturaBase64 ? (
            <img
              src={os.aprovacao.assinaturaBase64}
              alt="Assinatura do cliente"
              className="mx-auto h-12 object-contain"
            />
          ) : (
            <div className="h-12" />
          )}
          <div className="border-t border-black pt-0.5 text-center text-[8pt]">
            {os.snapshotCliente.nome}
            {os.aprovacao && (
              <span className="block text-[7pt] text-gray-600">
                Aprovado em {formatarDataHora(os.aprovacao.aprovadoEm)} ({os.aprovacao.canal})
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="h-12" />
          <div className="border-t border-black pt-0.5 text-center text-[8pt]">
            {config.nome || marca.nome}
          </div>
        </div>
      </section>
    </article>
  )
}

function rotuloPagamento(os: OrdemServico): string {
  if (!os.pagamento) return 'Pendente'
  const mapa = { pendente: 'Pendente', parcial: 'Parcial', pago: 'Pago' } as const
  return mapa[os.pagamento.status]
}

function rotuloForma(forma: string): string {
  const mapa: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    debito: 'Cartão de débito',
    credito: 'Cartão de crédito',
    boleto: 'Boleto',
    prazo: 'A prazo',
  }
  return mapa[forma] ?? forma
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="border-b border-gray-400 text-[8pt] font-bold uppercase tracking-wide">
        {titulo}
      </h3>
      <div className="pt-0.5">{children}</div>
    </div>
  )
}

function Campo({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <p className={destaque ? 'font-mono text-[11pt] font-bold' : ''}>
      <span className="text-gray-600">{rotulo}: </span>
      {valor}
    </p>
  )
}

function Tabela({
  titulo,
  colunas,
  linhas,
}: {
  titulo: string
  colunas: string[]
  linhas: string[][]
}) {
  return (
    <section className="mt-2">
      <h3 className="border-b border-gray-400 text-[8pt] font-bold uppercase tracking-wide">
        {titulo}
      </h3>
      <table className="w-full text-[8.5pt]">
        <thead>
          <tr className="border-b border-gray-300 text-left text-[7.5pt] uppercase text-gray-600">
            {colunas.map((c, i) => (
              <th key={c} className={`py-0.5 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b border-gray-200">
              {linha.map((celula, j) => (
                <td key={j} className={`py-0.5 ${j > 0 ? 'text-right font-mono' : ''}`}>
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function LinhaTotal({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <tr>
      <td className="py-0.5 text-gray-700">{rotulo}</td>
      <td className="py-0.5 text-right font-mono">{valor}</td>
    </tr>
  )
}
