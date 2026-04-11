"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameMonth, isToday, startOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"

function MiniCalendar({ propertyId, blocks, onToggleBlock }: any) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))

  const s = startOfWeek(startOfMonth(currentMonth))
  const e = endOfWeek(endOfMonth(startOfMonth(currentMonth)))
  const days = eachDayOfInterval({ start: s, end: e })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}>{'<'}</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>{'>'}</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 500, textAlign: 'center', padding: '6px' }}>{d}</div>
        ))}
        {days.map(day => {
          const isCurrMonth = isSameMonth(day, currentMonth)
          const dateStr = format(day, 'yyyy-MM-dd')
          const block = blocks.find((b: any) => b.property_id === propertyId && b.date === dateStr)
          const today = isToday(day)
          
          let cellStyle: any = {
            backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', 
            padding: '8px', textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px',
            opacity: isCurrMonth ? 1 : 0.3
          }
          
          if (block) {
            cellStyle = { ...cellStyle, backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
          } else if (today) {
            cellStyle = { ...cellStyle, border: '1px solid var(--purple)', color: 'var(--accent)' }
          }
          
          return (
            <button
              key={dateStr}
              onClick={() => onToggleBlock(propertyId, dateStr, block)}
              style={cellStyle}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PropriedadesClient({ initialProperties, tenantName, initialRules, initialBlocks }: any) {
  const supabase = createClient()
  const router = useRouter()
  const [properties, setProperties] = useState(initialProperties)
  const [activeTab, setActiveTab] = useState(initialProperties[0]?.id)
  
  // Preços
  const [savingPrices, setSavingPrices] = useState(false)
  
  // Regras
  const [rules, setRules] = useState(initialRules)
  const [newRule, setNewRule] = useState({ label: '', price: '', valid_from: '', valid_until: '' })
  const [savingRule, setSavingRule] = useState(false)

  // Bloqueios
  const [blocks, setBlocks] = useState(initialBlocks)
  const [togglingBlock, setTogglingBlock] = useState(false)

  const activeProp = properties.find((p: any) => p.id === activeTab)
  const activeRules = rules.filter((r: any) => r.property_id === activeTab)

  const handlePriceChange = (field: string, value: any) => {
    setProperties(properties.map((p: any) => p.id === activeTab ? { ...p, [field]: value } : p))
  }

  const savePrices = async () => {
    if (!activeProp) return
    setSavingPrices(true)
    await supabase.from('properties').update({
      base_price_weekday: activeProp.base_price_weekday,
      base_price_weekend: activeProp.base_price_weekend,
      single_night_weekday_price: activeProp.single_night_weekday_price
    }).eq('id', activeProp.id)
    setSavingPrices(false)
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeProp) return
    setSavingRule(true)
    const ruleObj = {
      property_id: activeProp.id,
      label: newRule.label,
      price: Number(newRule.price),
      valid_from: newRule.valid_from,
      valid_until: newRule.valid_until
    }
    const { data } = await supabase.from('pricing_rules').insert([ruleObj]).select()
    if (data && data.length > 0) {
      setRules([...rules, data[0]])
      setNewRule({ label: '', price: '', valid_from: '', valid_until: '' })
    }
    setSavingRule(false)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Remover esta regra especial?")) return
    await supabase.from('pricing_rules').delete().eq('id', id)
    setRules(rules.filter((r: any) => r.id !== id))
  }

  const handleToggleBlock = async (propertyId: string, date: string, existingBlock: any) => {
    if (togglingBlock) return
    setTogglingBlock(true)
    if (existingBlock) {
      await supabase.from('blocked_dates').delete().eq('id', existingBlock.id)
      setBlocks(blocks.filter((b: any) => b.id !== existingBlock.id))
    } else {
      const { data } = await supabase.from('blocked_dates').insert([{ property_id: propertyId, date }]).select()
      if (data && data.length > 0) {
        setBlocks([...blocks, data[0]])
      }
    }
    setTogglingBlock(false)
  }

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
        Configurações de Propriedades
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
        Gerencie as tarifas, regras sazonais e bloqueios.
      </p>

      {properties.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--surface)', color: 'var(--muted)' }}>
          Nenhuma propriedade cadastrada.
        </div>
      ) : (
        <div>
          {/* Tabs header */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '32px', overflowX: 'auto' }}>
            {properties.map((p: any) => {
              const isActive = activeTab === p.id 
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveTab(p.id)}
                  style={{
                    backgroundColor: isActive ? 'var(--purple-dim)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                    border: 'none',
                    borderBottom: isActive ? '3px solid var(--purple)' : '3px solid transparent',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: isActive ? '8px 8px 0 0' : '0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.name}
                </button>
              )
            })}
          </div>

          {/* Active Tab Content */}
          {activeProp && (
            <div>
              
              {/* SECTION 1: Preços */}
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ backgroundColor: 'var(--purple-dim)', color: 'var(--accent)', borderRadius: '6px', padding: '3px 12px', fontSize: '13px', fontWeight: 600 }}>01</span>
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Preços base</h2>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Tarifas padrão por tipo de dia.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Dias Úteis (R$)</label>
                    <input 
                      type="number"
                      value={activeProp.base_price_weekday || ''} 
                      onChange={e => handlePriceChange('base_price_weekday', Number(e.target.value))} 
                      style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Fim de Semana (R$)</label>
                    <input 
                      type="number"
                      value={activeProp.base_price_weekend || ''} 
                      onChange={e => handlePriceChange('base_price_weekend', Number(e.target.value))} 
                      style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Isolada Dia Útil (R$)</label>
                    <input 
                      type="number"
                      value={activeProp.single_night_weekday_price || ''} 
                      onChange={e => handlePriceChange('single_night_weekday_price', Number(e.target.value))} 
                      style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={savePrices} disabled={savingPrices} style={{ backgroundColor: 'var(--purple)', color: 'white', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', cursor: 'pointer', marginTop: '16px', fontWeight: 600 }}>
                    {savingPrices ? "Salvando..." : "Salvar Preços"}
                  </button>
                </div>
              </div>

              {/* SECTION 2: Regras Especiais */}
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ backgroundColor: 'var(--purple-dim)', color: 'var(--accent)', borderRadius: '6px', padding: '3px 12px', fontSize: '13px', fontWeight: 600 }}>02</span>
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Regras Especiais e Feriados</h2>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Sobrescreve os preços base num intervalo de datas.</p>
                </div>

                {activeRules.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    {activeRules.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg)' }}>
                        <div>
                          <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>{r.label}</p>
                          <p style={{ color: 'var(--muted)', fontSize: '12px' }}>
                            {formatDate(r.valid_from)} até {formatDate(r.valid_until)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>{formatCurrency(r.price)}<span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)' }}>/noite</span></span>
                          <button onClick={() => handleDeleteRule(r.id)} style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddRule} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Nome da Regra</label>
                    <input required value={newRule.label} onChange={e => setNewRule({...newRule, label: e.target.value})} placeholder="Ex: Páscoa" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Data Inicial</label>
                    <input type="date" required value={newRule.valid_from} onChange={e => setNewRule({...newRule, valid_from: e.target.value})} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Data Final</label>
                    <input type="date" required value={newRule.valid_until} onChange={e => setNewRule({...newRule, valid_until: e.target.value})} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Preço/noite (R$)</label>
                    <input type="number" required value={newRule.price} onChange={e => setNewRule({...newRule, price: e.target.value})} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%', outline: 'none' }} />
                  </div>
                  <button type="submit" disabled={savingRule} style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600, height: '45px' }}>
                    {savingRule ? "..." : "Adicionar"}
                  </button>
                </form>
              </div>

              {/* SECTION 3: Datas Bloqueadas */}
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ backgroundColor: 'var(--purple-dim)', color: 'var(--accent)', borderRadius: '6px', padding: '3px 12px', fontSize: '13px', fontWeight: 600 }}>03</span>
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Datas Bloqueadas</h2>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Dias em vermelho não poderão ser reservados pelos hóspedes (Uso Próprio/Manutenção).</p>
                </div>
                <div style={{ maxWidth: '340px' }}>
                  <MiniCalendar propertyId={activeProp.id} blocks={blocks} onToggleBlock={handleToggleBlock} />
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  )
}
