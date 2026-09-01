import { apenasDigitos } from '@/utils/documento'
import type { Endereco } from '@/types'

/**
 * Endereço do cliente. Tudo opcional: o carro está na porta e ninguém segura
 * a fila porque o cliente não lembra o CEP. O que vier, vem.
 */

/** Máscara progressiva: 01310100 → "01310-100". */
export function mascaraCep(entrada: string): string {
  const d = apenasDigitos(entrada).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Vazio passa: o campo é opcional. Preencheu, tem que ter 8 dígitos. */
export function cepValido(entrada: string): boolean {
  const d = apenasDigitos(entrada)
  return d.length === 0 || d.length === 8
}

export const ENDERECO_VAZIO: Endereco = {
  cep: '',
  rua: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
}

/** Nada preenchido não vira documento no banco. */
export function enderecoPreenchido(endereco: Partial<Endereco> | undefined): boolean {
  if (!endereco) return false
  return Object.values(endereco).some((valor) => (valor ?? '').trim() !== '')
}

/** "Rua das Flores, 120 — Centro, Campinas/SP" — pula o que não foi preenchido. */
export function formatarEndereco(endereco: Endereco | undefined): string {
  if (!endereco) return ''

  const logradouro = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  const linha1 = [logradouro, endereco.complemento].filter(Boolean).join(' — ')
  const municipio = [endereco.cidade, endereco.uf].filter(Boolean).join('/')
  const linha2 = [endereco.bairro, municipio].filter(Boolean).join(', ')

  return [linha1, linha2].filter(Boolean).join(' — ')
}
