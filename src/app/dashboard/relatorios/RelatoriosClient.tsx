"use client"

import { useState, useEffect, useMemo } from "react"
import { TrendingUp, TrendingDown, Wallet, CalendarCheck, Clock, PiggyBank, Gift } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { startOfMonth, endOfMonth, parseISO, format, differenceInDays, subMonths } from "date-fns"
import { computeFinance } from "@/lib/financeiro"
import { ExportarContador } from "@/components/ExportarContador"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const card = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '24px',
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div style={{ ...card, borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 500 }}>{label}</h3>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color="var(--accent)" />
        </div>
      </div>
      <p style={{ color, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</p>
      {sub && <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '6px' }}>{sub}</p>}
    </div>
  )
}

const th = {
  padding: '12px 16px', textAlign: 'left' as const, color: 'var(--muted)',
  fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap' as const,
}
const td = {
  padding: '14px 16px', color: 'var(--text)', fontSize: '14px',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const,
}

export function RelatoriosClient({ bookings, properties, expenses, extras, categories, payments = [], nomeNegocio = "Arium" }: any) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [cabana, setCabana] = useState<string>('all')
  const [mounted, setMounted] = useState(false)
  const [hoje, setHoje] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    // "Hoje" só no cliente, para o HTML do servidor não divergir na hidratação.
    setHoje(format(new Date(), 'yyyy-MM-dd'))

    const style = document.createElement('style')
    style.textContent = `
      .react-datepicker-popper { z-index: 9999 !important; }
      .react-datepicker-wrapper { width: 100%; display: block; }
      .react-datepicker__triangle { display: none !important; }
      .react-datepicker {
        background-color: var(--surface) !important;
        border: 1px solid var(--border) !important;
        border-radius: 12px !important; font-family: inherit !important;
      }
      @media (max-width: 480px) { .react-datepicker { font-size: 0.9em !important; } }
      .react-datepicker__header {
        background-color: var(--surface) !important;
        border-bottom: 1px solid var(--border) !important;
        border-radius: 12px 12px 0 0 !important; padding: 10px !important;
      }
      .react-datepicker__current-month { color: var(--text) !important; font-weight: 600 !important; }
      .react-datepicker__day-name { color: var(--muted) !important; font-size: 12px !important; }
      .react-datepicker__day { color: var(--text) !important; border-radius: 8px !important; }
      .react-datepicker__day:hover { background-color: var(--purple-dim) !important; }
      .react-datepicker__day--selected { background-color: var(--purple) !important; color: white !important; }
      .react-datepicker__day--keyboard-selected { background-color: var(--accent) !important; color: white !important; }
      .react-datepicker__day--outside-month { color: var(--muted) !important; opacity: 0.5 !important; }
      .react-datepicker__navigation { top: 10px !important; }
      .react-datepicker__navigation-icon::before {
        border-color: var(--text) !important; border-width: 2px 2px 0 0 !important;
        height: 7px !important; width: 7px !important;
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  const hojeSafe = hoje ?? format(new Date(), 'yyyy-MM-dd')

  // Consolidado do período (todas as cabanas)
  const fin = useMemo(() => computeFinance({
    properties, bookings, expenses, extras, payments,
    inicio: startDate, fim: endDate, hoje: hojeSafe,
  }), [properties, bookings, expenses, extras, payments, startDate, endDate, hojeSafe])

  // Quando uma cabana está selecionada, os cartões mostram só ela
  const linhaSelecionada = cabana === 'all' ? null : fin.porCabana.find(r => r.propertyId === cabana)
  const vis = linhaSelecionada
    ? {
        receita: linhaSelecionada.receita, diarias: linhaSelecionada.diarias,
        extras: linhaSelecionada.extras, aReceber: linhaSelecionada.aReceber,
        gastos: linhaSelecionada.gastos, liquido: linhaSelecionada.liquido,
        reservas: linhaSelecionada.reservas,
        margem: linhaSelecionada.receita > 0 ? (linhaSelecionada.liquido / linhaSelecionada.receita) * 100 : 0,
        ticketMedio: linhaSelecionada.reservas > 0 ? linhaSelecionada.receita / linhaSelecionada.reservas : 0,
      }
    : fin.total

  const cortesiasVis = linhaSelecionada
    ? { cortesias: linhaSelecionada.cortesias, noitesCedidas: linhaSelecionada.noitesCedidas }
    : { cortesias: fin.total.cortesias, noitesCedidas: fin.total.noitesCedidas }

  // Ocupação
  const totalDiasPeriodo = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1)
  const ocupacao = fin.porCabana.map(r => ({
    name: r.name,
    rate: Math.min(100, (r.noites / totalDiasPeriodo) * 100),
  }))

  // Gráfico: últimos 6 meses (receita x gasto x líquido)
  const chart = useMemo(() => {
    const agora = new Date()
    const out = []
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(agora, i)
      const ini = format(startOfMonth(m), 'yyyy-MM-dd')
      const fim = format(endOfMonth(m), 'yyyy-MM-dd')
      const r = computeFinance({ properties, bookings, expenses, extras, payments, inicio: ini, fim, hoje: hojeSafe })
      const alvo = cabana === 'all' ? r.total : r.porCabana.find(x => x.propertyId === cabana)
      out.push({
        label: format(m, 'MMM'),
        receita: alvo?.receita ?? 0,
        gastos: alvo?.gastos ?? 0,
        liquido: alvo?.liquido ?? 0,
      })
    }
    return out
  }, [properties, bookings, expenses, extras, payments, cabana, hojeSafe])

  const maxChart = Math.max(...chart.map(d => Math.max(d.receita, d.gastos)), 1000)

  // Gastos por categoria no período
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const g of expenses) {
      if (g.date < startDate || g.date > endDate) continue
      if (cabana !== 'all' && g.property_id !== cabana && g.property_id !== null) continue
      const nome = categories.find((c: any) => c.id === g.category_id)?.label ?? 'Sem categoria'
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(g.amount || 0))
    }
    return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)
  }, [expenses, categories, startDate, endDate, cabana])

  const maxCategoria = Math.max(...porCategoria.map(c => c.valor), 1)

  const inputStyle = {
    backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '10px 14px', color: 'var(--text)', fontSize: '15px', width: '100%',
    outline: 'none', cursor: 'pointer', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
        Relatórios Financeiros
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
        Faturamento, gastos e lucro líquido — no total e cabana por cabana.
      </p>

      {/* Filtros */}
      <div style={{ ...card, display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Período inicial</label>
          <DatePicker
            selected={startDate ? parseISO(startDate) : null}
            onChange={(d: Date | null) => setStartDate(d ? format(d, 'yyyy-MM-dd') : '')}
            dateFormat="dd/MM/yyyy"
            customInput={<input type="text" readOnly style={inputStyle} />}
          />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Período final</label>
          <DatePicker
            selected={endDate ? parseISO(endDate) : null}
            onChange={(d: Date | null) => setEndDate(d ? format(d, 'yyyy-MM-dd') : '')}
            dateFormat="dd/MM/yyyy"
            customInput={<input type="text" readOnly style={inputStyle} />}
          />
        </div>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Cabana</label>
          <select value={cabana} onChange={e => setCabana(e.target.value)} style={inputStyle}>
            <option value="all">Todas as cabanas (geral)</option>
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'flex-end' }}>
          <ExportarContador
            inicio={startDate} fim={endDate} hoje={hojeSafe}
            properties={properties} bookings={bookings} expenses={expenses}
            extras={extras} payments={payments} categories={categories}
            nomeNegocio={nomeNegocio}
          />
        </div>
      </div>

      {/* Cartões */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          label="Faturamento realizado" value={formatCurrency(vis.receita)}
          sub={`${formatCurrency(vis.diarias)} diárias + ${formatCurrency(vis.extras)} extras`}
          icon={TrendingUp} color="var(--success-strong)"
        />
        <StatCard
          label="Gastos" value={formatCurrency(vis.gastos)}
          sub={cabana === 'all' && fin.total.gastosGerais > 0 ? `inclui ${formatCurrency(fin.total.gastosGerais)} de gastos gerais` : 'no período'}
          icon={TrendingDown} color="var(--danger-strong)"
        />
        <StatCard
          label="Lucro líquido" value={formatCurrency(vis.liquido)}
          sub={`margem de ${vis.margem.toFixed(1)}%`}
          icon={PiggyBank} color={vis.liquido >= 0 ? 'var(--success-strong)' : 'var(--danger-strong)'}
        />
        <StatCard
          label="Ainda a receber" value={formatCurrency(vis.aReceber)}
          sub="futuras + marcadas como não recebidas"
          icon={Clock} color="var(--info-strong)"
        />
        <StatCard
          label="Reservas" value={String(vis.reservas)}
          sub={`ticket médio ${formatCurrency(vis.ticketMedio)}`}
          icon={CalendarCheck} color="var(--purple)"
        />
        {cortesiasVis.cortesias > 0 && (
          <StatCard
            label="Diárias de cortesia" value={String(cortesiasVis.cortesias)}
            sub={`${cortesiasVis.noitesCedidas} noite${cortesiasVis.noitesCedidas !== 1 ? 's' : ''} cedida${cortesiasVis.noitesCedidas !== 1 ? 's' : ''} (influencer/permuta)`}
            icon={Gift} color="var(--violet-mid)"
          />
        )}
      </div>

      {/* Faturamento por cabana */}
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Resultado por cabana</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
            Gastos gerais são rateados proporcionalmente ao faturamento de cada cabana.
          </p>
        </div>
        <div className="tabela-resp-wrap">
          <table className="tabela-resp" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
            <thead><tr>
              {['Cabana', 'Reservas', 'Diárias', 'Extras', 'Receita', 'Gastos', 'Lucro líquido', 'Margem'].map(c => (
                <th key={c} style={th}>{c}</th>
              ))}
            </tr></thead>
            <tbody>
              {fin.porCabana.map(r => {
                const margem = r.receita > 0 ? (r.liquido / r.receita) * 100 : 0
                return (
                  <tr key={r.propertyId} style={{ backgroundColor: cabana === r.propertyId ? 'var(--purple-dim)' : 'transparent' }}>
                    <td data-col="Cabana" style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                    <td data-col="Reservas" style={{ ...td, color: 'var(--muted)' }}>{r.reservas}</td>
                    <td data-col="Diárias" style={td}>{formatCurrency(r.diarias)}</td>
                    <td data-col="Extras" style={{ ...td, color: r.extras > 0 ? 'var(--success)' : 'var(--muted)' }}>{formatCurrency(r.extras)}</td>
                    <td data-col="Receita" style={{ ...td, fontWeight: 600 }}>{formatCurrency(r.receita)}</td>
                    <td data-col="Gastos" style={{ ...td, color: 'var(--danger)' }}>
                      {formatCurrency(r.gastos)}
                      {r.gastosRateados > 0 && (
                        <span style={{ color: 'var(--muted)', fontSize: '12px', display: 'block' }}>
                          {formatCurrency(r.gastosRateados)} rateado
                        </span>
                      )}
                    </td>
                    <td data-col="Lucro líquido" style={{ ...td, fontWeight: 800, color: r.liquido >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatCurrency(r.liquido)}
                    </td>
                    <td data-col="Margem" style={{ ...td, color: 'var(--muted)' }}>{margem.toFixed(1)}%</td>
                  </tr>
                )
              })}
              {fin.porCabana.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                  Nenhuma cabana cadastrada.
                </td></tr>
              )}
            </tbody>
            {fin.porCabana.length > 1 && (
              <tfoot><tr>
                <td data-col="" style={{ ...td, fontWeight: 700, borderBottom: 'none' }}>Total</td>
                <td data-col="Reservas" style={{ ...td, borderBottom: 'none', color: 'var(--muted)' }}>{fin.total.reservas}</td>
                <td data-col="Diárias" style={{ ...td, borderBottom: 'none' }}>{formatCurrency(fin.total.diarias)}</td>
                <td data-col="Extras" style={{ ...td, borderBottom: 'none' }}>{formatCurrency(fin.total.extras)}</td>
                <td data-col="Receita" style={{ ...td, borderBottom: 'none', fontWeight: 700 }}>{formatCurrency(fin.total.receita)}</td>
                <td data-col="Gastos" style={{ ...td, borderBottom: 'none', color: 'var(--danger)' }}>{formatCurrency(fin.total.gastos)}</td>
                <td data-col="Lucro líquido" style={{ ...td, borderBottom: 'none', fontWeight: 800, color: fin.total.liquido >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatCurrency(fin.total.liquido)}
                </td>
                <td data-col="Margem" style={{ ...td, borderBottom: 'none', color: 'var(--muted)' }}>{fin.total.margem.toFixed(1)}%</td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

        {/* Receita x Gasto x Líquido */}
        <div style={card}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
            Últimos 6 meses
          </h2>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[['Receita', 'var(--success-strong)'], ['Gastos', 'var(--danger-strong)'], ['Líquido', 'var(--purple)']].map(([t, c]) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: c }} />{t}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '190px', gap: '6px' }}>
            {chart.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                  <div title={`Receita: ${formatCurrency(d.receita)}`} style={{
                    width: '28%', backgroundColor: 'var(--success-strong)', borderRadius: '3px 3px 0 0',
                    height: mounted ? `${(d.receita / maxChart) * 100}%` : '0%',
                    minHeight: d.receita > 0 ? '3px' : '0', transition: 'height .4s ease',
                  }} />
                  <div title={`Gastos: ${formatCurrency(d.gastos)}`} style={{
                    width: '28%', backgroundColor: 'var(--danger-strong)', borderRadius: '3px 3px 0 0',
                    height: mounted ? `${(d.gastos / maxChart) * 100}%` : '0%',
                    minHeight: d.gastos > 0 ? '3px' : '0', transition: 'height .4s ease',
                  }} />
                  <div title={`Líquido: ${formatCurrency(d.liquido)}`} style={{
                    width: '28%', backgroundColor: 'var(--purple)', borderRadius: '3px 3px 0 0',
                    height: mounted ? `${(Math.max(0, d.liquido) / maxChart) * 100}%` : '0%',
                    minHeight: d.liquido > 0 ? '3px' : '0', transition: 'height .4s ease',
                  }} />
                </div>
                <span style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '8px' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gastos por categoria */}
        <div style={card}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
            Para onde foi o dinheiro
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {porCategoria.map((c, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text)', fontSize: '14px' }}>{c.nome}</span>
                  <span style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(c.valor)}</span>
                </div>
                <div style={{ backgroundColor: 'var(--bg)', borderRadius: '999px', height: '7px', overflow: 'hidden' }}>
                  <div style={{
                    backgroundColor: 'var(--danger-strong)', height: '100%',
                    width: mounted ? `${(c.valor / maxCategoria) * 100}%` : '0%',
                    borderRadius: '999px', transition: 'width .6s ease',
                  }} />
                </div>
              </div>
            ))}
            {porCategoria.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                Nenhum gasto lançado no período. Use a aba <strong>Financeiro</strong> para registrar.
              </p>
            )}
          </div>
        </div>

        {/* Ocupação */}
        <div style={card}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Ocupação</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ocupacao.map((p, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text)', fontSize: '14px' }}>{p.name}</span>
                  <span style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }}>{p.rate.toFixed(1)}%</span>
                </div>
                <div style={{ backgroundColor: 'var(--bg)', borderRadius: '999px', height: '7px', overflow: 'hidden' }}>
                  <div style={{
                    backgroundColor: 'var(--purple)', height: '100%',
                    width: mounted ? `${p.rate}%` : '0%',
                    borderRadius: '999px', transition: 'width .6s ease',
                  }} />
                </div>
              </div>
            ))}
            {ocupacao.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhuma propriedade cadastrada.</p>}
          </div>
        </div>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '24px', lineHeight: 1.6 }}>
        <Wallet size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
        Recebimentos lançados na reserva sempre mandam no cálculo. Sem eles, o faturamento conta a reserva inteira depois que o check-out passa; antes disso, só o que já foi
        pago (sinal ou pagamento integral) entra — o restante fica em <strong>Ainda a receber</strong>.
        Reservas canceladas, pendentes e de cortesia não entram no faturamento, e as marcadas como <strong>não recebidas</strong> ficam em "A receber" mesmo com a data passada.
      </p>
    </div>
  )
}
