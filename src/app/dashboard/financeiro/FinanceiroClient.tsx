"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useConfirm } from "@/components/ConfirmModal"
import { Wallet, PlusCircle, Repeat, Trash2, Pencil } from "lucide-react"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { parseMoney } from "@/lib/money"
import { executar } from "@/lib/salvar"

const GERAL = "__geral__"

const card = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '24px',
}

const input = {
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const label = {
  display: 'block',
  color: 'var(--muted)',
  fontSize: '13px',
  marginBottom: '6px',
  fontWeight: 500,
}

const btnPrimary = {
  backgroundColor: 'var(--purple)',
  border: 'none',
  color: '#fff',
  borderRadius: '8px',
  padding: '11px 22px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnGhost = {
  backgroundColor: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: '8px',
  padding: '11px 18px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

const th = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  color: 'var(--muted)',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap' as const,
}

const td = {
  padding: '14px 16px',
  color: 'var(--text)',
  fontSize: '14px',
  borderBottom: '1px solid var(--border)',
}

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function FinanceiroClient({ tenantId, properties, categories, expenses, recurring, extras, bookings, payments = [] }: any) {
  const router = useRouter()
  const supabase = createClient()
  const { ConfirmModal, confirm } = useConfirm()

  const [tab, setTab] = useState<'gastos' | 'extras' | 'recebimentos' | 'fixas'>('gastos')
  const [mes, setMes] = useState(mesAtual())
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const nomeCabana = (id: string | null) =>
    id === null ? 'Geral (todas)' : properties.find((p: any) => p.id === id)?.name ?? '—'
  const nomeCategoria = (id: string | null) =>
    categories.find((c: any) => c.id === id)?.label ?? '—'

  const doMes = (d: string) => d.startsWith(mes)

  const gastosMes = useMemo(() => expenses.filter((e: any) => doMes(e.date)), [expenses, mes])
  const extrasMes = useMemo(() => extras.filter((e: any) => doMes(e.date)), [extras, mes])

  const recebimentosMes = useMemo(() => payments.filter((p: any) => doMes(p.date)), [payments, mes])
  const totalRecebido = recebimentosMes.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

  const totalGastos = gastosMes.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const totalExtras = extrasMes.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const totalFixas = recurring.filter((r: any) => r.active)
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0)

  // ---------- form de GASTO ----------
  const gastoVazio = {
    id: null as string | null,
    property_id: GERAL,
    category_id: '',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
  }
  const [gasto, setGasto] = useState(gastoVazio)

  const salvarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!gasto.description.trim()) return setErro('Descreva o gasto.')
    const valorGasto = parseMoney(gasto.amount)
    if (isNaN(valorGasto) || valorGasto <= 0) {
      return setErro('Informe um valor maior que zero (ex: 250 ou 1.250,90).')
    }

    setSaving(true)
    const payload = {
      tenant_id: tenantId,
      property_id: gasto.property_id === GERAL ? null : gasto.property_id,
      category_id: gasto.category_id || null,
      description: gasto.description.trim(),
      amount: valorGasto,
      date: gasto.date,
    }
    const { error } = gasto.id
      ? await supabase.from('expenses').update(payload).eq('id', gasto.id)
      : await supabase.from('expenses').insert([payload])
    setSaving(false)
    if (error) return setErro(error.message)
    setGasto(gastoVazio)
    router.refresh()
  }

  const apagarGasto = async (row: any) => {
    if (!(await confirm('Apagar gasto?', `"${row.description}" — ${formatCurrency(Number(row.amount))}. Isso não pode ser desfeito.`))) return
    const r = await executar(supabase.from('expenses').delete().eq('id', row.id))
    if (!r.ok) return setErro(r.erro)
    router.refresh()
  }

  // ---------- form de RECEITA EXTRA ----------
  // booking_id vazio = venda avulsa (visitante que não está hospedado).
  const extraVazio = {
    id: null as string | null, booking_id: '', property_id: GERAL,
    description: '', amount: '', date: new Date().toISOString().slice(0, 10),
  }
  const [extra, setExtra] = useState(extraVazio)

  const salvarExtra = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!extra.description.trim()) return setErro('Descreva a receita (ex: Fondue de chocolate).')
    const valorExtra = parseMoney(extra.amount)
    if (isNaN(valorExtra) || valorExtra <= 0) {
      return setErro('Informe um valor maior que zero (ex: 120 ou 120,50).')
    }

    const reserva = extra.booking_id ? bookings.find((b: any) => b.id === extra.booking_id) : null
    if (extra.booking_id && !reserva) return setErro('Reserva não encontrada.')

    setSaving(true)
    const payload = {
      tenant_id: tenantId,
      booking_id: extra.booking_id || null,
      // Com reserva, a cabana vem dela; sem reserva, a dona escolhe (ou "Geral").
      property_id: reserva ? reserva.property_id : (extra.property_id === GERAL ? null : extra.property_id),
      description: extra.description.trim(),
      amount: valorExtra,
      date: extra.date,
    }
    const { error } = extra.id
      ? await supabase.from('extra_revenues').update(payload).eq('id', extra.id)
      : await supabase.from('extra_revenues').insert([payload])
    setSaving(false)
    if (error) return setErro(error.message)
    setExtra(extraVazio)
    router.refresh()
  }

  const apagarExtra = async (row: any) => {
    if (!(await confirm('Apagar receita extra?', `"${row.description}" — ${formatCurrency(Number(row.amount))}.`))) return
    const r = await executar(supabase.from('extra_revenues').delete().eq('id', row.id))
    if (!r.ok) return setErro(r.erro)
    router.refresh()
  }

  // ---------- form de DESPESA FIXA ----------
  const fixaVazia = {
    id: null as string | null,
    property_id: GERAL,
    category_id: '',
    description: '',
    amount: '',
    day_of_month: '5',
  }
  const [fixa, setFixa] = useState(fixaVazia)

  const salvarFixa = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!fixa.description.trim()) return setErro('Descreva a despesa fixa.')
    const valorFixa = parseMoney(fixa.amount)
    if (isNaN(valorFixa) || valorFixa <= 0) {
      return setErro('Informe um valor maior que zero (ex: 199 ou 199,90).')
    }

    setSaving(true)
    const payload = {
      tenant_id: tenantId,
      property_id: fixa.property_id === GERAL ? null : fixa.property_id,
      category_id: fixa.category_id || null,
      description: fixa.description.trim(),
      amount: valorFixa,
      day_of_month: Math.min(28, Math.max(1, Number(fixa.day_of_month) || 1)),
    }
    const { error } = fixa.id
      ? await supabase.from('recurring_expenses').update(payload).eq('id', fixa.id)
      : await supabase.from('recurring_expenses').insert([payload])
    setSaving(false)
    if (error) return setErro(error.message)
    setFixa(fixaVazia)
    router.refresh()
  }

  const alternarFixa = async (row: any) => {
    setErro('')
    const r = await executar(supabase.from('recurring_expenses').update({ active: !row.active }).eq('id', row.id))
    if (!r.ok) return setErro(r.erro)
    router.refresh()
  }

  const apagarFixa = async (row: any) => {
    if (!(await confirm(
      'Apagar despesa fixa?',
      `"${row.description}" deixa de ser lançada nos próximos meses. Os lançamentos já feitos continuam no histórico.`
    ))) return
    const r = await executar(supabase.from('recurring_expenses').delete().eq('id', row.id))
    if (!r.ok) return setErro(r.erro)
    router.refresh()
  }

  const tabBtn = (t: typeof tab, texto: string) => (
    <button
      onClick={() => { setTab(t); setErro('') }}
      style={{
        padding: '10px 18px', background: 'none', border: 'none',
        borderBottom: tab === t ? '2px solid var(--purple)' : '2px solid transparent',
        color: tab === t ? 'var(--text)' : 'var(--muted)',
        cursor: 'pointer', fontWeight: tab === t ? 600 : 500, fontSize: '14px',
      }}
    >
      {texto}
    </button>
  )

  return (
    <div style={{ width: '100%' }}>
      <ConfirmModal />

      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
        Financeiro
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
        Lance aqui os gastos e as vendas extras. O resultado aparece em Relatórios como lucro líquido.
      </p>

      {/* Resumo do mês */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ ...card, borderTop: '3px solid var(--danger-strong)' }}>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>Gastos do mês</p>
          <p style={{ color: 'var(--danger)', fontSize: '26px', fontWeight: 800 }}>{formatCurrency(totalGastos)}</p>
        </div>
        <div style={{ ...card, borderTop: '3px solid var(--success-strong)' }}>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>Receitas extras do mês</p>
          <p style={{ color: 'var(--success)', fontSize: '26px', fontWeight: 800 }}>{formatCurrency(totalExtras)}</p>
        </div>
        <div style={{ ...card, borderTop: '3px solid var(--info-strong)' }}>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>Despesas fixas ativas</p>
          <p style={{ color: 'var(--info)', fontSize: '26px', fontWeight: 800 }}>{formatCurrency(totalFixas)}<span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>/mês</span></p>
        </div>
      </div>

      {/* Mês de referência */}
      <div style={{ ...card, marginBottom: '20px', display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={label}>Mês de referência</label>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={input} />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '13px', flex: '2 1 320px', lineHeight: 1.5, margin: 0 }}>
          As despesas fixas do mês atual já entram sozinhas na lista de gastos — não precisa redigitar.
        </p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabBtn('gastos', `Gastos (${gastosMes.length})`)}
        {tabBtn('extras', `Receitas extras (${extrasMes.length})`)}
        {tabBtn('recebimentos', `Recebimentos (${recebimentosMes.length})`)}
        {tabBtn('fixas', `Despesas fixas (${recurring.length})`)}
      </div>

      {erro && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
          <p style={{ color: 'var(--danger)', fontSize: '14px', margin: 0, fontWeight: 500 }}>{erro}</p>
        </div>
      )}

      {/* ================= GASTOS ================= */}
      {tab === 'gastos' && (
        <>
          <form onSubmit={salvarGasto} style={{ ...card, marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={18} color="var(--purple)" />
              {gasto.id ? 'Editar gasto' : 'Novo gasto'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={label}>Data</label>
                <input type="date" value={gasto.date} onChange={e => setGasto({ ...gasto, date: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Cabana</label>
                <select value={gasto.property_id} onChange={e => setGasto({ ...gasto, property_id: e.target.value })} style={input}>
                  <option value={GERAL}>Geral (rateado entre todas)</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Categoria</label>
                <select value={gasto.category_id} onChange={e => setGasto({ ...gasto, category_id: e.target.value })} style={input}>
                  <option value="">Sem categoria</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Valor</label>
                <MoneyInput value={gasto.amount} onChange={v => setGasto({ ...gasto, amount: v })} style={input} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Descrição</label>
                <input type="text" value={gasto.description} placeholder="Ex: Troca do chuveiro, gás, produtos de limpeza..."
                  onChange={e => setGasto({ ...gasto, description: e.target.value })} style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {gasto.id && <button type="button" onClick={() => setGasto(gastoVazio)} style={btnGhost}>Cancelar</button>}
              <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : gasto.id ? 'Salvar alterações' : 'Lançar gasto'}
              </button>
            </div>
          </form>

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div className="tabela-resp-wrap">
              <table className="tabela-resp" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead><tr>
                  {['Data', 'Descrição', 'Cabana', 'Categoria', 'Valor', ''].map((c, i) => <th key={i} style={th}>{c}</th>)}
                </tr></thead>
                <tbody>
                  {gastosMes.map((g: any) => (
                    <tr key={g.id}>
                      <td data-col="Data" style={{ ...td, whiteSpace: 'nowrap' }}>{formatDate(g.date)}</td>
                      <td data-col="Descrição" style={td}>
                        {g.description}
                        {g.recurring_id && (
                          <span title="Lançada automaticamente pela despesa fixa" style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap' }}>
                            fixa
                          </span>
                        )}
                      </td>
                      <td data-col="Cabana" style={{ ...td, color: g.property_id ? 'var(--text)' : 'var(--muted)' }}>{nomeCabana(g.property_id)}</td>
                      <td data-col="Categoria" style={{ ...td, color: 'var(--muted)' }}>{nomeCategoria(g.category_id)}</td>
                      <td data-col="Valor" style={{ ...td, color: 'var(--danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(Number(g.amount))}</td>
                      <td data-col="" style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button onClick={() => setGasto({
                          id: g.id, property_id: g.property_id ?? GERAL, category_id: g.category_id ?? '',
                          description: g.description, amount: String(g.amount), date: g.date,
                        })} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => apagarGasto(g)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {gastosMes.length === 0 && (
                    <tr><td colSpan={6} style={{ ...td, textAlign: 'center', padding: '40px', color: 'var(--muted)', borderBottom: 'none' }}>
                      <Wallet size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                      <p>Nenhum gasto lançado neste mês.</p>
                    </td></tr>
                  )}
                </tbody>
                {gastosMes.length > 0 && (
                  <tfoot><tr>
                    <td colSpan={4} style={{ ...td, fontWeight: 600, borderBottom: 'none' }}>Total do mês</td>
                    <td style={{ ...td, color: 'var(--danger)', fontWeight: 800, borderBottom: 'none', whiteSpace: 'nowrap' }}>{formatCurrency(totalGastos)}</td>
                    <td style={{ ...td, borderBottom: 'none' }} />
                  </tr></tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= RECEITAS EXTRAS ================= */}
      {tab === 'extras' && (
        <>
          <form onSubmit={salvarExtra} style={{ ...card, marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={18} color="var(--purple)" />
              {extra.id ? 'Editar receita extra' : 'Nova receita extra'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Reserva do hóspede</label>
                <select value={extra.booking_id} onChange={e => setExtra({ ...extra, booking_id: e.target.value })} style={input}>
                  <option value="">Venda avulsa (sem reserva)</option>
                  {bookings.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.guest_name} — {formatDate(b.check_in)} ({properties.find((p: any) => p.id === b.property_id)?.name})
                    </option>
                  ))}
                </select>
              </div>
              {!extra.booking_id && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={label}>Cabana (venda avulsa)</label>
                  <select value={extra.property_id} onChange={e => setExtra({ ...extra, property_id: e.target.value })} style={input}>
                    <option value={GERAL}>Nenhuma cabana específica</option>
                    {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={label}>Data da venda</label>
                <input type="date" value={extra.date} onChange={e => setExtra({ ...extra, date: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Valor</label>
                <MoneyInput value={extra.amount} onChange={v => setExtra({ ...extra, amount: v })} style={input} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>O que foi vendido</label>
                <input type="text" value={extra.description} placeholder="Ex: Fondue de chocolate, tábua de frios, café da manhã extra..."
                  onChange={e => setExtra({ ...extra, description: e.target.value })} style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {extra.id && <button type="button" onClick={() => setExtra(extraVazio)} style={btnGhost}>Cancelar</button>}
              <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : extra.id ? 'Salvar alterações' : 'Lançar receita'}
              </button>
            </div>
          </form>

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div className="tabela-resp-wrap">
              <table className="tabela-resp" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead><tr>
                  {['Data', 'Descrição', 'Hóspede', 'Cabana', 'Valor', ''].map((c, i) => <th key={i} style={th}>{c}</th>)}
                </tr></thead>
                <tbody>
                  {extrasMes.map((e: any) => {
                    const b = bookings.find((x: any) => x.id === e.booking_id)
                    return (
                      <tr key={e.id}>
                        <td data-col="Data" style={{ ...td, whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                        <td data-col="Descrição" style={td}>{e.description}</td>
                        <td data-col="Hóspede" style={{ ...td, color: 'var(--muted)' }}>
                          {b?.guest_name ?? <span style={{ fontStyle: 'italic' }}>venda avulsa</span>}
                        </td>
                        <td data-col="Cabana" style={td}>{nomeCabana(e.property_id)}</td>
                        <td data-col="Valor" style={{ ...td, color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(Number(e.amount))}</td>
                        <td data-col="" style={{ ...td, whiteSpace: 'nowrap' }}>
                          <button onClick={() => setExtra({
                            id: e.id, booking_id: e.booking_id ?? '', property_id: e.property_id ?? GERAL,
                            description: e.description, amount: String(e.amount), date: e.date,
                          })} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => apagarExtra(e)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {extrasMes.length === 0 && (
                    <tr><td colSpan={6} style={{ ...td, textAlign: 'center', padding: '40px', color: 'var(--muted)', borderBottom: 'none' }}>
                      Nenhuma receita extra lançada neste mês.
                    </td></tr>
                  )}
                </tbody>
                {extrasMes.length > 0 && (
                  <tfoot><tr>
                    <td colSpan={4} style={{ ...td, fontWeight: 600, borderBottom: 'none' }}>Total do mês</td>
                    <td style={{ ...td, color: 'var(--success)', fontWeight: 800, borderBottom: 'none', whiteSpace: 'nowrap' }}>{formatCurrency(totalExtras)}</td>
                    <td style={{ ...td, borderBottom: 'none' }} />
                  </tr></tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= RECEBIMENTOS ================= */}
      {tab === 'recebimentos' && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Dinheiro que entrou no mês</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
              Os recebimentos são lançados dentro de cada reserva, no card <strong>Recebimentos</strong>.
              Aqui é só a visão consolidada do mês.
            </p>
          </div>
          <div className="tabela-resp-wrap">
            <table className="tabela-resp" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead><tr>
                {['Data', 'Hóspede', 'Cabana', 'Forma', 'Observação', 'Valor'].map((c, i) => <th key={i} style={th}>{c}</th>)}
              </tr></thead>
              <tbody>
                {recebimentosMes.map((p: any) => {
                  const b = bookings.find((x: any) => x.id === p.booking_id)
                  return (
                    <tr key={p.id}>
                      <td data-col="Data" style={{ ...td, whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
                      <td data-col="Hóspede" style={td}>
                        {b ? (
                          <a href={`/dashboard/reservas/${p.booking_id}`} style={{ color: 'var(--purple)', textDecoration: 'none', fontWeight: 500 }}>
                            {b.guest_name}
                          </a>
                        ) : '—'}
                      </td>
                      <td data-col="Cabana" style={{ ...td, color: 'var(--muted)' }}>{b ? nomeCabana(b.property_id) : '—'}</td>
                      <td data-col="Forma" style={{ ...td, color: 'var(--muted)' }}>{p.method ?? '—'}</td>
                      <td data-col="Observação" style={{ ...td, color: 'var(--muted)' }}>{p.note ?? '—'}</td>
                      <td data-col="Valor" style={{ ...td, color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(Number(p.amount))}</td>
                    </tr>
                  )
                })}
                {recebimentosMes.length === 0 && (
                  <tr><td colSpan={6} style={{ ...td, textAlign: 'center', padding: '40px', color: 'var(--muted)', borderBottom: 'none' }}>
                    Nenhum recebimento lançado neste mês.
                  </td></tr>
                )}
              </tbody>
              {recebimentosMes.length > 0 && (
                <tfoot><tr>
                  <td colSpan={5} style={{ ...td, fontWeight: 600, borderBottom: 'none' }}>Total recebido no mês</td>
                  <td style={{ ...td, color: 'var(--success)', fontWeight: 800, borderBottom: 'none', whiteSpace: 'nowrap' }}>{formatCurrency(totalRecebido)}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ================= DESPESAS FIXAS ================= */}
      {tab === 'fixas' && (
        <>
          <form onSubmit={salvarFixa} style={{ ...card, marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Repeat size={18} color="var(--purple)" />
              {fixa.id ? 'Editar despesa fixa' : 'Nova despesa fixa'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.5 }}>
              Lançada automaticamente todo mês. Se o valor mudar num mês específico, é só editar aquele lançamento na aba Gastos.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={label}>Cabana</label>
                <select value={fixa.property_id} onChange={e => setFixa({ ...fixa, property_id: e.target.value })} style={input}>
                  <option value={GERAL}>Geral (rateado entre todas)</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Categoria</label>
                <select value={fixa.category_id} onChange={e => setFixa({ ...fixa, category_id: e.target.value })} style={input}>
                  <option value="">Sem categoria</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Valor por mês</label>
                <MoneyInput value={fixa.amount} onChange={v => setFixa({ ...fixa, amount: v })} style={input} />
              </div>
              <div>
                <label style={label}>Dia do vencimento</label>
                <input type="number" min="1" max="28" value={fixa.day_of_month}
                  onChange={e => setFixa({ ...fixa, day_of_month: e.target.value })} style={input} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Descrição</label>
                <input type="text" value={fixa.description} placeholder="Ex: Internet, diarista, contador, aluguel..."
                  onChange={e => setFixa({ ...fixa, description: e.target.value })} style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {fixa.id && <button type="button" onClick={() => setFixa(fixaVazia)} style={btnGhost}>Cancelar</button>}
              <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : fixa.id ? 'Salvar alterações' : 'Criar despesa fixa'}
              </button>
            </div>
          </form>

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div className="tabela-resp-wrap">
              <table className="tabela-resp" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead><tr>
                  {['Descrição', 'Cabana', 'Categoria', 'Dia', 'Valor', 'Ativa', ''].map((c, i) => <th key={i} style={th}>{c}</th>)}
                </tr></thead>
                <tbody>
                  {recurring.map((r: any) => (
                    <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                      <td data-col="Descrição" style={td}>{r.description}</td>
                      <td data-col="Cabana" style={{ ...td, color: r.property_id ? 'var(--text)' : 'var(--muted)' }}>{nomeCabana(r.property_id)}</td>
                      <td data-col="Categoria" style={{ ...td, color: 'var(--muted)' }}>{nomeCategoria(r.category_id)}</td>
                      <td data-col="Vencimento" style={{ ...td, color: 'var(--muted)' }}>dia {r.day_of_month}</td>
                      <td data-col="Valor" style={{ ...td, color: 'var(--danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(Number(r.amount))}</td>
                      <td data-col="Status" style={td}>
                        <button onClick={() => alternarFixa(r)} style={{
                          background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                          padding: '3px 10px', borderRadius: '999px',
                          border: `1px solid ${r.active ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                          color: r.active ? 'var(--success)' : 'var(--muted)',
                          backgroundColor: r.active ? 'rgba(34,197,94,0.12)' : 'transparent',
                        }}>
                          {r.active ? 'Ativa' : 'Pausada'}
                        </button>
                      </td>
                      <td data-col="" style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button onClick={() => setFixa({
                          id: r.id, property_id: r.property_id ?? GERAL, category_id: r.category_id ?? '',
                          description: r.description, amount: String(r.amount), day_of_month: String(r.day_of_month),
                        })} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => apagarFixa(r)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recurring.length === 0 && (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: '40px', color: 'var(--muted)', borderBottom: 'none' }}>
                      <Repeat size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                      <p>Nenhuma despesa fixa cadastrada.</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
