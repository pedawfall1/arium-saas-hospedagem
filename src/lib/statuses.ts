/**
 * Fonte única dos status de reserva.
 *
 * Estes valores espelham exatamente os CHECK do Postgres. O seletor de
 * pagamento oferecia "pending" e "overdue", que o banco recusa — e como o erro
 * não era verificado, a tela mostrava a mudança e nada era salvo. Qualquer
 * lista de opções deve sair daqui.
 *
 *   bookings_status_check         → pending, confirmed, checked_in, completed, cancelled
 *   bookings_payment_status_check → awaiting_deposit, deposit_paid, fully_paid, refunded
 */

export const BOOKING_STATUS = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  checked_in: 'Check-in realizado',
  completed: 'Concluída',
  cancelled: 'Cancelada',
} as const

export const PAYMENT_STATUS = {
  awaiting_deposit: 'Aguardando pagamento',
  deposit_paid: 'Sinal pago',
  fully_paid: 'Pago integralmente',
  refunded: 'Reembolsado',
} as const

export type BookingStatus = keyof typeof BOOKING_STATUS
export type PaymentStatus = keyof typeof PAYMENT_STATUS

export const BOOKING_STATUS_OPTIONS = Object.entries(BOOKING_STATUS) as [BookingStatus, string][]
export const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS) as [PaymentStatus, string][]

/** Reservas que ocupam a cabana e entram no faturamento. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['confirmed', 'checked_in', 'completed']

export const bookingStatusLabel = (s: string) =>
  BOOKING_STATUS[s as BookingStatus] ?? s

export const paymentStatusLabel = (s: string) =>
  PAYMENT_STATUS[s as PaymentStatus] ?? s
