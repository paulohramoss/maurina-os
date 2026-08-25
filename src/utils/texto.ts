/** Minúscula, sem acento — para campos *Busca no Firestore (que não tem LIKE). */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** "joão da silva" → "João da Silva" (preposições em minúscula). */
export function capitalizarNome(texto: string): string {
  const minusculas = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return texto
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, i) =>
      i > 0 && minusculas.has(palavra)
        ? palavra
        : palavra.charAt(0).toUpperCase() + palavra.slice(1),
    )
    .join(' ')
}

/** Prefix search do Firestore: where('campo','>=',t).where('campo','<=',t+'\uf8ff') */
export const FIM_PREFIXO = '\uf8ff'
