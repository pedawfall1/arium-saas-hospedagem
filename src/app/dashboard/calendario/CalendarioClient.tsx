"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ChevronLeft, ChevronRight, Ban, X } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { StatusBadge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function CalendarioClient({ properties, bookings, blockedDates, tenantName }: any) {
  const router = useRouter()
  const supabase = createClient()
  
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockData, setBlockData] = useState({ date: '', property_id: properties[0]?.id || '', reason: '' })
  const [loading, setLoading] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const getDayInfo = (date: Date) => {
    const dayBookings = bookings.filter((b: any) => {
      if (b.status === 'cancelled') return false
      const formattedDay = format(date, 'yyyy-MM-dd')
      return formattedDay >= b.check_in && formattedDay < b.check_out
    })
    
    const formattedDate = format(date, 'yyyy-MM-dd')
    const dayBlocks = blockedDates.filter((b: any) => b.date === formattedDate)
    
    return { bookings: dayBookings, blocks: dayBlocks }
  }

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.from('blocked_dates').insert([blockData])
    setLoading(false)
    setShowBlockForm(false)
    router.refresh()
  }

  const handleUnblock = async (id: string) => {
    if (!confirm('Deseja realmente desbloquear esta data?')) return
    setLoading(true)
    await supabase.from('blocked_dates').delete().eq('id', id)
    setLoading(false)
    setSelectedDay(null)
    router.refresh()
  }

  const propertyIndex = (pid: string) => properties.findIndex((p: any) => p.id === pid)

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .cal-cell:hover { background-color: var(--purple-dim) !important; }
      `}</style>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
        Calendário de Ocupação
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
        Acompanhe a disponibilidade das cabanas
      </p>

      {showBlockForm && (
        <>
          <div
            onClick={() => setShowBlockForm(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50, width: '100%', maxWidth: '440px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px', padding: '28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
              Bloquear data
            </h3>
            <form onSubmit={handleBlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Cabana</label>
                <select 
                  required
                  value={blockData.property_id}
                  onChange={e => setBlockData({...blockData, property_id: e.target.value})}
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }}
                >
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Data</label>
                <input 
                  type="date" required
                  value={blockData.date}
                  onChange={e => setBlockData({...blockData, date: e.target.value})}
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Motivo (opcional)</label>
                <input 
                  type="text"
                  value={blockData.reason}
                  onChange={e => setBlockData({...blockData, reason: e.target.value})}
                  placeholder="Manutenção, etc..."
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowBlockForm(false)} style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', padding: '10px 16px', flex: 1, cursor: 'pointer', fontWeight: 500 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} style={{ backgroundColor: 'var(--purple)', border: 'none', color: 'white', borderRadius: '8px', padding: '10px 16px', flex: 1, cursor: 'pointer', fontWeight: 600 }}>
                  {loading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Calendar container */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        
        {/* Month header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, textTransform: 'capitalize' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                &lt;
              </button>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                &gt;
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowBlockForm(true)}
            style={{ backgroundColor: 'var(--purple)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Bloquear data
          </button>
        </div>

        {/* Weekday header row */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: '340px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} style={{ padding: '12px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
            </div>

        {/* Day cells grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarDays.map((day) => {
            const { bookings: dayBookings, blocks } = getDayInfo(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDay = isToday(day)

            const dateStr = format(day, 'yyyy-MM-dd')
            
            // Determine styling status
            const booking = bookings.find((b: any) =>
              b.status !== 'cancelled' &&
              day >= parseISO(b.check_in) &&
              day < parseISO(b.check_out)
            )
            const isBlocked = blockedDates.some((d: any) => isSameDay(parseISO(d.date), day))

            const cellBackgroundColor = booking
              ? propertyIndex(booking.property_id) === 0
                ? 'rgba(124,58,237,0.15)'
                : 'rgba(249,115,22,0.12)'
              : isBlocked
                ? 'rgba(239,68,68,0.08)'
                : 'transparent'

            return (
              <div 
                key={day.toISOString()} 
                onClick={() => setSelectedDay({ dateStr, dayBookings, blocks })}
                className="cal-cell"
                style={{ 
                  minHeight: '100px', padding: '10px 12px',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.15s',
                  backgroundColor: cellBackgroundColor,
                  opacity: isCurrentMonth ? 1 : 0.3
                }}
              >
                {isTodayDay ? (
                  <span className="cal-cell-number" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--purple)', color: 'white', fontWeight: 700, fontSize: '13px' }}>
                    {format(day, 'd')}
                  </span>
                ) : (
                  <span className="cal-cell-number" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>
                    {format(day, 'd')}
                  </span>
                )}
                
                {booking && (
                  <div className="cal-pill" style={{
                    position: 'absolute', bottom: '8px', left: '8px', right: '8px',
                    padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    backgroundColor: propertyIndex(booking.property_id) === 0 ? 'rgba(124,58,237,0.3)' : 'rgba(249,115,22,0.3)',
                    color: propertyIndex(booking.property_id) === 0 ? 'var(--accent)' : '#fb923c',
                  }}>
                    {booking.guest_name}
                  </div>
                )}
                
                {!booking && isBlocked && (
                  <div className="cal-pill" style={{
                    position: 'absolute', bottom: '8px', left: '8px', right: '8px',
                    padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                    backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171',
                    textAlign: 'center',
                  }}>
                    Bloqueado
                  </div>
                )}
              </div>
            )
          })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          {properties.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#7c3aed' }} />
              <span>{properties[0]?.name}</span>
            </div>
          )}
          {properties.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#f97b00' }} />
              <span>{properties[1]?.name}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#ef4444' }} />
            <span>Bloqueado</span>
          </div>
        </div>

      </div>

      {/* Inline Detail Panel */}
      {selectedDay && (selectedDay.dayBookings.length > 0 || selectedDay.blocks.length > 0) && (
        <div className="mt-6 border rounded-xl p-6 relative" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
          <button 
            onClick={() => setSelectedDay(null)}
            className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>
            Foco: {format(parseISO(selectedDay.dateStr), 'dd/MM/yyyy')}
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {selectedDay.dayBookings.map((b: any) => (
              <div key={b.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-lg" style={{ color: 'var(--text)' }}>{b.guest_name}</p>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {b.properties?.name || properties.find((p:any) => p.id === b.property_id)?.name}
                </p>
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                  Entra: {formatDate(b.check_in)} | Sai: {formatDate(b.check_out)}
                </p>
                <Button onClick={() => router.push(`/dashboard/reservas/${b.id}`)} variant="outline" size="sm" className="w-full">
                  Ver Reserva Completa
                </Button>
              </div>
            ))}

            {selectedDay.blocks.map((block: any) => (
              <div key={block.id} className="border border-red-500/20 bg-red-500/10 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-red-500 text-lg">Data Bloqueada</p>
                  <Ban className="text-red-500 opacity-50" size={20} />
                </div>
                <p className="text-sm mb-1 text-red-400">
                  Cabana: {properties.find((p:any) => p.id === block.property_id)?.name}
                </p>
                {block.reason && <p className="text-sm text-red-400 mb-3 block">Motivo: {block.reason}</p>}
                
                <Button onClick={() => handleUnblock(block.id)} variant="danger" size="sm" className="w-full mt-2" disabled={loading}>
                  {loading ? 'Processando...' : 'Desbloquear Data'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
