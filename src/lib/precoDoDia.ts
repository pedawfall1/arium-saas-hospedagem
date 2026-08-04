/**
 * Preço de uma noite, para EXIBIÇÃO no calendário do painel.
 *
 * Espelha a ordem de precedência de calculate_price no Postgres. Se um dia
 * mudar lá, precisa mudar aqui também — senão o painel mostra um preço e o
 * hóspede paga outro.
 *
 *   1. daily_rates   (a dona definiu aquele dia exato)
 *   2. pricing_rules (regra especial por período)
 *   3. holidays      (feriado por período)
 *   4. domingo / fim de semana / dia de semana, com baixa temporada
 *
 * Fica de fora o pacote de 2 noites e o desconto por permanência: dependem do
 * tamanho da estadia, não da data isolada.
 */

export type PropriedadePreco = {
  base_price_weekday: number | string | null
  base_price_weekend: number | string | null
  base_price_sunday?: number | string | null
  low_season_weekday?: number | string | null
  low_season_weekend?: number | string | null
  low_season_from_month?: number | null
  low_season_to_month?: number | null
  min_nights_weekday?: number | null
  min_nights_weekend?: number | null
}

export type DailyRate = { date: string, price: number | string | null, min_nights: number | null }
export type Regra = { valid_from: string, valid_until: string, price: number | string | null }
export type Feriado = { date_from: string, date_to: string, price: number | string | null, min_nights: number | null, name?: string }

export type PrecoDia = {
  preco: number | null
  minNoites: number
  origem: 'dia' | 'regra' | 'feriado' | 'domingo' | 'fds' | 'semana'
  rotulo: string
  /** true quando a dona definiu algo específico para este dia. */
  personalizado: boolean
}

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

/** Baixa temporada, aceitando período que vira o ano (ex.: novembro a março). */
export function ehBaixaTemporada(data: string, de?: number | null, ate?: number | null): boolean {
  const mes = Number(data.slice(5, 7))
  const d = de ?? 1
  const a = ate ?? 8
  return d <= a ? mes >= d && mes <= a : mes >= d || mes <= a
}

export function precoDoDia(
  data: string,
  prop: PropriedadePreco,
  daily: DailyRate[],
  regras: Regra[],
  feriados: Feriado[]
): PrecoDia {
  // Domingo = 0 na contagem do JS. Usa meio-dia para não escorregar de fuso.
  const diaSemana = new Date(data + 'T12:00:00').getDay()
  const baixa = ehBaixaTemporada(data, prop.low_season_from_month, prop.low_season_to_month)

  const precoFds = (baixa ? num(prop.low_season_weekend) : null) ?? num(prop.base_price_weekend)
  const precoSemana = (baixa ? num(prop.low_season_weekday) : null) ?? num(prop.base_price_weekday)

  const minPadrao = ([5, 6, 0].includes(diaSemana)
    ? prop.min_nights_weekend : prop.min_nights_weekday) ?? 1

  // 1) Dia exato
  const doDia = daily.find(d => d.date === data)
  // 3) Feriado (date_to é exclusivo, igual à função do banco)
  const feriado = feriados.find(h => data >= h.date_from && data < h.date_to)

  const minNoites = doDia?.min_nights
    ?? (feriado?.min_nights ?? null)
    ?? minPadrao

  if (doDia && num(doDia.price) !== null) {
    return { preco: num(doDia.price), minNoites, origem: 'dia', rotulo: 'preço do dia', personalizado: true }
  }

  // 2) Regra especial
  const regra = regras.find(r => data >= r.valid_from && data <= r.valid_until)
  if (regra && num(regra.price) !== null) {
    return { preco: num(regra.price), minNoites, origem: 'regra', rotulo: 'regra especial', personalizado: true }
  }

  if (feriado && num(feriado.price) !== null) {
    return {
      preco: num(feriado.price), minNoites, origem: 'feriado',
      rotulo: feriado.name ? `feriado: ${feriado.name}` : 'feriado', personalizado: true,
    }
  }

  // 4) Preço base pelo tipo de dia
  const personalizado = !!doDia?.min_nights || !!feriado?.min_nights

  if (diaSemana === 0) {
    const domingo = num(prop.base_price_sunday)
    if (domingo !== null) return { preco: domingo, minNoites, origem: 'domingo', rotulo: 'domingo', personalizado }
    return { preco: precoFds, minNoites, origem: 'fds', rotulo: 'fim de semana', personalizado }
  }
  if (diaSemana === 5 || diaSemana === 6) {
    return { preco: precoFds, minNoites, origem: 'fds', rotulo: baixa ? 'fim de semana (baixa)' : 'fim de semana', personalizado }
  }
  return { preco: precoSemana, minNoites, origem: 'semana', rotulo: baixa ? 'dia de semana (baixa)' : 'dia de semana', personalizado }
}
