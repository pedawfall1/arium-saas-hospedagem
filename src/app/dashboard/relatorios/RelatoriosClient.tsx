"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Banknote, CalendarCheck, Info, BarChart } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { startOfMonth, endOfMonth, parseISO, format, differenceInDays, subMonths, isSameMonth } from "date-fns"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 500 }}>{label}</h3>
        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color="var(--accent)" />
        </div>
      </div>
      <p style={{ color, fontSize: '36px', fontWeight: 800 }}>{value}</p>
    </div>
  )
}

export function RelatoriosClient({ bookings, properties }: { bookings: any[], properties: any[] }) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Add custom styles for date picker
    const style = document.createElement('style')
    style.textContent = `
      .react-datepicker-popper {
        z-index: 9999 !important;
      }
      .react-datepicker-wrapper {
        width: 100%;
        display: block;
      }
      .react-datepicker__triangle {
        display: none !important;
      }
      .react-datepicker {
        background-color: var(--surface) !important;
        border: 1px solid var(--border) !important;
        border-radius: 12px !important;
        font-family: inherit !important;
      }
      @media (max-width: 480px) {
        .react-datepicker {
          font-size: 0.9em !important;
        }
      }
      .react-datepicker__header {
        background-color: var(--surface) !important;
        border-bottom: 1px solid var(--border) !important;
        border-radius: 12px 12px 0 0 !important;
        padding: 10px !important;
      }
      .react-datepicker__current-month {
        color: var(--text) !important;
        font-weight: 600 !important;
      }
      .react-datepicker__day-name {
        color: var(--muted) !important;
        font-size: 12px !important;
      }
      .react-datepicker__day {
        color: var(--text) !important;
        border-radius: 8px !important;
      }
      .react-datepicker__day:hover {
        background-color: var(--purple-dim) !important;
      }
      .react-datepicker__day--selected {
        background-color: var(--purple) !important;
        color: white !important;
      }
      .react-datepicker__day--keyboard-selected {
        background-color: var(--accent) !important;
        color: white !important;
      }
      .react-datepicker__day--outside-month {
        color: var(--muted) !important;
        opacity: 0.5 !important;
      }
      .react-datepicker__navigation {
        top: 10px !important;
      }
      .react-datepicker__navigation-icon::before {
        border-color: var(--text) !important;
        border-width: 2px 2px 0 0 !important;
        height: 7px !important;
        width: 7px !important;
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  const filteredBookings = bookings.filter(b => {
    return b.check_in >= startDate && b.check_in <= endDate && (b.status === "confirmed" || b.status === "checked_in" || b.status === "completed")
  })

  // Date range metrics
  const totalRevenue = filteredBookings.reduce((acc, b) => acc + (parseFloat(b.total_amount) || 0), 0)
  const depositReceived = filteredBookings.filter(b => b.payment_status === "deposit_paid" || b.payment_status === "fully_paid")
                                          .reduce((acc, b) => acc + (parseFloat(b.deposit_amount) || 0), 0)
  const pendingCheckin = filteredBookings.filter(b => b.status === "confirmed")
                                         .reduce((acc, b) => acc + ((parseFloat(b.total_amount) || 0) - (parseFloat(b.deposit_amount) || 0)), 0)
  const ticketMedio = filteredBookings.length > 0 ? totalRevenue / filteredBookings.length : 0

  // Occupancy rate calculation
  const totalDaysInPeriod = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1)

  const occupancyMap = properties.map(p => {
    const propBookings = filteredBookings.filter(b => b.property_id === p.id)
    let bookedNights = 0
    propBookings.forEach(b => {
      const checkIn = parseISO(b.check_in)
      const checkOut = parseISO(b.check_out)
      if (checkIn && checkOut && !isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
        bookedNights += Math.max(1, differenceInDays(checkOut, checkIn))
      }
    })
    const cappedNights = Math.min(bookedNights, totalDaysInPeriod)
    const rate = totalDaysInPeriod > 0 ? (cappedNights / totalDaysInPeriod) * 100 : 0
    return { name: p.name, rate: isNaN(rate) ? '0.0' : rate.toFixed(1) }
  })

  // Chart calculation - Last 6 months
  const now = new Date()
  const chartData = []
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    const mStr = format(m, 'MMM')

    const mRevenue = bookings.filter(b =>
      isSameMonth(parseISO(b.check_in), m) &&
      (b.status === "confirmed" || b.status === "checked_in" || b.status === "completed")
    ).reduce((acc, b) => acc + (parseFloat(b.total_amount) || 0), 0)

    chartData.push({ label: mStr, val: mRevenue })
  }
  
  const maxVal = Math.max(...chartData.map(d => d.val), 1000)

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
        Relatórios Financeiros
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
        Acompanhe sua receita, faturamento e estatísticas de uso.
      </p>

      {/* Date Range Card */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Período Inicial</label>
          <DatePicker
            selected={startDate ? parseISO(startDate) : null}
            onChange={(date: Date | null) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
            dateFormat="dd/MM/yyyy"
            className="date-picker-input"
            placeholderText="Selecione a data"
            customInput={
              <input
                type="text"
                value={startDate ? format(parseISO(startDate), 'dd/MM/yyyy') : ''}
                readOnly
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none', cursor: 'pointer' }}
              />
            }
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Período Final</label>
          <DatePicker
            selected={endDate ? parseISO(endDate) : null}
            onChange={(date: Date | null) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
            dateFormat="dd/MM/yyyy"
            className="date-picker-input"
            placeholderText="Selecione a data"
            customInput={
              <input
                type="text"
                value={endDate ? format(parseISO(endDate), 'dd/MM/yyyy') : ''}
                readOnly
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none', cursor: 'pointer' }}
              />
            }
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Receita Total" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="#f97b00" />
        <StatCard label="Sinal Recebido" value={formatCurrency(depositReceived)} icon={Banknote} color="#22c55e" />
        <StatCard label="A Receber" value={formatCurrency(pendingCheckin)} icon={Info} color="#3b82f6" />
        <StatCard label="Reservas" value={filteredBookings.length} icon={CalendarCheck} color="#7c3aed" />
        <StatCard label="Ticket Médio" value={formatCurrency(ticketMedio)} icon={BarChart} color="#ec4899" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Revenue Chart */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px' }}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Receita histórica — últimos 6 meses</h2>
          
          <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            
            {/* Grid lines horizontal */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }} />
            
            {chartData.map((d, i) => {
              const heightPercentage = (d.val / maxVal) * 100
              const barHeight = mounted ? `${heightPercentage}%` : '0%'
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                  <div 
                    title={formatCurrency(d.val)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--purple)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease, background-color 0.2s',
                      height: barHeight,
                      minHeight: d.val > 0 && mounted ? '4px' : '0px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--purple)')}
                  />
                  <span style={{ color: 'var(--muted)', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Occupancy */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px' }}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Ocupação</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {occupancyMap.map((prop, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text)', fontSize: '15px' }}>{prop.name}</span>
                  <span style={{ color: 'var(--accent)', fontSize: '15px', fontWeight: 600 }}>{prop.rate}%</span>
                </div>
                <div style={{ backgroundColor: 'var(--bg)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: 'var(--purple)', height: '100%', width: mounted ? `${prop.rate}%` : '0%', borderRadius: '999px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
            {occupancyMap.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhuma propriedade cadastrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
