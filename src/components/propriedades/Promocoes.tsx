"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { Campo } from "@/components/ui/Campo"
import { parseMoney } from "@/lib/money"
import { executar } from "@/lib/salvar"
import { useConfirm } from "@/components/ConfirmModal"
import { Tag, Pencil, Trash2, PlusCircle } from "lucide-react"

const input = {
  backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '10px 13px', color: 'var(--text)', fontSize: '15px', width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
}

// 0 = domingo ... 6 = sábado (mesma ordem do banco)
const DIAS = [
  { n: 0, curto: 'Dom' }, { n: 1, curto: 'Seg' }, { n: 2, curto: 'Ter' },
  { n: 3, curto: 'Qua' }, { n: 4, curto: 'Qui' }, { n: 5, curto: 'Sex' }, { n: 6, curto: 'Sáb' },
]

/**
 * Promoções: uma oferta (preço fixo ou % de desconto) sobre um período,
 * escolhendo os dias da semana. Substitui a gambiarra de cadastrar oferta como
 * "feriado" e cobre o mês inteiro numa entrada só.
 */
export function Promocoes({ property, promotions }: any) {
  const supabase = createClient()
  const router = useRouter()
  const { ConfirmModal, confirm } = useConfirm()

  const doImovel = promotions.filter((p: any) => p.property_id === property.id)

  const vazio = {
    id: null as string | null,
    label: '',
    kind: 'percent' as 'percent' | 'fixed',
    amount: '',
    date_from: '',
    date_to: '',
    weekdays: [] as number[],
  }
  const [f, setF] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string, tipo: 'ok' | 'err' } | null>(null)

  const set = (k: string, v: any) => { setF(p => ({ ...p, [k]: v })); setMsg(null) }

  const toggleDia = (n: number) =>
    setF(p => ({ ...p, weekdays: p.weekdays.includes(n) ? p.weekdays.filter(d => d !== n) : [...p.weekdays, n].sort() }))

  const preset = (dias: number[]) => setF(p => ({ ...p, weekdays: dias }))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!f.label.trim()) return setMsg({ texto: 'Dê um nome à promoção.', tipo: 'err' })
    if (!f.date_from || !f.date_to) return setMsg({ texto: 'Escolha o período (de / até).', tipo: 'err' })
    if (f.date_to < f.date_from) return setMsg({ texto: 'A data final não pode ser antes da inicial.', tipo: 'err' })

    const valor = parseMoney(f.amount)
    if (isNaN(valor) || valor < 0) return setMsg({ texto: 'Informe um valor válido.', tipo: 'err' })
    if (f.kind === 'percent' && valor > 100) return setMsg({ texto: 'O desconto não pode passar de 100%.', tipo: 'err' })
    if (valor === 0) return setMsg({ texto: f.kind === 'percent' ? 'O desconto precisa ser maior que zero.' : 'O preço precisa ser maior que zero.', tipo: 'err' })

    const payload = {
      property_id: property.id,
      label: f.label.trim(),
      kind: f.kind,
      amount: valor,
      date_from: f.date_from,
      date_to: f.date_to,
      weekdays: f.weekdays, // vazio = todos os dias
      active: true,
    }
    setSalvando(true)
    const r = await executar(f.id
      ? supabase.from('promotions').update(payload).eq('id', f.id)
      : supabase.from('promotions').insert([payload]))
    setSalvando(false)
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    setF(vazio)
    setMsg({ texto: 'Promoção salva.', tipo: 'ok' })
    router.refresh()
  }

  const editar = (p: any) => {
    setMsg(null)
    setF({
      id: p.id, label: p.label, kind: p.kind, amount: String(p.amount),
      date_from: p.date_from, date_to: p.date_to, weekdays: p.weekdays ?? [],
    })
  }

  const apagar = async (p: any) => {
    if (!(await confirm('Apagar promoção?', `"${p.label}" sai do site na hora.`))) return
    const r = await executar(supabase.from('promotions').delete().eq('id', p.id))
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    router.refresh()
  }

  const alternar = async (p: any) => {
    const r = await executar(supabase.from('promotions').update({ active: !p.active }).eq('id', p.id))
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    router.refresh()
  }

  const resumoDias = (w: number[]) => {
    if (!w || w.length === 0 || w.length === 7) return 'todos os dias'
    return w.slice().sort().map(n => DIAS[n].curto).join(', ')
  }

  return (
    <div style={{
      backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '28px', marginTop: '24px',
    }}>
      <ConfirmModal />

      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          backgroundColor: 'var(--purple-dim)', color: 'var(--accent)', borderRadius: '6px',
          padding: '3px 12px', fontSize: '13px', fontWeight: 600,
        }}>07</span>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Promoções</h2>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.55 }}>
        Ofertas com preço fixo ou desconto em %, sobre um período e nos dias que você escolher.
        Aparecem como oferta no site — não como feriado.
      </p>

      <form onSubmit={salvar} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <Campo label="Nome da oferta" style={{ gridColumn: '1 / -1' }}>
            {id => (
              <input id={id} type="text" value={f.label} placeholder="Ex: Oferta de agosto"
                onChange={e => set('label', e.target.value)} style={input} />
            )}
          </Campo>
          <Campo label="De">
            {id => <input id={id} type="date" value={f.date_from} onChange={e => set('date_from', e.target.value)} style={input} />}
          </Campo>
          <Campo label="Até">
            {id => <input id={id} type="date" value={f.date_to} onChange={e => set('date_to', e.target.value)} style={input} />}
          </Campo>
          <Campo label="Tipo">
            {id => (
              <select id={id} value={f.kind} onChange={e => set('kind', e.target.value)} style={input}>
                <option value="percent">Desconto em %</option>
                <option value="fixed">Preço fixo por noite</option>
              </select>
            )}
          </Campo>
          <Campo label={f.kind === 'percent' ? 'Desconto (%)' : 'Preço da diária (R$)'}>
            {id => f.kind === 'percent'
              ? <input id={id} type="number" min="0" max="100" value={f.amount}
                  onChange={e => set('amount', e.target.value)} placeholder="ex: 20" style={input} />
              : <MoneyInput id={id} value={f.amount} onChange={v => set('amount', v)} style={input} />}
          </Campo>
        </div>

        {/* Dias da semana */}
        <div style={{ marginBottom: '18px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>
            Vale em quais dias
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {DIAS.map(d => {
              const on = f.weekdays.length === 0 || f.weekdays.includes(d.n)
              const marcado = f.weekdays.includes(d.n)
              return (
                <button
                  key={d.n} type="button" onClick={() => toggleDia(d.n)}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', minWidth: '48px',
                    border: `1px solid ${marcado ? 'var(--purple)' : 'var(--border)'}`,
                    backgroundColor: marcado ? 'var(--purple)' : 'var(--bg)',
                    color: marcado ? '#fff' : (f.weekdays.length === 0 ? 'var(--muted)' : 'var(--muted)'),
                    opacity: f.weekdays.length === 0 ? 0.55 : 1,
                  }}
                >
                  {d.curto}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              ['Todos os dias', [] as number[]],
              ['Só dias de semana (dom–qui)', [0, 1, 2, 3, 4]],
              ['Só fim de semana (sex/sáb)', [5, 6]],
            ].map(([txt, dias]) => (
              <button key={txt as string} type="button" onClick={() => preset(dias as number[])}
                style={{
                  padding: '5px 11px', borderRadius: '999px', fontSize: '12px', cursor: 'pointer',
                  border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--muted)',
                }}>
                {txt as string}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '8px' }}>
            Nenhum dia marcado = vale todos os dias do período.
          </p>
        </div>

        {msg && (
          <p style={{ fontSize: '13.5px', fontWeight: 500, marginBottom: '12px',
            color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
            {msg.texto}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {f.id && (
            <button type="button" onClick={() => { setF(vazio); setMsg(null) }} style={{
              padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)',
              backgroundColor: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}>Cancelar</button>
          )}
          <button type="submit" disabled={salvando} style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--purple)',
            color: '#fff', fontWeight: 600, fontSize: '14px', cursor: salvando ? 'not-allowed' : 'pointer',
            opacity: salvando ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '7px',
          }}>
            <PlusCircle size={15} /> {f.id ? 'Salvar alterações' : 'Criar promoção'}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div>
        {doImovel.map((p: any) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            padding: '14px 0', borderBottom: '1px solid var(--border)', opacity: p.active ? 1 : 0.5,
          }}>
            <Tag size={16} color="var(--accent)" style={{ marginTop: '3px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>
                {p.label}
                <span style={{ color: 'var(--success)', marginLeft: '8px' }}>
                  {p.kind === 'percent' ? `${Number(p.amount)}% off` : formatCurrency(Number(p.amount))}
                </span>
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>
                {formatDate(p.date_from)} até {formatDate(p.date_to)} · {resumoDias(p.weekdays)}
              </p>
            </div>
            <button onClick={() => alternar(p)} style={{
              background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
              border: `1px solid ${p.active ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
              color: p.active ? 'var(--success)' : 'var(--muted)',
              backgroundColor: p.active ? 'rgba(34,197,94,0.12)' : 'transparent',
            }}>
              {p.active ? 'Ativa' : 'Pausada'}
            </button>
            <button onClick={() => editar(p)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
              <Pencil size={15} />
            </button>
            <button onClick={() => apagar(p)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {doImovel.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '14px', padding: '14px 0' }}>
            Nenhuma promoção nesta cabana ainda.
          </p>
        )}
      </div>
    </div>
  )
}
