"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { StatusBadge } from "@/components/ui/Badge"
import { BookOpen, Check, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export function RecentBookingsTable({ bookings }: { bookings: any[] }) {
  const router = useRouter()
  const supabase = createClient()
  // Status alterado aqui na tela (aprovar/recusar), por cima do que veio do servidor.
  const [statusLocal, setStatusLocal] = useState<Record<string, string>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleUpdateStatus = async (e: React.MouseEvent, id: string, newStatus: string) => {
    e.stopPropagation()
    if (updatingId) return
    setUpdatingId(id)
    // Atualização otimista; volta atrás se o banco recusar.
    setStatusLocal(prev => ({ ...prev, [id]: newStatus }))
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id)
    if (error) {
      console.error('Error updating booking status:', error)
      setStatusLocal(prev => { const p = { ...prev }; delete p[id]; return p })
    } else {
      router.refresh()
    }
    setUpdatingId(null)
  }

  const handleWppClick = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation()
    if (!phone) return
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank')
  }

  if (bookings.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(124,58,237,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
        }}>
          <BookOpen size={24} style={{ color: 'var(--accent)' }} />
        </div>
        <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Nenhuma reserva ainda</p>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Suas reservas aparecerão aqui assim que chegarem.</p>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        .rec-linha { display: flex; align-items: center; gap: 14px; padding: 14px 20px; cursor: pointer; border-top: 1px solid var(--border); transition: background-color 0.15s; }
        .rec-linha:hover { background-color: rgba(124,58,237,0.06); }
        .rec-avatar { width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; }
        .rec-direita { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .rec-btn { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; transition: background-color 0.15s; }
        .rec-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rec-aprovar { color: var(--success); border: 1px solid rgba(34,197,94,0.45); }
        .rec-aprovar:hover:not(:disabled) { background-color: rgba(34,197,94,0.12); }
        .rec-recusar { color: var(--danger); border: 1px solid rgba(239,68,68,0.45); }
        .rec-recusar:hover:not(:disabled) { background-color: rgba(239,68,68,0.12); }
        @media (max-width: 640px) {
          .rec-linha { flex-wrap: wrap; padding: 14px 16px; }
          .rec-direita { width: 100%; padding-left: 52px; }
        }
      `}</style>
      {bookings.map(b => {
        const status = statusLocal[b.id] ?? b.status
        const cab = b._cabana || { nome: b.properties?.name || '', cor: '#8b5cf6' }
        const nome = String(b.guest_name || '').trim()
        const noites = b.check_in && b.check_out ? differenceInCalendarDays(parseISO(b.check_out), parseISO(b.check_in)) : 0
        return (
          <div key={b.id} className="rec-linha" onClick={() => router.push(`/dashboard/reservas/${b.id}`)}>
            <div className="rec-avatar" style={{ backgroundColor: `${cab.cor}24`, color: cab.cor }}>
              {nome.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</span>
                {b.guest_phone && (
                  <button
                    onClick={(e) => handleWppClick(e, b.guest_phone)}
                    title="Chamar no WhatsApp"
                    aria-label="Chamar no WhatsApp"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--whatsapp)', padding: '2px', flexShrink: 0 }}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                    </svg>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: cab.cor, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cab.nome} · {ddmm(b.check_in)} → {ddmm(b.check_out)} · {noites} {noites === 1 ? 'noite' : 'noites'}
                </span>
              </div>
            </div>
            <div className="rec-direita">
              {status === 'pending' ? (
                <>
                  <StatusBadge status="pending" />
                  <button className="rec-btn rec-aprovar" onClick={(e) => handleUpdateStatus(e, b.id, 'confirmed')} disabled={updatingId === b.id}>
                    <Check size={13} /> Aprovar
                  </button>
                  <button className="rec-btn rec-recusar" onClick={(e) => handleUpdateStatus(e, b.id, 'cancelled')} disabled={updatingId === b.id}>
                    <X size={13} /> Recusar
                  </button>
                </>
              ) : (
                <StatusBadge status={status} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
