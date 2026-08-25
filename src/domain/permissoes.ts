import type { Papel, StatusOS } from '@/types'

/**
 * Espelho, em TypeScript, do que as Security Rules garantem no servidor.
 *
 * A UI usa isto para esconder botão e campo; as Rules usam a mesma tabela
 * para bloquear de verdade. Mudou aqui, muda em firestore.rules.
 */

export type Acao =
  // OS
  | 'os:criar'
  | 'os:editar_dados'
  | 'os:editar_valores'
  | 'os:editar_diagnostico'
  | 'os:marcar_execucao'
  | 'os:mudar_status'
  | 'os:cancelar'
  | 'os:excluir'
  | 'os:ver_valores'
  | 'os:ver_observacoes_internas'
  | 'os:imprimir'
  // Cadastros
  | 'cliente:criar'
  | 'cliente:editar'
  | 'cliente:excluir'
  | 'veiculo:criar'
  | 'veiculo:editar'
  | 'veiculo:excluir'
  // Operação
  | 'catalogo:editar'
  | 'financeiro:ver'
  | 'financeiro:lancar'
  | 'config:editar'
  | 'usuario:gerenciar'

const PERMISSOES: Record<Papel, readonly Acao[]> = {
  admin: [
    'os:criar', 'os:editar_dados', 'os:editar_valores', 'os:editar_diagnostico',
    'os:marcar_execucao', 'os:mudar_status', 'os:cancelar', 'os:excluir',
    'os:ver_valores', 'os:ver_observacoes_internas', 'os:imprimir',
    'cliente:criar', 'cliente:editar', 'cliente:excluir',
    'veiculo:criar', 'veiculo:editar', 'veiculo:excluir',
    'catalogo:editar', 'financeiro:ver', 'financeiro:lancar',
    'config:editar', 'usuario:gerenciar',
  ],
  atendente: [
    'os:criar', 'os:editar_dados', 'os:editar_valores', 'os:editar_diagnostico',
    'os:marcar_execucao', 'os:mudar_status', 'os:cancelar',
    'os:ver_valores', 'os:ver_observacoes_internas', 'os:imprimir',
    'cliente:criar', 'cliente:editar',
    'veiculo:criar', 'veiculo:editar',
    'catalogo:editar', 'financeiro:ver', 'financeiro:lancar',
  ],
  // Mecânico não vê preço. Nem na tela, nem no PDF, nem no banco.
  mecanico: [
    'os:editar_diagnostico',
    'os:marcar_execucao',
    'os:mudar_status',
  ],
}

export function pode(papel: Papel | null | undefined, acao: Acao): boolean {
  if (!papel) return false
  return PERMISSOES[papel].includes(acao)
}

/** Atalho usado em todo canto que mostra dinheiro. */
export function vePrecos(papel: Papel | null | undefined): boolean {
  return pode(papel, 'os:ver_valores')
}

/** Status que cada papel pode acionar — o mecânico só toca no fluxo do pátio. */
const STATUS_POR_PAPEL: Record<Papel, readonly StatusOS[] | 'todos'> = {
  admin: 'todos',
  atendente: 'todos',
  mecanico: ['em_execucao', 'aguardando_peca', 'pronta'],
}

export function podeAcionarStatus(papel: Papel | null | undefined, status: StatusOS): boolean {
  if (!papel) return false
  const permitidos = STATUS_POR_PAPEL[papel]
  return permitidos === 'todos' || permitidos.includes(status)
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: 'Administrador',
  atendente: 'Atendente',
  mecanico: 'Mecânico',
}
