import { apenasDigitos } from './documento'

/** Telefone e WhatsApp. Guardado só com dígitos; DDI entra só no link do wa.me. */

export function telefoneValido(entrada: string): boolean {
  const d = apenasDigitos(entrada)
  return d.length === 10 || d.length === 11
}

/** 11987654321 → "(11) 98765-4321" */
export function formatarTelefone(entrada: string): string {
  const d = apenasDigitos(entrada)
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return entrada
}

export function mascaraTelefone(entrada: string): string {
  const d = apenasDigitos(entrada).slice(0, 11)
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, '($1')
  if (d.length <= 6) return d.replace(/^(\d{2})(\d{0,4})/, '($1) $2')
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

/** Link do WhatsApp com a mensagem já escrita. DDI 55 fixo. */
export function linkWhatsApp(telefone: string, mensagem?: string): string {
  const d = apenasDigitos(telefone)
  const numero = d.startsWith('55') && d.length > 11 ? d : `55${d}`
  const base = `https://wa.me/${numero}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}
