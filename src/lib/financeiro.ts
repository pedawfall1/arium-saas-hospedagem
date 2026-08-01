/**
 * Motor financeiro do painel.
 *
 * Regra central (definida com a dona): o restante da reserva só vira
 * faturamento REALIZADO depois que o check-out passa. Antes disso, só conta o
 * que já foi efetivamente pago (sinal ou pagamento integral); o resto fica em
 * "A receber".
 *
 * Tudo aqui é puro e determinístico: recebe `hoje` por parâmetro em vez de ler
 * o relógio, para os cálculos serem testáveis e não variarem entre servidor e
 * navegador.
 */

export const ACTIVE_STATUSES = ['confirmed', 'checked_in', 'completed'] as const

export type BookingLike = {
  id: string
  property_id: string
  check_in: string
  check_out: string
  total_amount: number | string | null
  deposit_amount: number | string | null
  status: string
  payment_status: string
}

export type ExpenseLike = {
  id: string
  /** null = gasto geral, rateado entre as cabanas */
  property_id: string | null
  category_id?: string | null
  amount: number | string | null
  date: string
}

export type ExtraRevenueLike = {
  id: string
  booking_id: string
  property_id: string
  amount: number | string | null
  date: string
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0))
  return isNaN(n) ? 0 : n
}

/** Conta uma reserva? Canceladas e pendentes nunca entram no faturamento. */
export function isActiveBooking(b: BookingLike): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(b.status)
}

/** A estadia terminou? `hoje` no formato yyyy-MM-dd (comparação lexicográfica é segura). */
export function hasCheckedOut(b: BookingLike, hoje: string): boolean {
  return b.check_out <= hoje
}

export type BookingRevenue = {
  /** Valor da reserva já considerado no caixa. */
  realizado: number
  /** Valor ainda por entrar. */
  aReceber: number
}

/**
 * Quanto de uma reserva já é faturamento e quanto ainda está por vir.
 *
 * - check-out passou  -> o valor total conta como realizado (a estadia
 *   aconteceu, então o restante foi pago na saída).
 * - check-out no futuro -> só o que está marcado como pago:
 *     fully_paid    = total
 *     deposit_paid  = sinal
 *     awaiting_deposit = nada
 */
export function bookingRevenue(b: BookingLike, hoje: string): BookingRevenue {
  if (!isActiveBooking(b)) return { realizado: 0, aReceber: 0 }

  const total = num(b.total_amount)
  const deposit = Math.min(num(b.deposit_amount), total)

  if (hasCheckedOut(b, hoje)) {
    return { realizado: total, aReceber: 0 }
  }

  const pago =
    b.payment_status === 'fully_paid' ? total :
    b.payment_status === 'deposit_paid' ? deposit :
    0

  return { realizado: pago, aReceber: Math.max(0, total - pago) }
}

export type PropertyResult = {
  propertyId: string
  name: string
  /** Faturamento de diárias já realizado. */
  diarias: number
  /** Receitas extras (fondue, tábua...) do período. */
  extras: number
  /** diarias + extras */
  receita: number
  /** Ainda por receber (reservas futuras). */
  aReceber: number
  /** Gastos lançados diretamente nesta cabana. */
  gastosDiretos: number
  /** Parte dos gastos gerais atribuída a esta cabana. */
  gastosRateados: number
  /** gastosDiretos + gastosRateados */
  gastos: number
  /** receita - gastos */
  liquido: number
  /** Nº de reservas do período. */
  reservas: number
  /** Noites vendidas no período. */
  noites: number
}

export type FinanceResult = {
  porCabana: PropertyResult[]
  total: {
    diarias: number
    extras: number
    receita: number
    aReceber: number
    gastosDiretos: number
    gastosGerais: number
    gastos: number
    liquido: number
    reservas: number
    /** Margem líquida em % (0 quando não há receita). */
    margem: number
    ticketMedio: number
  }
}

const noites = (b: BookingLike): number => {
  const ms = new Date(b.check_out + 'T12:00:00').getTime() - new Date(b.check_in + 'T12:00:00').getTime()
  return Math.max(1, Math.round(ms / 86400000))
}

/**
 * Consolida receita, gastos e líquido por cabana num período.
 *
 * Os gastos gerais (property_id = null) são rateados proporcionalmente à
 * receita de cada cabana — quem fatura mais absorve mais do custo comum.
 * Quando ninguém faturou no período, o rateio é dividido em partes iguais.
 *
 * Reservas são atribuídas ao período pela data de CHECK-IN (é quando a estadia
 * começa); gastos e extras, pela data do lançamento.
 */
export function computeFinance(params: {
  properties: { id: string, name: string }[]
  bookings: BookingLike[]
  expenses: ExpenseLike[]
  extras: ExtraRevenueLike[]
  /** yyyy-MM-dd inclusivo */
  inicio: string
  /** yyyy-MM-dd inclusivo */
  fim: string
  /** yyyy-MM-dd — "hoje" para decidir o que já foi realizado */
  hoje: string
}): FinanceResult {
  const { properties, bookings, expenses, extras, inicio, fim, hoje } = params

  const noPeriodo = (d: string) => d >= inicio && d <= fim

  const base = new Map<string, PropertyResult>()
  for (const p of properties) {
    base.set(p.id, {
      propertyId: p.id, name: p.name,
      diarias: 0, extras: 0, receita: 0, aReceber: 0,
      gastosDiretos: 0, gastosRateados: 0, gastos: 0, liquido: 0,
      reservas: 0, noites: 0,
    })
  }

  // --- Diárias ---
  for (const b of bookings) {
    if (!noPeriodo(b.check_in)) continue
    const row = base.get(b.property_id)
    if (!row) continue
    if (!isActiveBooking(b)) continue

    const { realizado, aReceber } = bookingRevenue(b, hoje)
    row.diarias += realizado
    row.aReceber += aReceber
    row.reservas += 1
    row.noites += noites(b)
  }

  // --- Receitas extras ---
  for (const e of extras) {
    if (!noPeriodo(e.date)) continue
    const row = base.get(e.property_id)
    if (!row) continue
    row.extras += num(e.amount)
  }

  // --- Gastos diretos e gerais ---
  let gastosGerais = 0
  for (const g of expenses) {
    if (!noPeriodo(g.date)) continue
    if (g.property_id === null) {
      gastosGerais += num(g.amount)
      continue
    }
    const row = base.get(g.property_id)
    if (!row) continue
    row.gastosDiretos += num(g.amount)
  }

  const rows = [...base.values()]
  for (const r of rows) r.receita = r.diarias + r.extras

  // --- Rateio dos gastos gerais ---
  const receitaTotal = rows.reduce((s, r) => s + r.receita, 0)
  if (gastosGerais > 0 && rows.length > 0) {
    if (receitaTotal > 0) {
      rows.forEach(r => { r.gastosRateados = gastosGerais * (r.receita / receitaTotal) })
    } else {
      const parte = gastosGerais / rows.length
      rows.forEach(r => { r.gastosRateados = parte })
    }
  }

  for (const r of rows) {
    r.gastos = r.gastosDiretos + r.gastosRateados
    r.liquido = r.receita - r.gastos
  }

  const diarias = rows.reduce((s, r) => s + r.diarias, 0)
  const extrasTotal = rows.reduce((s, r) => s + r.extras, 0)
  const aReceber = rows.reduce((s, r) => s + r.aReceber, 0)
  const gastosDiretos = rows.reduce((s, r) => s + r.gastosDiretos, 0)
  const reservas = rows.reduce((s, r) => s + r.reservas, 0)
  const receita = diarias + extrasTotal
  const gastos = gastosDiretos + gastosGerais

  return {
    porCabana: rows.sort((a, b) => b.receita - a.receita),
    total: {
      diarias, extras: extrasTotal, receita, aReceber,
      gastosDiretos, gastosGerais, gastos,
      liquido: receita - gastos,
      reservas,
      margem: receita > 0 ? ((receita - gastos) / receita) * 100 : 0,
      ticketMedio: reservas > 0 ? receita / reservas : 0,
    },
  }
}
