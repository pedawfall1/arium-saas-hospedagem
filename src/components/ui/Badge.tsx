export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string; label: string }> = {
    active:           { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.25)',  label: 'Ativo' },
    inactive:         { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)', label: 'Inativo' },
    trial:            { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)', label: 'Trial' },
    cancelled:        { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.25)',  label: 'Cancelado' },
    pending:          { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', border: 'rgba(249,115,22,0.25)', label: 'Pendente' },
    confirmed:        { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.25)',  label: 'Confirmado' },
    checked_in:       { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)', label: 'Check-in' },
    completed:        { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', border: 'rgba(168,85,247,0.25)', label: 'Concluído' },
    cancelled_booking:{ bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.25)',  label: 'Cancelado' },
    awaiting_deposit: { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', border: 'rgba(249,115,22,0.25)', label: 'Aguard. sinal' },
    deposit_paid:     { bg: 'rgba(234,179,8,0.12)',  color: '#facc15', border: 'rgba(234,179,8,0.25)',  label: 'Sinal pago' },
    fully_paid:       { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.25)',  label: 'Pago' },
    refunded:         { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)', label: 'Reembolsado' },
  }

  const s = styles[status] ?? styles.pending

  return (
    <span style={{
      backgroundColor: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: '999px', padding: '3px 10px',
      fontSize: '11px', fontWeight: 500
    }}>
      {s.label}
    </span>
  )
}

export function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    essencial: { bg: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: 'rgba(124,58,237,0.25)' },
    plus:      { bg: 'rgba(124,58,237,0.18)', color: '#c084fc', border: 'rgba(124,58,237,0.35)' },
    premium:   { bg: 'rgba(124,58,237,0.25)', color: '#e879f9', border: 'rgba(124,58,237,0.45)' },
  }
  const s = styles[plan] ?? styles.essencial
  const label = plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <span style={{
      backgroundColor: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: '999px', padding: '3px 10px',
      fontSize: '11px', fontWeight: 500
    }}>
      {label}
    </span>
  )
}

export function Badge({ children, variant = "default" }: any) {
  return <StatusBadge status={variant} />
}
