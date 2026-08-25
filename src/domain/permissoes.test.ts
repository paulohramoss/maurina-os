import { describe, expect, it } from 'vitest'
import { pode, podeAcionarStatus, vePrecos } from './permissoes'

describe('permissões por papel', () => {
  it('mecânico não vê nem edita valores', () => {
    expect(vePrecos('mecanico')).toBe(false)
    expect(pode('mecanico', 'os:editar_valores')).toBe(false)
    expect(pode('mecanico', 'os:ver_valores')).toBe(false)
    expect(pode('mecanico', 'financeiro:ver')).toBe(false)
  })

  it('mecânico lança diagnóstico e toca no fluxo do pátio', () => {
    expect(pode('mecanico', 'os:editar_diagnostico')).toBe(true)
    expect(pode('mecanico', 'os:marcar_execucao')).toBe(true)
    expect(podeAcionarStatus('mecanico', 'pronta')).toBe(true)
    expect(podeAcionarStatus('mecanico', 'entregue')).toBe(false)
    expect(podeAcionarStatus('mecanico', 'cancelada')).toBe(false)
  })

  it('mecânico não exclui nem cancela OS', () => {
    expect(pode('mecanico', 'os:excluir')).toBe(false)
    expect(pode('mecanico', 'os:cancelar')).toBe(false)
    expect(pode('mecanico', 'os:criar')).toBe(false)
  })

  it('atendente opera o balcão mas não mexe na configuração', () => {
    expect(pode('atendente', 'os:criar')).toBe(true)
    expect(pode('atendente', 'os:editar_valores')).toBe(true)
    expect(pode('atendente', 'financeiro:lancar')).toBe(true)
    expect(pode('atendente', 'config:editar')).toBe(false)
    expect(pode('atendente', 'usuario:gerenciar')).toBe(false)
    expect(pode('atendente', 'os:excluir')).toBe(false)
  })

  it('admin pode tudo', () => {
    expect(pode('admin', 'config:editar')).toBe(true)
    expect(pode('admin', 'usuario:gerenciar')).toBe(true)
    expect(pode('admin', 'os:excluir')).toBe(true)
  })

  it('sem papel, sem permissão', () => {
    expect(pode(null, 'os:criar')).toBe(false)
    expect(vePrecos(undefined)).toBe(false)
  })
})
