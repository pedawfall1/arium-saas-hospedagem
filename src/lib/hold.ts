import { parseISO } from "date-fns"

/**
 * Trava da reserva pendente.
 *
 * Espelha exatamente a condição usada por check_availability() e
 * get_unavailable_dates() no Postgres:
 *
 *   status = 'pending' AND coalesce(hold_expires_at, created_at + 24h) > now()
 *
 * O prazo vem SEMPRE do banco (hold_expires_at / created_at, ambos timestamptz
 * em UTC). Nunca derive de horário do navegador guardado em estado.
 */
export const HOLD_HOURS = 24

const HOLD_MS = HOLD_HOURS * 60 * 60 * 1000

export type HoldBooking = {
  status?: string | null
  created_at?: string | null
  hold_expires_at?: string | null
}

/** Momento em que a reserva deixa de segurar as datas. */
export function getHoldExpiry(booking: HoldBooking): Date | null {
  if (booking.hold_expires_at) {
    const explicit = parseISO(booking.hold_expires_at)
    if (!isNaN(explicit.getTime())) return explicit
  }
  if (booking.created_at) {
    const created = parseISO(booking.created_at)
    if (!isNaN(created.getTime())) return new Date(created.getTime() + HOLD_MS)
  }
  return null
}

/** Só reservas pendentes têm trava por tempo. Confirmadas seguram para sempre. */
export function hasHold(booking: HoldBooking): boolean {
  return booking.status === "pending" && getHoldExpiry(booking) !== null
}

export type HoldState = {
  expiry: Date
  msLeft: number
  expired: boolean
  /** Falta menos de 2h — merece destaque visual. */
  urgent: boolean
  /** "Expira em 5h 12min", "Expira em 42min" ou "Expirada". */
  label: string
}

export function describeHold(booking: HoldBooking, now: Date): HoldState | null {
  const expiry = getHoldExpiry(booking)
  if (!expiry) return null

  const msLeft = expiry.getTime() - now.getTime()

  if (msLeft <= 0) {
    return { expiry, msLeft, expired: true, urgent: false, label: "Expirada" }
  }

  const totalMinutes = Math.floor(msLeft / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  let label: string
  if (totalMinutes < 1) label = "Expira em menos de 1min"
  else if (hours < 1) label = `Expira em ${minutes}min`
  else label = `Expira em ${hours}h ${String(minutes).padStart(2, "0")}min`

  return { expiry, msLeft, expired: false, urgent: msLeft < 2 * 60 * 60 * 1000, label }
}
