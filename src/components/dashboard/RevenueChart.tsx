"use client"

import { useMemo, useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"
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
/** Fora do componente: recriar a cada render fazia o recharts remontá-lo. */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '10px 14px',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
      }}>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '4px', textTransform: 'capitalize' }}>{label}</p>
        <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '15px' }}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

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


  return (
    <div style={{ width: '100%', height: 240 }}>
      {mounted && (
      <ResponsiveContainer width="100%" height={240} minHeight={240}>
        <BarChart data={chartData} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.12)" />
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
            width={56}
            tickFormatter={(value) => value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`}
          />
          <Tooltip cursor={{ fill: 'rgba(124, 58, 237, 0.1)' }} content={<CustomTooltip />} />
          {/* Mês atual em destaque; os anteriores em tom mais suave. */}
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === chartData.length - 1 ? '#7c3aed' : 'rgba(124,58,237,0.45)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  )
}
