"use client"

import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/Badge"
import { BookOpen } from "lucide-react"

export function RecentBookingsTable({ bookings }: { bookings: any[] }) {
  const router = useRouter()

  if (bookings.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div className="pulse-ring" style={{
          width: '64px', height: '64px', borderRadius: '16px',
          backgroundColor: 'var(--purple-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 16px rgba(124,58,237,0.2)'
        }}>
          <BookOpen size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
          Nenhuma reserva ainda
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Suas reservas aparecerão aqui assim que chegarem.
        </p>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <style>{`
        .booking-row { transition: background-color 0.15s ease; cursor: pointer; }
        .booking-row:hover { background-color: rgba(124,58,237,0.06); }
      `}</style>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr style={{ backgroundColor: 'rgba(13, 13, 26, 0.5)' }}>
            {['Cabana', 'Hóspede', 'Check-in', 'Status'].map(col => (
              <th key={col} style={{ padding: '14px 24px', textAlign: 'left', color: 'var(--muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b, i) => (
            <tr
              key={b.id}
              className="booking-row"
              onClick={() => router.push(`/dashboard/reservas/${b.id}`)}
              style={{ borderBottom: i < bookings.length - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none', position: 'relative' }}
            >
              <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                {b.properties?.name}
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>{b.guest_name}</td>
              <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>{formatDate(b.check_in)}</td>
              <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                <StatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
