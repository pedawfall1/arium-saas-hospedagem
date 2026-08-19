"use client"

import { useMemo, useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { bookingRevenue, type PaymentLike } from "@/lib/financeiro"

/**
 * Usa a MESMA regra de faturamento de Relatórios (lib/financeiro).
 *
 * Antes este gráfico tinha regra própria: filtrava por um payment_status
 * 'approved' que nem existe no banco, agrupava pela data de criação e somava o
 * valor cheio de qualquer reserva paga — mesmo das que ainda nem aconteceram.
 * Dava um número diferente do resto do painel para o mesmo mês.
 */
export function RevenueChart({ bookings, payments = [] }: { bookings: any[], payments?: PaymentLike[] }) {
  // O ResponsiveContainer do recharts mede o container via ResizeObserver.
  // No servidor (e no primeiríssimo paint) o container tem tamanho 0/-1, e no
  // iOS Safari isso vira um loop de ResizeObserver que TRAVA a thread — a
  // navegação do login pro /dashboard nunca terminava. Só renderizamos o
  // gráfico depois de montar no cliente, com altura fixa.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const chartData = useMemo(() => {
    const data = []
    const now = new Date()
    const hoje = format(now, 'yyyy-MM-dd')

    const porReserva = new Map<string, PaymentLike[]>()
    for (const p of payments) {
      const lista = porReserva.get(p.booking_id)
      if (lista) lista.push(p)
      else porReserva.set(p.booking_id, [p])
    }

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const inicio = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const fim = format(endOfMonth(monthDate), 'yyyy-MM-dd')

      // Atribuído pelo check-in (quando a estadia acontece), igual a Relatórios.
      const total = bookings
        .filter(b => b.check_in >= inicio && b.check_in <= fim)
        .reduce((acc, b) => acc + bookingRevenue(b, hoje, porReserva.get(b.id)).realizado, 0)

      data.push({
        name: format(monthDate, 'MMM', { locale: ptBR }).replace('.', ''),
        total,
      })
    }

    return data
  }, [bookings, payments])

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
          <p style={{ color: 'var(--booking)', fontWeight: 700, fontSize: '16px' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: 260 }}>
      {mounted && (
      <ResponsiveContainer width="100%" height={260} minHeight={260}>
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
      )}
    </div>
  )
}
