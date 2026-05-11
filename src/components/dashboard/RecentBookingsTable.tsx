"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/Badge"
import { BookOpen, Check, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function RecentBookingsTable({ bookings }: { bookings: any[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [localBookings, setLocalBookings] = useState(bookings)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    setLocalBookings(bookings)
  }, [bookings])

  const handleUpdateStatus = async (e: React.MouseEvent, id: string, newStatus: string) => {
    e.stopPropagation() // Prevent row click
    if (updatingId) return
    
    setUpdatingId(id)
    
    // Optimistic UI update
    setLocalBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))

    // DB update
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      console.error('Error updating booking status:', error)
      // Revert if error
      setLocalBookings(bookings)
    }
    
    setUpdatingId(null)
  }

  const handleWppClick = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation() // Prevent row click
    if (!phone) return
    const formattedPhone = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${formattedPhone}`, '_blank')
  }

  if (localBookings.length === 0) {
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
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
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
          {localBookings.map((b, i) => (
            <tr
              key={b.id}
              className="booking-row"
              onClick={() => router.push(`/dashboard/reservas/${b.id}`)}
              style={{ borderBottom: i < localBookings.length - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none', position: 'relative' }}
            >
              <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                {b.properties?.name}
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {b.guest_name}
                  {b.guest_phone && (
                    <button
                      onClick={(e) => handleWppClick(e, b.guest_phone)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#25D366', padding: '4px', borderRadius: '4px'
                      }}
                      title="Chamar no WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', whiteSpace: 'nowrap' }}>{formatDate(b.check_in)}</td>
              <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StatusBadge status={b.status} />
                  
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={(e) => handleUpdateStatus(e, b.id, 'confirmed')}
                        disabled={updatingId === b.id}
                        style={{
                          backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '6px',
                          padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: updatingId === b.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px', opacity: updatingId === b.id ? 0.7 : 1
                        }}
                      >
                        <Check size={14} /> Aprovar
                      </button>
                      <button
                        onClick={(e) => handleUpdateStatus(e, b.id, 'cancelled')}
                        disabled={updatingId === b.id}
                        style={{
                          backgroundColor: '#991B1B', color: 'white', border: 'none', borderRadius: '6px',
                          padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: updatingId === b.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px', opacity: updatingId === b.id ? 0.7 : 1
                        }}
                      >
                        <X size={14} /> Recusar
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
