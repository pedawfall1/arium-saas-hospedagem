"use client"

import { useState, useEffect } from "react"
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

  const sortedProperties = [...properties].sort((a: any, b: any) => {
    const doceId = '5be242bc-103f-4488-a9cc-fa8c240579ca'
    if (a.id === doceId) return -1
    if (b.id === doceId) return 1
    return 0
  })
  
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [filterProperty, setFilterProperty] = useState<string>(sortedProperties[0]?.id || '')
  const [blockData, setBlockData] = useState({ date: '', property_id: filterProperty, reason: '', guest_name: '' })
  const [loading, setLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'grid'|'list'>('grid')
  const [editingBlock, setEditingBlock] = useState<any>(null)
  const [editData, setEditData] = useState({ reason: '', guest_name: '' })

  useEffect(() => {
    setBlockData(prev => ({ ...prev, property_id: filterProperty }))
  }, [filterProperty])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const getDayInfo = (date: Date) => {
    const dayBookings = bookings.filter((b: any) => {
      if (b.status === 'cancelled') return false
      if (filterProperty && b.property_id !== filterProperty) return false
      const formattedDay = format(date, 'yyyy-MM-dd')
      return formattedDay >= b.check_in && formattedDay < b.check_out
    })
    
    const formattedDate = format(date, 'yyyy-MM-dd')
    const dayBlocks = blockedDates.filter((b: any) => 
      b.date === formattedDate && (!filterProperty || b.property_id === filterProperty)
    )
    
    return { bookings: dayBookings, blocks: dayBlocks }
  }

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('blocked_dates').insert([{
      property_id: blockData.property_id,
      date: blockData.date,
      reason: blockData.reason || null,
      guest_name: blockData.guest_name || null,
    }]).select()
    console.log('Insert result:', data, error)
    if (error) {
      alert('Erro: ' + error.message)
    } else {
      setShowBlockForm(false)
      setBlockData({ date: '', property_id: filterProperty, reason: '', guest_name: '' })
      router.refresh()
    }
    setLoading(false)
  }

  const handleUnblock = async (id: string) => {
    if (!confirm('Deseja realmente desbloquear esta data?')) return
    setLoading(true)
    await supabase.from('blocked_dates').delete().eq('id', id)
    setLoading(false)
    setSelectedDay(null)
    router.refresh()
  }

  const handleEditBlock = async (id: string) => {
    setLoading(true)
    const { error } = await supabase
      .from('blocked_dates')
      .update({
        reason: editData.reason || null,
        guest_name: editData.guest_name || null,
      })
      .eq('id', id)
    if (error) {
      alert('Erro: ' + error.message)
    } else {
      setEditingBlock(null)
      router.refresh()
    }
    setLoading(false)
  }

  const propertyIndex = (pid: string) => sortedProperties.findIndex((p: any) => p.id === pid)

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
            zIndex: 50, width: '90%', maxWidth: '380px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
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
                  {sortedProperties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>
                  Nome do hóspede (opcional)
                </label>
                <input
                  type="text"
                  value={blockData.guest_name}
                  onChange={e => setBlockData({...blockData, guest_name: e.target.value})}
                  placeholder="Nome de quem vai reservar..."
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                />
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, textTransform: 'capitalize' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setMobileView(v => v === 'grid' ? 'list' : 'grid')} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer' }} className="md-only-hide">
              {mobileView === 'list' ? '📅 Grade' : '📋 Lista'}
            </button>
            <button 
              onClick={() => setShowBlockForm(true)}
              style={{ backgroundColor: 'var(--purple)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              + Bloquear data
            </button>
          </div>
        </div>

        {/* Property Filter Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          {sortedProperties.map((p: any, i: number) => (
            <button key={p.id} onClick={() => setFilterProperty(p.id)} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', backgroundColor: filterProperty === p.id ? (i === 0 ? 'rgba(124,58,237,0.2)' : 'rgba(249,115,22,0.2)') : 'var(--bg)', color: filterProperty === p.id ? (i === 0 ? 'var(--accent)' : '#fb923c') : 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {p.name}
            </button>
          ))}
        </div>

        {/* Weekday header row */}
        <div className={`cal-grid-wrapper${mobileView === 'list' ? ' mobile-list' : ''}`} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))

            if (!isCurrentMonth) {
              return (
                <div
                  key={day.toISOString()}
                  style={{
                    minHeight: 'clamp(48px, 10vw, 100px)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    opacity: 0.15,
                  }}
                />
              )
            }

            const dateStr = format(day, 'yyyy-MM-dd')
            
            // Determine styling status
            const booking = bookings.find((b: any) =>
              b.status !== 'cancelled' &&
              b.property_id === filterProperty &&
              day >= parseISO(b.check_in) &&
              day < parseISO(b.check_out)
            )
            const isBlocked = blockedDates.some((d: any) =>
              isSameDay(parseISO(d.date), day) && d.property_id === filterProperty
            )

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
                onClick={() => {
                  if (dayBookings.length === 0 && blocks.length === 0) {
                    // Empty day — open block form pre-filled
                    setBlockData(prev => ({
                      ...prev,
                      date: dateStr,
                      property_id: filterProperty,
                    }))
                    setShowBlockForm(true)
                  } else {
                    // Has data — show detail panel as before
                    setSelectedDay({ dateStr, dayBookings, blocks })
                  }
                }}
                className="cal-cell"
                style={{
                  minHeight: 'clamp(48px, 10vw, 100px)', padding: '10px 12px',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.15s',
                  backgroundColor: cellBackgroundColor,
                  opacity: isPast ? 0.4 : 1,
                  filter: isPast ? 'grayscale(0.4)' : 'none'
                }}
              >
                {isTodayDay ? (
                  <span className="cal-cell-number" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--purple)', color: 'white', fontWeight: 700, fontSize: '13px' }}>
                    {format(day, 'd')}
                  </span>
                ) : (
                  <span className="cal-cell-number" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)', opacity: isPast ? 0.5 : 1 }}>
                    {format(day, 'd')}
                  </span>
                )}
                
                {booking && (filterProperty === 'all' || booking.property_id === filterProperty) && (
                  <div className="cal-pill" style={{
                    position: 'absolute', bottom: '8px', left: '8px', right: '8px',
                    padding: '2px 6px', borderRadius: '4px', fontSize: 'clamp(9px, 2vw, 11px)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    backgroundColor: propertyIndex(booking.property_id) === 0 ? 'rgba(124,58,237,0.3)' : 'rgba(249,115,22,0.3)',
                    color: propertyIndex(booking.property_id) === 0 ? 'var(--accent)' : '#fb923c',
                  }}>
                    {booking.guest_name}
                  </div>
                )}
                
                {!booking && isBlocked && blocks.some((b: any) => filterProperty === 'all' || b.property_id === filterProperty) && (
                  <div className="cal-pill" style={{
                    position: 'absolute', bottom: '8px', left: '8px', right: '8px',
                    padding: '2px 6px', borderRadius: '4px', fontSize: 'clamp(9px, 2vw, 11px)',
                    backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171',
                    textAlign: 'center', overflow: 'hidden',
                    opacity: isPast ? 0.4 : 1,
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

        {/* List View (Mobile) */}
        <div className="cal-list-view" style={{ display: mobileView === 'list' ? 'block' : 'none' }}>
          {calendarDays.filter(d => isSameMonth(d, currentMonth)).map(day => {
            const { bookings: dayBookings, blocks } = getDayInfo(day)
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
            if (dayBookings.length === 0 && blocks.length === 0) return null
            if (filterProperty !== 'all' && !dayBookings.some((b: any) => b.property_id === filterProperty) && !blocks.some((b: any) => b.property_id === filterProperty)) return null
            return (
              <div key={day.toISOString()} onClick={() => setSelectedDay({ dateStr: format(day, 'yyyy-MM-dd'), dayBookings, blocks })}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', borderLeft: blocks.length > 0 ? '3px solid #ef4444' : `3px solid ${propertyIndex(dayBookings[0]?.property_id) === 0 ? '#7c3aed' : '#f97b00'}`, opacity: isPast ? 0.4 : 1 }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--purple-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'var(--accent)', fontSize: '16px', fontWeight: 700 }}>{format(day, 'd')}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '9px', textTransform: 'uppercase' }}>{format(day, 'EEE', { locale: ptBR })}</span>
                </div>
                <div style={{ flex: 1 }}>
                  {dayBookings.map((b: any) => <p key={b.id} style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>{b.guest_name}</p>)}
                  {blocks.map((b: any) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {b.guest_name && (
                          <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>{b.guest_name}</p>
                        )}
                        <p style={{ color: '#f87171', fontSize: '12px' }}>{b.reason || 'Bloqueado'}{isPast && (
                          <span style={{ fontSize: '10px', color: 'var(--muted)', backgroundColor: 'var(--bg)', borderRadius: '4px', padding: '1px 5px', marginLeft: '6px' }}>
                            passado
                          </span>
                        )}</p>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingBlock(b.id)
                          setEditData({ reason: b.reason || '', guest_name: b.guest_name || '' })
                          setSelectedDay({ dateStr: format(day, 'yyyy-MM-dd'), dayBookings: [], blocks: [b] })
                        }}
                        style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', flexShrink: 0, paddingLeft: '8px' }}
                      >
                        ✏️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>



      </div>

      {/* Inline Detail Panel */}
      {selectedDay && (selectedDay.dayBookings.length > 0 || selectedDay.blocks.length > 0) && (
        <div className="mt-6 border rounded-xl p-6 relative" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', marginTop: '24px' }}>
          <button
            onClick={() => setSelectedDay(null)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '4px', lineHeight: 1,
            }}
          >
            <X size={20} />
          </button>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)', marginBottom: '20px' }}>
            Data: {format(parseISO(selectedDay.dateStr), 'dd/MM/yyyy')}
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {selectedDay.dayBookings.map((b: any) => (
              <div key={b.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-lg" style={{ color: 'var(--text)' }}>{b.guest_name}</p>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {b.properties?.name || sortedProperties.find((p:any) => p.id === b.property_id)?.name}
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
              <div key={block.id} style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '12px', padding: '16px' }}>
                
                {editingBlock === block.id ? (
                  // EDIT MODE
                  <>
                    <p style={{ color: '#f87171', fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>Editar bloqueio</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        value={editData.guest_name}
                        onChange={e => setEditData(prev => ({ ...prev, guest_name: e.target.value }))}
                        placeholder="Nome do hóspede..."
                        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <input
                        type="text"
                        value={editData.reason}
                        onChange={e => setEditData(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Motivo..."
                        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setEditingBlock(null)}
                        style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleEditBlock(block.id)}
                        disabled={loading}
                        style={{ flex: 1, padding: '8px', backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                      >
                        {loading ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </>
                ) : (
                  // VIEW MODE
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ color: '#f87171', fontWeight: 600, fontSize: '15px' }}>Data Bloqueada</p>
                      <button
                        onClick={() => {
                          setEditingBlock(block.id)
                          setEditData({ reason: block.reason || '', guest_name: block.guest_name || '' })
                        }}
                        style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>
                      Cabana: {properties.find((p: any) => p.id === block.property_id)?.name}
                    </p>
                    {block.guest_name && (
                      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Hóspede: {block.guest_name}</p>
                    )}
                    {block.reason && (
                      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>Motivo: {block.reason}</p>
                    )}
                    <button
                      onClick={() => handleUnblock(block.id)}
                      disabled={loading}
                      style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginTop: (!block.guest_name && !block.reason) ? '12px' : '0' }}
                    >
                      {loading ? 'Processando...' : '🔓 Desbloquear esta data'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
