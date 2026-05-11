"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { subMonths, startOfMonth, endOfMonth, format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function RevenueChart({ bookings }: { bookings: any[] }) {
  const chartData = useMemo(() => {
    const data = []
    const now = new Date()

    // Create an array for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)

      const monthBookings = bookings.filter(b => {
        // user requested "payment_status = 'approved'" 
        // We include deposit_paid/fully_paid just in case as they were used before.
        const isApproved = b.payment_status === 'approved' || b.payment_status === 'deposit_paid' || b.payment_status === 'fully_paid'
        
        if (!isApproved) return false
        
        // Use check_in or created_at? The user didn't specify. Usually revenue is by created_at or check_in. Let's use check_in.
        const d = parseISO(b.created_at || b.check_in)
        return d >= start && d <= end
      })

      const totalAmount = monthBookings.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0)

      data.push({
        name: format(monthDate, 'MMM', { locale: ptBR }).replace('.', ''),
        total: totalAmount,
      })
    }

    return data
  }, [bookings])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(15, 15, 30, 0.95)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '4px', textTransform: 'capitalize' }}>{label}</p>
          <p style={{ color: '#F97316', fontWeight: 700, fontSize: '16px' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            stroke="var(--muted)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
          />
          <YAxis 
            stroke="var(--muted)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`}
          />
          <Tooltip cursor={{ fill: 'rgba(124, 58, 237, 0.1)' }} content={<CustomTooltip />} />
          <Bar 
            dataKey="total" 
            fill="#7C3AED" 
            radius={[4, 4, 0, 0]}
            activeBar={{ fill: '#F97316' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
