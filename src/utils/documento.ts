/** CPF/CNPJ: opcional no cadastro rápido, mas se digitar, tem que ser válido. */

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function cpfValido(entrada: string): boolean {
  const cpf = apenasDigitos(entrada)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const digito = (ate: number): number => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

export function cnpjValido(entrada: string): boolean {
  const cnpj = apenasDigitos(entrada)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false

  const digito = (ate: number): number => {
    const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cnpj[i]) * (pesos[i] as number)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13])
}

export function documentoValido(entrada: string): boolean {
  const d = apenasDigitos(entrada)
  if (d.length === 11) return cpfValido(d)
  if (d.length === 14) return cnpjValido(d)
  return false
}

/** 12345678909 → "123.456.789-09" · 11222333000181 → "11.222.333/0001-81" */
export function formatarDocumento(entrada: string): string {
  const d = apenasDigitos(entrada)
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return entrada
}

/** Máscara progressiva: vira CPF até 11 dígitos, CNPJ a partir daí. */
export function mascaraDocumento(entrada: string): string {
  const d = apenasDigitos(entrada).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
