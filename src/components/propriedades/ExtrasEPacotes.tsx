"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { Campo } from "@/components/ui/Campo"
import { parseMoney } from "@/lib/money"
import { executar } from "@/lib/salvar"
import { useConfirm } from "@/components/ConfirmModal"
import { Pencil, Trash2, PlusCircle } from "lucide-react"

const input = {
  backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '10px 13px', color: 'var(--text)', fontSize: '15px', width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
}

/**
 * Cardápio de consumo e pacotes românticos.
 *
 * As duas tabelas já existiam com preço real (12 itens e 8 pacotes na Doce
 * Encanto), mas não tinham tela: para mudar o preço do fondue era preciso
 * mexer no banco.
 */
export function ExtrasEPacotes({ tenantId, extras, pacotes }: any) {
  const supabase = createClient()
  const router = useRouter()
  const { ConfirmModal, confirm } = useConfirm()

  const [aba, setAba] = useState<'extras' | 'pacotes'>('extras')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string, tipo: 'ok' | 'err' } | null>(null)

  const extraVazio = { id: null as string | null, label: '', price: '', unit: 'unidade', note: '' }
  const pacoteVazio = { id: null as string | null, label: '', price: '', description: '' }
  const [extra, setExtra] = useState(extraVazio)
  const [pacote, setPacote] = useState(pacoteVazio)

  const salvarExtra = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!extra.label.trim()) return setMsg({ texto: 'Dê um nome ao item.', tipo: 'err' })

    // Preço em branco é válido aqui: "Vinhos — valor na garrafa" já existe assim.
    let preco: number | null = null
    if (extra.price.trim() !== '') {
      preco = parseMoney(extra.price)
      if (isNaN(preco) || preco < 0) return setMsg({ texto: 'Preço inválido. Use por exemplo 150 ou 12,50.', tipo: 'err' })
    }

    const payload = {
      tenant_id: tenantId,
      label: extra.label.trim(),
      price: preco,
      unit: extra.unit.trim() || null,
      note: extra.note.trim() || null,
    }
    setSalvando(true)
    const r = await executar(extra.id
      ? supabase.from('extras').update(payload).eq('id', extra.id)
      : supabase.from('extras').insert([payload]))
    setSalvando(false)
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    setExtra(extraVazio)
    setMsg({ texto: 'Item salvo.', tipo: 'ok' })
    router.refresh()
  }

  const salvarPacote = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!pacote.label.trim()) return setMsg({ texto: 'Dê um nome ao pacote.', tipo: 'err' })
    if (!pacote.description.trim()) return setMsg({ texto: 'Descreva o que vai no pacote.', tipo: 'err' })
    const preco = parseMoney(pacote.price)
    if (isNaN(preco) || preco <= 0) return setMsg({ texto: 'Informe um preço maior que zero.', tipo: 'err' })

    const payload = {
      tenant_id: tenantId,
      label: pacote.label.trim(),
      price: preco,
      description: pacote.description.trim(),
    }
    setSalvando(true)
    const r = await executar(pacote.id
      ? supabase.from('romantic_packages').update(payload).eq('id', pacote.id)
      : supabase.from('romantic_packages').insert([payload]))
    setSalvando(false)
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    setPacote(pacoteVazio)
    setMsg({ texto: 'Pacote salvo.', tipo: 'ok' })
    router.refresh()
  }

  const apagar = async (tabela: 'extras' | 'romantic_packages', row: any) => {
    const nome = row.label
    if (!(await confirm('Apagar?', `"${nome}" sai do site na hora. Isso não pode ser desfeito.`))) return
    const r = await executar(supabase.from(tabela).delete().eq('id', row.id))
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    router.refresh()
  }

  const abaBtn = (a: typeof aba, texto: string, n: number) => (
    <button
      onClick={() => { setAba(a); setMsg(null) }}
      style={{
        padding: '9px 16px', background: 'none', border: 'none',
        borderBottom: aba === a ? '2px solid var(--purple)' : '2px solid transparent',
        color: aba === a ? 'var(--text)' : 'var(--muted)',
        cursor: 'pointer', fontWeight: aba === a ? 600 : 500, fontSize: '14px',
      }}
    >
      {texto} ({n})
    </button>
  )

  const linha = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '13px 0', borderBottom: '1px solid var(--border)',
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
        }}>06</span>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Consumo e pacotes</h2>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.55 }}>
        O que o hóspede pode pedir além da diária. Vale para todas as cabanas.
      </p>

      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {abaBtn('extras', 'Cardápio', extras.length)}
        {abaBtn('pacotes', 'Pacotes românticos', pacotes.length)}
      </div>

      {msg && (
        <p style={{
          fontSize: '13.5px', fontWeight: 500, marginBottom: '14px',
          color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
        }}>
          {msg.texto}
        </p>
      )}

      {aba === 'extras' ? (
        <>
          <form onSubmit={salvarExtra} style={{ marginBottom: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <Campo label="Item">
                {id => (
                  <input id={id} type="text" value={extra.label} placeholder="Ex: Fondue"
                    onChange={e => setExtra({ ...extra, label: e.target.value })} style={input} />
                )}
              </Campo>
              <Campo label="Preço (R$)" hint="Vazio = 'sob consulta'.">
                {id => <MoneyInput id={id} value={extra.price} onChange={v => setExtra({ ...extra, price: v })} style={input} />}
              </Campo>
              <Campo label="Unidade">
                {id => (
                  <input id={id} type="text" value={extra.unit} placeholder="unidade, garrafa, saco..."
                    onChange={e => setExtra({ ...extra, unit: e.target.value })} style={input} />
                )}
              </Campo>
              <Campo label="Observação">
                {id => (
                  <input id={id} type="text" value={extra.note} placeholder="opcional"
                    onChange={e => setExtra({ ...extra, note: e.target.value })} style={input} />
                )}
              </Campo>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {extra.id && (
                <button type="button" onClick={() => setExtra(extraVazio)} style={{
                  padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                  backgroundColor: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                }}>Cancelar</button>
              )}
              <button type="submit" disabled={salvando} style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--purple)', color: '#fff', fontWeight: 600, fontSize: '14px',
                cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: '7px',
              }}>
                <PlusCircle size={15} /> {extra.id ? 'Salvar alterações' : 'Adicionar item'}
              </button>
            </div>
          </form>

          <div>
            {extras.map((it: any) => (
              <div key={it.id} style={linha}>
                <span style={{ flex: 1, color: 'var(--text)', fontSize: '15px', fontWeight: 500, minWidth: 0 }}>
                  {it.label}
                  {it.unit && <span style={{ color: 'var(--muted)', fontSize: '13px' }}> / {it.unit}</span>}
                  {it.note && <span style={{ display: 'block', color: 'var(--muted)', fontSize: '12.5px' }}>{it.note}</span>}
                </span>
                <span style={{ color: it.price == null ? 'var(--muted)' : 'var(--success)', fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap' }}>
                  {it.price == null ? 'sob consulta' : formatCurrency(Number(it.price))}
                </span>
                <button onClick={() => setExtra({
                  id: it.id, label: it.label, price: it.price == null ? '' : String(it.price),
                  unit: it.unit ?? '', note: it.note ?? '',
                })} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => apagar('extras', it)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {extras.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '14px', padding: '16px 0' }}>Nenhum item no cardápio ainda.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={salvarPacote} style={{ marginBottom: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <Campo label="Nome do pacote">
                {id => (
                  <input id={id} type="text" value={pacote.label} placeholder="Ex: Noite Inesquecível"
                    onChange={e => setPacote({ ...pacote, label: e.target.value })} style={input} />
                )}
              </Campo>
              <Campo label="Preço (R$)">
                {id => <MoneyInput id={id} value={pacote.price} onChange={v => setPacote({ ...pacote, price: v })} style={input} />}
              </Campo>
              <Campo label="O que está incluso" style={{ gridColumn: '1 / -1' }}>
                {id => (
                  <textarea id={id} rows={3} value={pacote.description}
                    placeholder="Pétalas de rosas, vela aromática, espumante..."
                    onChange={e => setPacote({ ...pacote, description: e.target.value })}
                    style={{ ...input, resize: 'vertical' }} />
                )}
              </Campo>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {pacote.id && (
                <button type="button" onClick={() => setPacote(pacoteVazio)} style={{
                  padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                  backgroundColor: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                }}>Cancelar</button>
              )}
              <button type="submit" disabled={salvando} style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--purple)', color: '#fff', fontWeight: 600, fontSize: '14px',
                cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: '7px',
              }}>
                <PlusCircle size={15} /> {pacote.id ? 'Salvar alterações' : 'Adicionar pacote'}
              </button>
            </div>
          </form>

          <div>
            {pacotes.map((pk: any) => (
              <div key={pk.id} style={{ ...linha, alignItems: 'flex-start' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>{pk.label}</span>
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginTop: '3px', lineHeight: 1.45 }}>
                    {pk.description}
                  </span>
                </span>
                <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap' }}>
                  {formatCurrency(Number(pk.price))}
                </span>
                <button onClick={() => setPacote({
                  id: pk.id, label: pk.label, price: String(pk.price), description: pk.description ?? '',
                })} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => apagar('romantic_packages', pk)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {pacotes.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '14px', padding: '16px 0' }}>Nenhum pacote cadastrado ainda.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
