"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { baixarCSV, dataBR, nomeArquivo, numeroBR, type Coluna } from "@/lib/exportar"
import { bookingRevenue, groupPayments } from "@/lib/financeiro"
import { bookingStatusLabel, paymentStatusLabel } from "@/lib/statuses"

/**
 * Exporta o movimento do período em planilhas separadas — é assim que o
 * contador pede: uma de entradas, uma de saídas.
 */
export function ExportarContador({
  inicio, fim, hoje, properties, bookings, expenses, extras, payments, categories, nomeNegocio,
}: {
  inicio: string
  fim: string
  hoje: string
  properties: any[]
  bookings: any[]
  expenses: any[]
  extras: any[]
  payments: any[]
  categories: any[]
  nomeNegocio: string
}) {
  const [aberto, setAberto] = useState(false)

  const nomeCabana = (id: string | null) =>
    id === null ? 'Geral (todas)' : properties.find(p => p.id === id)?.name ?? '—'
  const nomeCategoria = (id: string | null) =>
    categories.find((c: any) => c.id === id)?.label ?? 'Sem categoria'

  const periodo = `${inicio.slice(0, 10)}_a_${fim.slice(0, 10)}`
  const noPeriodo = (d: string) => d >= inicio && d <= fim
  const porReserva = groupPayments(payments)

  const exportarReservas = () => {
    const linhas = bookings
      .filter(b => noPeriodo(b.check_in))
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .map(b => {
        const { realizado, aReceber } = bookingRevenue(b, hoje, porReserva.get(b.id))
        const extrasDaReserva = extras
          .filter(e => e.booking_id === b.id && noPeriodo(e.date))
          .reduce((s, e) => s + Number(e.amount || 0), 0)
        return { b, realizado, aReceber, extrasDaReserva }
      })

    const cols: Coluna<typeof linhas[number]>[] = [
      { titulo: 'Check-in', valor: r => dataBR(r.b.check_in) },
      { titulo: 'Check-out', valor: r => dataBR(r.b.check_out) },
      { titulo: 'Cabana', valor: r => nomeCabana(r.b.property_id) },
      { titulo: 'Hóspede', valor: r => r.b.guest_name },
      { titulo: 'CPF', valor: r => r.b.guest_cpf ?? '' },
      { titulo: 'Hóspedes', valor: r => r.b.guests_count },
      { titulo: 'Situação', valor: r => bookingStatusLabel(r.b.status) },
      { titulo: 'Pagamento', valor: r => paymentStatusLabel(r.b.payment_status) },
      { titulo: 'Cortesia', valor: r => (r.b.is_courtesy ? 'Sim' : 'Não') },
      { titulo: 'Valor da reserva', valor: r => numeroBR(r.b.total_amount) },
      { titulo: 'Extras', valor: r => numeroBR(r.extrasDaReserva) },
      { titulo: 'Faturamento realizado', valor: r => numeroBR(r.realizado) },
      { titulo: 'A receber', valor: r => numeroBR(r.aReceber) },
    ]
    baixarCSV(nomeArquivo(`${nomeNegocio} reservas`, 'csv', periodo), cols, linhas)
  }

  const exportarGastos = () => {
    const linhas = expenses.filter(e => noPeriodo(e.date)).sort((a, b) => a.date.localeCompare(b.date))
    const cols: Coluna<any>[] = [
      { titulo: 'Data', valor: g => dataBR(g.date) },
      { titulo: 'Descrição', valor: g => g.description },
      { titulo: 'Categoria', valor: g => nomeCategoria(g.category_id) },
      { titulo: 'Cabana', valor: g => nomeCabana(g.property_id) },
      { titulo: 'Despesa fixa', valor: g => (g.recurring_id ? 'Sim' : 'Não') },
      { titulo: 'Valor', valor: g => numeroBR(g.amount) },
    ]
    baixarCSV(nomeArquivo(`${nomeNegocio} gastos`, 'csv', periodo), cols, linhas)
  }

  const exportarEntradas = () => {
    // Junta o que entrou de fato: recebimentos por reserva + vendas extras.
    const recebimentos = payments.filter(p => noPeriodo(p.date)).map(p => {
      const b = bookings.find(x => x.id === p.booking_id)
      return {
        date: p.date,
        tipo: 'Recebimento de reserva',
        descricao: b ? `${b.guest_name} (${dataBR(b.check_in)})` : 'Reserva removida',
        cabana: b ? nomeCabana(b.property_id) : '',
        forma: p.method ?? '',
        amount: p.amount,
      }
    })
    const vendas = extras.filter(e => noPeriodo(e.date)).map(e => {
      const b = e.booking_id ? bookings.find(x => x.id === e.booking_id) : null
      return {
        date: e.date,
        tipo: 'Venda extra',
        descricao: e.description + (b ? ` — ${b.guest_name}` : ' — venda avulsa'),
        cabana: nomeCabana(e.property_id),
        forma: '',
        amount: e.amount,
      }
    })
    const linhas = [...recebimentos, ...vendas].sort((a, b) => a.date.localeCompare(b.date))

    const cols: Coluna<typeof linhas[number]>[] = [
      { titulo: 'Data', valor: r => dataBR(r.date) },
      { titulo: 'Tipo', valor: r => r.tipo },
      { titulo: 'Descrição', valor: r => r.descricao },
      { titulo: 'Cabana', valor: r => r.cabana },
      { titulo: 'Forma de pagamento', valor: r => r.forma },
      { titulo: 'Valor', valor: r => numeroBR(r.amount) },
    ]
    baixarCSV(nomeArquivo(`${nomeNegocio} entradas`, 'csv', periodo), cols, linhas)
  }

  const exportarTudo = () => {
    exportarReservas()
    setTimeout(exportarGastos, 350)
    setTimeout(exportarEntradas, 700)
    setAberto(false)
  }

  const item = {
    display: 'block', width: '100%', textAlign: 'left' as const,
    padding: '11px 16px', background: 'none', border: 'none',
    color: 'var(--text)', fontSize: '14px', cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(v => !v)}
        aria-expanded={aberto}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 16px', borderRadius: '8px',
          border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
          color: 'var(--text)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          width: '100%', justifyContent: 'center',
        }}
      >
        <Download size={16} /> Exportar para o contador
      </button>

      {aberto && (
        <>
          {/* Clique fora fecha */}
          <div
            onClick={() => setAberto(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41,
            minWidth: '260px', maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '10px', overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          }}>
            <p style={{
              padding: '12px 16px', color: 'var(--muted)', fontSize: '12px',
              borderBottom: '1px solid var(--border)', lineHeight: 1.5,
            }}>
              Período de <strong style={{ color: 'var(--text)' }}>{dataBR(inicio)}</strong> a{' '}
              <strong style={{ color: 'var(--text)' }}>{dataBR(fim)}</strong>.
              Abre direto no Excel.
            </p>
            <button style={item} onClick={() => { exportarTudo() }}>
              📦 Baixar tudo <span style={{ color: 'var(--muted)', fontSize: '12px' }}>(3 planilhas)</span>
            </button>
            <button style={item} onClick={() => { exportarReservas(); setAberto(false) }}>
              🏠 Só as reservas
            </button>
            <button style={item} onClick={() => { exportarEntradas(); setAberto(false) }}>
              💰 Só as entradas
            </button>
            <button style={{ ...item, borderBottom: 'none' }} onClick={() => { exportarGastos(); setAberto(false) }}>
              🧾 Só os gastos
            </button>
          </div>
        </>
      )}
    </div>
  )
}
