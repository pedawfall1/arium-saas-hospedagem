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

export function CalendarioClient({ properties, bookings, blockedDates, holidays, tenantName }: any) {
  // Add CSS for mobile-only button
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media (min-width: 640px) {
        .mobile-only-btn {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])
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
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)
  const [rangeMode, setRangeMode] = useState(false)
  const [calendarMode, setCalendarMode] = useState<'split' | 'unified'>('split')
  const [rangeReason, setRangeReason] = useState('')
  const [rangeGuestName, setRangeGuestName] = useState('')

  // Unified button styles
  const headerBtnStyle = {
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--muted)',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  }

  const headerBtnActiveStyle = {
    ...headerBtnStyle,
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    fontWeight: 600,
    border: '1px solid var(--border)',
  }

  const primaryBtnStyle = {
    padding: '7px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'var(--purple)',
    color: 'white',
    whiteSpace: 'nowrap' as const,
  }

  useEffect(() => {
    setBlockData(prev => ({ ...prev, property_id: filterProperty }))
  }, [filterProperty])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const getDayInfo = (date: Date, propertyId?: string) => {
    const dayBookings = bookings.filter((b: any) => {
      if (b.status === 'cancelled') return false
      const targetProperty = propertyId || filterProperty
      if (targetProperty && b.property_id !== targetProperty) return false
      const formattedDay = format(date, 'yyyy-MM-dd')
      return formattedDay >= b.check_in && formattedDay < b.check_out
    })

    const formattedDate = format(date, 'yyyy-MM-dd')
    const dayBlocks = blockedDates.filter((b: any) =>
      b.date === formattedDate && (!propertyId || b.property_id === propertyId)
    )

    return { bookings: dayBookings, blocks: dayBlocks }
  }

  const getPriceForDay = (date: Date, propertyId: string): number | null => {
    const property = sortedProperties.find((p: any) => p.id === propertyId)
    if (!property) return null

    const dateStr = format(date, 'yyyy-MM-dd')

    // Check holiday pricing first
    const holiday = holidays?.find((h: any) =>
      h.property_id === propertyId &&
      dateStr >= h.date_from &&
      dateStr <= h.date_to
    )
    if (holiday?.price) return Number(holiday.price)

    // Weekend = friday(5) or saturday(6)
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6

    return isWeekend
      ? Number(property.base_price_weekend)
      : Number(property.base_price_weekday)
  }

  const getCabinColors = (index: number) => {
    if (index === 0) return {
      // Doce Encanto — red for blocked
      booking: 'rgba(249,123,0,0.08)',
      bookingPill: '#f97b0022',
      bookingText: '#f97b00',
      blocked: 'rgba(239,68,68,0.06)',
      blockedPill: '#ef444422',
      blockedText: '#ef4444',
      accent: '#f97b00',
    }
    return {
      // Vale das Flores — yellow for blocked
      booking: 'rgba(124,58,237,0.08)',
      bookingPill: '#7c3aed22',
      bookingText: '#7c3aed',
      blocked: 'rgba(234,179,8,0.06)',
      blockedPill: '#eab30822',
      blockedText: '#eab308',
      accent: '#7c3aed',
    }
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
        
        {/* Month header - Row 1 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Left: month title + arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700, textTransform: 'capitalize' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>

          {/* Right: Separado / Unificado toggle only */}
          {sortedProperties.length === 2 && (
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '4px' }}>
              <button
                onClick={() => setCalendarMode('split')}
                style={calendarMode === 'split' ? headerBtnActiveStyle : headerBtnStyle}
              >
                Separado
              </button>
              <button
                onClick={() => setCalendarMode('unified')}
                style={calendarMode === 'unified' ? headerBtnActiveStyle : headerBtnStyle}
              >
                Unificado
              </button>
            </div>
          )}
        </div>

        {/* Month header - Row 2 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          {/* Lista toggle — mobile only */}
          <button onClick={() => setMobileView(v => v === 'grid' ? 'list' : 'grid')} className="mobile-only-btn" style={headerBtnStyle}>
            {mobileView === 'list' ? '📅 Grade' : '📋 Lista'}
          </button>

          {/* Selecionar período */}
          <button
            onClick={() => setRangeMode(!rangeMode)}
            style={rangeMode ? { ...headerBtnStyle, backgroundColor: 'var(--purple)', color: 'white', border: 'none', fontWeight: 600 } : headerBtnStyle}
          >
            {rangeMode ? '✕ Cancelar' : 'Selecionar período'}
          </button>

          {/* + Bloquear data */}
          <button onClick={() => setShowBlockForm(true)} style={primaryBtnStyle}>
            + Bloquear data
          </button>
        </div>

        {/* Property Filter Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          {sortedProperties.map((p: any, i: number) => {
            const cabinColor = i === 0 ? '#f97b00' : '#7c3aed'
            return (
              <button key={p.id} onClick={() => setFilterProperty(p.id)} style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: filterProperty === p.id ? 600 : 500, border: '1px solid transparent', backgroundColor: filterProperty === p.id ? `${cabinColor}20` : 'transparent', color: filterProperty === p.id ? cabinColor : 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s' }}>
                {p.name}
              </button>
            )
          })}
        </div>

        {/* Range Selection Panel */}
        {rangeMode && rangeStart && rangeEnd && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(124,58,237,0.05)' }}>
            <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Bloquear de {formatDate(rangeStart)} até {formatDate(rangeEnd)} para {sortedProperties.find((p: any) => p.id === filterProperty)?.name}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                value={rangeGuestName}
                onChange={e => setRangeGuestName(e.target.value)}
                placeholder="Nome do hóspede (opcional)"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
              />
              <input
                type="text"
                value={rangeReason}
                onChange={e => setRangeReason(e.target.value)}
                placeholder="Motivo (opcional)"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={async () => {
                  setLoading(true)
                  const start = new Date(rangeStart)
                  const end = new Date(rangeEnd)
                  const dates = []
                  let current = start
                  while (current <= end) {
                    dates.push(format(current, 'yyyy-MM-dd'))
                    current = new Date(current.getTime() + 86400000)
                  }
                  const inserts = dates.map(date => ({
                    property_id: filterProperty,
                    date,
                    reason: rangeReason || null,
                    guest_name: rangeGuestName || null,
                  }))
                  const { error } = await supabase.from('blocked_dates').insert(inserts)
                  if (error) {
                    alert('Erro: ' + error.message)
                  } else {
                    setRangeStart(null)
                    setRangeEnd(null)
                    setRangeMode(false)
                    setRangeReason('')
                    setRangeGuestName('')
                    router.refresh()
                  }
                  setLoading(false)
                }}
                disabled={loading}
                style={{ flex: 1, padding: '10px 16px', backgroundColor: 'var(--purple)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Processando...' : 'Confirmar bloqueio'}
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Deseja realmente desbloquear este período?')) return
                  setLoading(true)
                  const start = new Date(rangeStart)
                  const end = new Date(rangeEnd)
                  const dates = []
                  let current = start
                  while (current <= end) {
                    dates.push(format(current, 'yyyy-MM-dd'))
                    current = new Date(current.getTime() + 86400000)
                  }
                  const { error } = await supabase
                    .from('blocked_dates')
                    .delete()
                    .in('date', dates)
                    .eq('property_id', filterProperty)
                  if (error) {
                    alert('Erro: ' + error.message)
                  } else {
                    setRangeStart(null)
                    setRangeEnd(null)
                    setRangeMode(false)
                    setRangeReason('')
                    setRangeGuestName('')
                    router.refresh()
                  }
                  setLoading(false)
                }}
                disabled={loading}
                style={{ flex: 1, padding: '10px 16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontWeight: 600, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Processando...' : 'Desbloquear período'}
              </button>
              <button
                onClick={() => { setRangeStart(null); setRangeEnd(null); setRangeMode(false); setRangeReason(''); setRangeGuestName('') }}
                style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Weekday header row */}
        <div className={`cal-grid-wrapper${mobileView === 'list' ? ' mobile-list' : ''}`} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: '100%' }}>
            {calendarMode === 'split' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border)' }}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} style={{ padding: '10px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Day cells grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
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
                ? 'rgba(249,123,0,0.08)'
                : 'rgba(124,58,237,0.08)'
              : isBlocked
                ? (propertyIndex(filterProperty) === 0 ? 'rgba(239,68,68,0.06)' : 'rgba(234,179,8,0.06)')
                : 'transparent'

            // Range selection highlighting
            const isInRange = rangeMode && rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd
            const isRangeStart = rangeMode && dateStr === rangeStart
            const isRangeEnd = rangeMode && dateStr === rangeEnd

            // Cross-cabin availability check
            const otherProperty = sortedProperties.find((p: any) => p.id !== filterProperty)
            const otherIsBlocked = otherProperty
              ? blockedDates.some((d: any) =>
                  isSameDay(parseISO(d.date), day) && d.property_id === otherProperty.id
                )
              : false
            const otherHasBooking = otherProperty
              ? bookings.some((b: any) =>
                  b.status !== 'cancelled' &&
                  b.property_id === otherProperty.id &&
                  day >= parseISO(b.check_in) &&
                  day < parseISO(b.check_out)
                )
              : false
            const otherIsOccupied = otherIsBlocked || otherHasBooking

            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  // Range mode takes priority — never open detail panel or block form
                  if (rangeMode) {
                    if (!rangeStart) {
                      setRangeStart(dateStr)
                    } else if (!rangeEnd) {
                      setRangeEnd(dateStr)
                    } else {
                      // Reset and start new range
                      setRangeStart(dateStr)
                      setRangeEnd(null)
                    }
                    return // Stop here — don't open anything else
                  }

                  // Normal mode (rangeMode === false)
                  if (dayBookings.length === 0 && blocks.length === 0) {
                    setBlockData(prev => ({ ...prev, date: dateStr, property_id: filterProperty }))
                    setShowBlockForm(true)
                  } else {
                    setSelectedDay({ dateStr, dayBookings, blocks })
                  }
                }}
                className="cal-cell"
                style={{
                  minHeight: 'clamp(64px, 13vw, 110px)', padding: '6px 4px',
                  minWidth: 0,
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.15s',
                  backgroundColor: cellBackgroundColor,
                  opacity: isPast ? 0.35 : 1,
                  filter: isPast ? 'grayscale(0.35)' : 'none',
                  ...(isInRange && { backgroundColor: 'rgba(124,58,237,0.2)' }),
                  ...(isRangeStart && { boxShadow: 'inset 0 0 0 2px #7c3aed' }),
                  ...(isRangeEnd && { boxShadow: 'inset 0 0 0 2px #7c3aed' }),
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  minHeight: 'clamp(64px, 13vw, 110px)',
                }}>
                  {/* Top: day number + cross-cabin tag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {isTodayDay ? (
                      <span className="cal-cell-number" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--purple)', color: 'white', fontWeight: 700, fontSize: '12px' }}>
                        {format(day, 'd')}
                      </span>
                    ) : (
                      <span className="cal-cell-number" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', opacity: isPast ? 0.35 : 1 }}>
                        {format(day, 'd')}
                      </span>
                    )}

                    {isCurrentMonth && otherProperty && otherIsOccupied && (
                      <div className="other-cabin-tag" title={otherProperty.name} style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        lineHeight: '14px',
                        backgroundColor: propertyIndex(otherProperty.id) === 0 ? '#ef444422' : '#eab30822',
                        color: propertyIndex(otherProperty.id) === 0 ? '#ef4444' : '#eab308',
                        border: `1px solid ${propertyIndex(otherProperty.id) === 0 ? '#ef444444' : '#eab30844'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {otherProperty.name.replace('Cabana ', '').charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Middle: price */}
                  {(() => {
                    const price = getPriceForDay(day, filterProperty)
                    if (!price || !isCurrentMonth) return null
                    return (
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--muted)',
                        marginTop: '4px',
                        marginBottom: '4px',
                        opacity: isPast ? 0.35 : 1,
                      }}>
                        R$ {price.toLocaleString('pt-BR')}
                      </div>
                    )
                  })()}

                  {/* Bottom: booking or blocked pill */}
                  {booking && (filterProperty === 'all' || booking.property_id === filterProperty) && (
                    <div style={{
                      marginTop: '6px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: 'clamp(8px, 1.8vw, 11px)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      backgroundColor: propertyIndex(booking.property_id) === 0 ? 'rgba(124,58,237,0.3)' : 'rgba(249,115,22,0.3)',
                      color: propertyIndex(booking.property_id) === 0 ? 'var(--accent)' : '#fb923c',
                    }}>
                      {booking.guest_name}
                    </div>
                  )}

                  {!booking && isBlocked && blocks.some((b: any) => filterProperty === 'all' || b.property_id === filterProperty) && (
                    <div style={{
                      marginTop: '6px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: 'clamp(8px, 1.8vw, 11px)',
                      backgroundColor: propertyIndex(filterProperty) === 0 ? '#ef444422' : '#eab30822',
                      color: propertyIndex(filterProperty) === 0 ? '#ef4444' : '#eab308',
                      border: `1px solid ${propertyIndex(filterProperty) === 0 ? '#ef444444' : '#eab30844'}`,
                      textAlign: 'center',
                      overflow: 'hidden',
                      opacity: isPast ? 0.35 : 1,
                    }}>
                      Bloqueado
                    </div>
                  )}
                </div>
              </div>
            )
          })}
                </div>
              </>
            ) : (
              // Unified mode - dual calendar
              <div style={{ display: 'flex', gap: '16px', padding: '12px', flexWrap: 'wrap' }}>
                {sortedProperties.map((property: any, idx: number) => {
                  const colors = getCabinColors(idx)
                  return (
                    <div key={property.id} style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        borderTop: `3px solid ${idx === 0 ? '#f97b00' : '#7c3aed'}`,
                        borderRadius: '8px 8px 0 0',
                        backgroundColor: idx === 0 ? 'rgba(249,123,0,0.05)' : 'rgba(124,58,237,0.05)',
                      }}>
                        <span style={{ color: idx === 0 ? '#f97b00' : '#7c3aed', fontWeight: 700, fontSize: '14px' }}>
                          {idx === 0 ? '🟠' : '🟣'} {property.name}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border)' }}>
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} style={{ padding: '10px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {day}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                        {calendarDays.map((day) => {
                          const { bookings: dayBookings, blocks } = getDayInfo(day, property.id)
                          const isCurrentMonth = isSameMonth(day, currentMonth)
                          const isTodayDay = isToday(day)
                          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
                          const dateStr = format(day, 'yyyy-MM-dd')

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

                          const booking = bookings.find((b: any) =>
                            b.status !== 'cancelled' &&
                            b.property_id === property.id &&
                            day >= parseISO(b.check_in) &&
                            day < parseISO(b.check_out)
                          )
                          const isBlocked = blockedDates.some((d: any) =>
                            isSameDay(parseISO(d.date), day) && d.property_id === property.id
                          )

                          const cellBackgroundColor = booking
                            ? colors.booking
                            : isBlocked
                              ? colors.blocked
                              : 'transparent'

                          const isInRange = rangeMode && rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd
                          const isRangeStart = rangeMode && dateStr === rangeStart
                          const isRangeEnd = rangeMode && dateStr === rangeEnd

                        return (
                          <div
                            key={day.toISOString()}
                            onClick={() => {
                              // Range mode takes priority — never open detail panel or block form
                              if (rangeMode) {
                                if (!rangeStart) {
                                  setRangeStart(dateStr)
                                  setFilterProperty(property.id)
                                } else if (!rangeEnd) {
                                  setRangeEnd(dateStr)
                                } else {
                                  // Reset and start new range
                                  setRangeStart(dateStr)
                                  setRangeEnd(null)
                                }
                                return // Stop here — don't open anything else
                              }

                              // Normal mode (rangeMode === false)
                              if (dayBookings.length === 0 && blocks.length === 0) {
                                setBlockData(prev => ({
                                  ...prev,
                                  date: dateStr,
                                  property_id: property.id,
                                }))
                                setShowBlockForm(true)
                              } else {
                                setSelectedDay({ dateStr, dayBookings, blocks })
                              }
                            }}
                            className="cal-cell"
                            style={{
                              minHeight: 'clamp(64px, 13vw, 110px)', padding: '8px',
                              minWidth: 0,
                              borderRight: '1px solid var(--border)',
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer', position: 'relative',
                              transition: 'background 0.15s',
                              backgroundColor: cellBackgroundColor,
                              opacity: isPast ? 0.35 : 1,
                              filter: isPast ? 'grayscale(0.35)' : 'none',
                              ...(isInRange && { backgroundColor: 'rgba(124,58,237,0.2)' }),
                              ...(isRangeStart && { boxShadow: 'inset 0 0 0 2px #7c3aed' }),
                              ...(isRangeEnd && { boxShadow: 'inset 0 0 0 2px #7c3aed' }),
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              height: '100%',
                              minHeight: 'clamp(64px, 13vw, 110px)',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                {isTodayDay ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: idx === 0 ? '#f97b00' : '#7c3aed', color: 'white', fontWeight: 700, fontSize: '12px' }}>
                                    {format(day, 'd')}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', opacity: isPast ? 0.35 : 1 }}>
                                    {format(day, 'd')}
                                  </span>
                                )}
                              </div>
                              
                              {(() => {
                                const price = getPriceForDay(day, property.id)
                                if (!price || !isCurrentMonth) return null
                                return (
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: 'var(--muted)',
                                    marginTop: '4px',
                                    marginBottom: '4px',
                                    opacity: isPast ? 0.35 : 1,
                                  }}>
                                    R$ {price.toLocaleString('pt-BR')}
                                  </div>
                                )
                              })()}

                              {booking && (
                                <div style={{
                                  marginTop: '6px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: 'clamp(8px, 1.8vw, 11px)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  backgroundColor: colors.bookingPill,
                                  color: colors.bookingText,
                                }}>
                                  {booking.guest_name}
                                </div>
                              )}

                              {!booking && isBlocked && (
                                <div style={{
                                  marginTop: '6px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: 'clamp(8px, 1.8vw, 11px)',
                                  backgroundColor: colors.blockedPill, color: colors.blockedText,
                                  border: `1px solid ${colors.accent}44`,
                                  textAlign: 'center',
                                  overflow: 'hidden',
                                  opacity: isPast ? 0.35 : 1,
                                }}>
                                  Bloqueado
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
                })}
              </div>
            )}
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
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', borderLeft: blocks.length > 0 ? '3px solid #ef4444' : `3px solid ${propertyIndex(dayBookings[0]?.property_id) === 0 ? '#7c3aed' : '#f97b00'}`, opacity: isPast ? 0.4 : 1 }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--purple-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'var(--accent)', fontSize: '18px', fontWeight: 700 }}>{format(day, 'd')}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '9px', textTransform: 'uppercase' }}>{format(day, 'EEE', { locale: ptBR })}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {dayBookings.map((b: any) => <p key={b.id} style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{b.guest_name}</p>)}
                  {blocks.map((b: any) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        {b.guest_name && (
                          <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{b.guest_name}</p>
                        )}
                        <p style={{ color: '#f87171', fontSize: '13px' }}>{b.reason || 'Bloqueado'}{isPast && (
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
        <div className="mt-6 rounded-xl p-6 relative" style={{ backgroundColor: 'var(--bg)', border: 'none', marginTop: '24px' }}>
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
