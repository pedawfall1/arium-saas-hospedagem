import { seguraDatas, type HoldBooking } from "@/lib/hold"

/**
 * Conflitos ao transferir uma reserva para outras datas e/ou outra cabana.
 *
 * O banco NÃO impede reservas sobrepostas (não há constraint nem trigger em
 * bookings), então esta checagem é a única barreira no painel. Usa o mesmo
 * critério de ocupação do check_availability() do Postgres:
 *   - confirmed / checked_in / completed ocupam sempre;
 *   - pending só ocupa enquanto a trava de 24h não venceu;
 *   - blocked_dates ocupam, EXCETO os que pertencem à própria reserva
 *     (reservas manuais gravam um bloqueio por noite com booking_id).
 *
 * Datas são strings 'yyyy-MM-dd'; comparação lexicográfica é segura.
 */

export type ReservaDoDestino = HoldBooking & {
  id: string
  guest_name: string
  check_in: string
  check_out: string
}

export type BloqueioDoDestino = {
  date: string
  booking_id: string | null
  reason?: string | null
}

const OCUPAM_SEMPRE = ['confirmed', 'checked_in', 'completed']

export function acharConflitos(p: {
  bookingId: string
  checkIn: string
  checkOut: string
  reservas: ReservaDoDestino[]
  bloqueios: BloqueioDoDestino[]
  agora: Date
}): string[] {
  const msgs: string[] = []

  for (const r of p.reservas) {
    if (r.id === p.bookingId) continue
    const ocupa = OCUPAM_SEMPRE.includes(r.status ?? '') || seguraDatas(r, p.agora)
    if (!ocupa) continue
    if (r.check_in < p.checkOut && r.check_out > p.checkIn) {
      msgs.push(`reserva de ${r.guest_name.trim()} (${r.check_in} → ${r.check_out})`)
    }
  }

  const noitesBloqueadas = p.bloqueios
    .filter(b => b.booking_id !== p.bookingId && b.date >= p.checkIn && b.date < p.checkOut)
    .map(b => b.date)
    .sort()
  if (noitesBloqueadas.length > 0) {
    msgs.push(`${noitesBloqueadas.length} noite(s) bloqueada(s) (${noitesBloqueadas.join(', ')})`)
  }

  return msgs
}
