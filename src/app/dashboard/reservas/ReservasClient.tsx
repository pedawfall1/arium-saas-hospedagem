"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/Badge"
import { BookOpen, TrendingUp, Calendar } from "lucide-react"
import { differenceInDays, parseISO, format, isAfter } from "date-fns"

export function ReservasClient({ bookings, properties }: { bookings: any[], properties: any[] }) {
  const router = useRouter()
  const [filterProp, setFilterProp] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Stats
  const totalReservas = bookings.length
  
  const receitaConfirmada = bookings
    .filter(b => b.payment_status === "deposit_paid" || b.payment_status === "fully_paid")
    .reduce((sum, b) => sum + (Number(b.deposit_amount) || 0), 0)

  const today = new Date()
  today.setHours(0,0,0,0)
  
  const futureConfirmed = bookings
    .filter(b => b.status === "confirmed" || b.status === "deposit_paid") 
    .filter(b => {
      const d = parseISO(b.check_in)
      return d >= today
    })
    .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())

  const proximoCheckinStr = futureConfirmed.length > 0 
    ? format(parseISO(futureConfirmed[0].check_in), 'dd/MM/yyyy') 
    : "Nenhum"

  const filtered = bookings.filter(b => {
    if (filterProp !== "all" && b.property_id !== filterProp) return false
    if (filterStatus !== "all") {
      if (filterStatus === "active" && (b.status === "cancelled" || b.status === "completed")) return false
      if (filterStatus !== "active" && b.status !== filterStatus) return false
    }
    return true
  })

  const filterSelectStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 16px',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '180px',
  }

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
        Minhas Reservas
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
        Acompanhe e gerencie as reservas de suas propriedades.
      </p>

      {/* Stats Row */}
      <div className="dash-stats" style={{ marginBottom: '32px' }}>
        {/* Stat 1 */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', borderTop: '3px solid #7c3aed' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 500 }}>Total de reservas</h3>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} color="var(--purple)" />
            </div>
          </div>
          <p style={{ color: '#7c3aed', fontSize: '40px', fontWeight: 800 }}>{totalReservas}</p>
        </div>

        {/* Stat 2 */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', borderTop: '3px solid #f97b00' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 500 }}>Receita confirmada</h3>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="var(--purple)" />
            </div>
          </div>
          <p style={{ color: '#f97b00', fontSize: '40px', fontWeight: 800 }}>{formatCurrency(receitaConfirmada)}</p>
        </div>

        {/* Stat 3 */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', borderTop: '3px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 500 }}>Próximo check-in</h3>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} color="var(--purple)" />
            </div>
          </div>
          <p style={{ color: '#3b82f6', fontSize: '40px', fontWeight: 800 }}>{proximoCheckinStr}</p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <select 
            value={filterProp}
            onChange={e => setFilterProp(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="all">Todas as cabanas</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativas (Pendentes, Confirmadas, Check-in)</option>
            <option value="confirmed">Confirmadas</option>
            <option value="checked_in">Em Check-in</option>
            <option value="completed">Concluídas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        <a 
          href={`https://wa.me/5549992570611?text=${encodeURIComponent('Olá, gostaria de registrar uma reserva manual.')}`}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--purple)',
            color: 'var(--purple)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          Nova reserva manual
        </a>
      </div>

      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="reservas-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(13, 13, 26, 0.5)' }}>
                {['Cabana', 'Hóspede', 'Período', 'Noites', 'Total', 'Sinal', 'Status', 'Pagamento'].map(col => (
                  <th key={col} style={{
                    padding: '14px 24px', textAlign: 'left',
                    color: 'var(--muted)', fontSize: '11px',
                    fontWeight: 500, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap'
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking, i) => {
                const noites = Math.max(1, differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in)))
                return (
                  <tr key={booking.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none',
                    position: 'relative',
                    transition: 'background 0.15s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--purple-dim)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => router.push('/dashboard/reservas/' + booking.id)}
                  >
                    <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 500 }}>{booking.properties?.name}</span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      {booking.guest_name}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      {format(parseISO(booking.check_in), 'dd/MM')} &rarr; {format(parseISO(booking.check_out), 'dd/MM')}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>
                      {noites}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>
                      {formatCurrency(booking.total_amount)}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>
                      {formatCurrency(booking.deposit_amount)}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <StatusBadge status={booking.status} />
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <StatusBadge status={booking.payment_status} />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <BookOpen size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
                      <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhuma reserva encontrada.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="reservas-cards" style={{ padding: '16px' }}>
            {filtered.map(booking => (
              <a key={booking.id} href={`/dashboard/reservas/${booking.id}`} style={{
                display: 'block', textDecoration: 'none',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--purple)',
                borderRadius: '10px', padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>{booking.guest_name}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>{booking.properties?.name}</p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <p style={{ color: 'var(--muted)', fontSize: '11px' }}>Check-in</p>
                    <p style={{ color: 'var(--text)', fontSize: '13px' }}>{formatDate(booking.check_in)}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--muted)', fontSize: '11px' }}>Total</p>
                    <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600 }}>{formatCurrency(booking.total_amount)}</p>
                  </div>
                </div>
              </a>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhuma reserva encontrada.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
