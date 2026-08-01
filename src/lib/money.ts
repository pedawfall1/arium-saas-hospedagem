/**
 * Leitura de valores em dinheiro digitados por gente de verdade.
 *
 * NUNCA use <input type="number"> para dinheiro: quando o conteúdo não é um
 * número válido para o navegador — e "2000,00" não é, porque o HTML só aceita
 * ponto decimal — `e.target.value` devolve string VAZIA. O valor digitado
 * some silenciosamente e vira 0 ao salvar.
 *
 * Aqui o campo é type="text" e a interpretação fica por nossa conta, aceitando
 * o que a dona realmente digita: "2000", "2.000", "2000,50", "R$ 2.000,50".
 */

/**
 * Converte texto em número. Devolve NaN quando não dá para entender,
 * para quem chama distinguir "vazio/inválido" de "zero".
 */
export function parseMoney(input: string | number | null | undefined): number {
  if (typeof input === 'number') return isNaN(input) ? NaN : input
  if (input === null || input === undefined) return NaN

  // Mantém só dígitos e separadores
  const limpo = String(input).replace(/[^\d.,-]/g, '').trim()
  if (limpo === '' || limpo === '-') return NaN

  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')

  let normalizado: string

  if (temVirgula && temPonto) {
    // "1.234.567,89" -> ponto é milhar, vírgula é decimal
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    // "2000,50" -> vírgula é decimal
    normalizado = limpo.replace(',', '.')
  } else if (temPonto) {
    // Ambíguo: "2.000" é dois mil, mas "2.5" é dois e meio.
    // Só tratamos como milhar quando o formato é exatamente N.NNN(.NNN)*
    normalizado = /^-?\d{1,3}(\.\d{3})+$/.test(limpo)
      ? limpo.replace(/\./g, '')
      : limpo
  } else {
    normalizado = limpo
  }

  const n = Number(normalizado)
  return isNaN(n) ? NaN : n
}

/** Igual a parseMoney, mas devolve 0 quando não dá para entender. */
export function parseMoneyOrZero(input: string | number | null | undefined): number {
  const n = parseMoney(input)
  return isNaN(n) ? 0 : n
}

/** true quando o texto representa um valor utilizável (número finito e >= 0). */
export function isValidMoney(input: string | number | null | undefined): boolean {
  const n = parseMoney(input)
  return !isNaN(n) && isFinite(n) && n >= 0
}

export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : parseMoney(value)
  if (isNaN(n)) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}
