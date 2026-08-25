import { format, formatDistanceToNow, addMonths, isAfter, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Timestamp } from 'firebase/firestore'

/** Aceita Timestamp do Firestore, Date ou número. Nulo vira null, sem quebrar a tela. */
export function paraData(valor: Timestamp | Date | number | null | undefined): Date | null {
  if (valor == null) return null
  if (valor instanceof Date) return valor
  if (typeof valor === 'number') return new Date(valor)
  if (typeof valor === 'object' && 'toDate' in valor) return valor.toDate()
  return null
}

export function formatarData(valor: Timestamp | Date | null | undefined): string {
  const d = paraData(valor)
  return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '—'
}

export function formatarDataHora(valor: Timestamp | Date | null | undefined): string {
  const d = paraData(valor)
  return d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'
}

export function formatarHora(valor: Timestamp | Date | null | undefined): string {
  const d = paraData(valor)
  return d ? format(d, 'HH:mm', { locale: ptBR }) : '—'
}

/** "há 3 dias" — usado na timeline e nos cards do pátio. */
export function tempoRelativo(valor: Timestamp | Date | null | undefined): string {
  const d = paraData(valor)
  return d ? formatDistanceToNow(d, { addSuffix: true, locale: ptBR }) : '—'
}

/** Data para input type="date". */
export function paraInputData(valor: Timestamp | Date | null | undefined): string {
  const d = paraData(valor)
  return d ? format(d, 'yyyy-MM-dd') : ''
}

/** Próxima revisão por tempo: hoje + N meses. */
export function proximaRevisaoPorData(meses: number, base: Date = new Date()): Date {
  return addMonths(base, meses)
}

/** Veículo passou da data de revisão? */
export function revisaoVencida(proxima: Timestamp | Date | null | undefined): boolean {
  const d = paraData(proxima)
  return d ? isAfter(new Date(), d) : false
}

export const periodo = { startOfDay, endOfDay, startOfMonth, endOfMonth }
