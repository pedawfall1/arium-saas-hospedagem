"use client"

import { useEffect, useState } from "react"
import { describeHold, hasHold, type HoldBooking } from "@/lib/hold"

/**
 * Relógio compartilhado: um único timer para todas as contagens da página,
 * alinhado à virada do minuto. Devolve `null` até montar no cliente, para
 * não divergir do HTML renderizado no servidor (hydration).
 */
function useMinuteTick(): Date | null {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())

    let interval: ReturnType<typeof setInterval> | undefined
    // Alinha o primeiro tick à virada do minuto, depois segue de 60 em 60s.
    const msToNextMinute = 60000 - (Date.now() % 60000)
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60000)
    }, msToNextMinute)

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  return now
}

// Cores via variáveis de tema: os tons "400" somem sobre fundo claro.
const EXPIRED = { fg: "var(--neutral-soft)", bg: "rgba(148,163,184,0.12)", bd: "rgba(148,163,184,0.28)" }
const URGENT = { fg: "var(--warning)", bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.35)" }
const NORMAL = { fg: "var(--info-strong)", bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)" }

/** Selo de cortesia ou de pagamento em aberto, para a listagem. */
export function BookingFlags({ booking }: { booking: { is_courtesy?: boolean | null, awaiting_settlement?: boolean | null } }) {
  if (!booking.is_courtesy && !booking.awaiting_settlement) return null

  const base = {
    display: 'inline-block', marginTop: '4px', marginRight: '4px',
    padding: '2px 8px', borderRadius: '6px',
    fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' as const,
  }

  return (
    <>
      {booking.is_courtesy && (
        <span title="Diária cedida (influencer/permuta) — não entra no faturamento" style={{
          ...base, backgroundColor: 'rgba(168,85,247,0.12)',
          border: '1px solid rgba(168,85,247,0.3)', color: 'var(--violet-mid)',
        }}>
          🎁 Cortesia
        </span>
      )}
      {booking.awaiting_settlement && (
        <span title="A estadia aconteceu mas o pagamento ainda não entrou" style={{
          ...base, backgroundColor: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.35)', color: 'var(--warning)',
        }}>
          ⏳ Não recebido
        </span>
      )}
    </>
  )
}

/** Selo compacto para listagem/tabela. */
export function HoldCountdown({ booking }: { booking: HoldBooking }) {
  const now = useMinuteTick()

  if (!hasHold(booking)) return null
  if (!now) return null // ainda não montou no cliente

  const hold = describeHold(booking, now)
  if (!hold) return null

  const c = hold.expired ? EXPIRED : hold.urgent ? URGENT : NORMAL

  return (
    <span
      title={
        hold.expired
          ? "O prazo de 24h acabou — esta reserva não está mais segurando as datas."
          : `Segura as datas até ${hold.expiry.toLocaleString("pt-BR")}`
      }
      style={{
        display: "inline-block",
        marginTop: "4px",
        padding: "2px 8px",
        borderRadius: "6px",
        backgroundColor: c.bg,
        border: `1px solid ${c.bd}`,
        color: c.fg,
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {hold.expired ? "⏳ Expirada · datas livres" : `⏳ ${hold.label}`}
    </span>
  )
}

/** Versão explicativa para a página de detalhe da reserva. */
export function HoldNotice({ booking }: { booking: HoldBooking }) {
  const now = useMinuteTick()

  if (!hasHold(booking)) return null
  if (!now) return null

  const hold = describeHold(booking, now)
  if (!hold) return null

  const c = hold.expired ? EXPIRED : hold.urgent ? URGENT : NORMAL

  return (
    <div
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.bd}`,
        borderRadius: "12px",
        padding: "14px 18px",
        marginBottom: "16px",
      }}
    >
      <p style={{ color: c.fg, fontSize: "14px", fontWeight: 600, margin: 0 }}>
        {hold.expired ? "⏳ Reserva expirada" : `⏳ ${hold.label}`}
      </p>
      <p style={{ color: "var(--muted)", fontSize: "13px", margin: "6px 0 0 0", lineHeight: 1.5 }}>
        {hold.expired ? (
          <>
            O prazo de 24h acabou e esta reserva <strong>não está mais segurando as datas</strong> —
            elas voltaram a aparecer como livres no site. Se o hóspede ainda quiser, confirme o
            pagamento manualmente ou estenda o prazo.
          </>
        ) : (
          <>
            Esta reserva segura as datas até{" "}
            <strong>{hold.expiry.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</strong>.
            Depois disso, as datas voltam a ficar disponíveis no site automaticamente.
          </>
        )}
      </p>
    </div>
  )
}
