"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Trash2, Edit2, Copy, Check, X } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameMonth, isToday, startOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useConfirm } from "@/components/ConfirmModal"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { parseMoney } from "@/lib/money"
import { executar } from "@/lib/salvar"
import { BotaoBackup } from "@/components/BotaoBackup"
import { PrecosAvancados } from "@/components/propriedades/PrecosAvancados"
import { CalendarioPrecos } from "@/components/propriedades/CalendarioPrecos"
import { ExtrasEPacotes } from "@/components/propriedades/ExtrasEPacotes"
import { Promocoes } from "@/components/propriedades/Promocoes"
import { PreviaNoites } from "@/components/propriedades/PreviaNoites"
import { noitesDoRegistro, paraArmazenamento, noitesCobertas, descreveNoites, detectarProblemas } from "@/lib/datasEspeciais"

const precoInputStyle = {
  backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
}

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
            cellStyle = { ...cellStyle, backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }
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

export function PropriedadesClient({ initialProperties, tenantName, initialRules, initialBlocks, initialHolidays, initialDailyRates = [], tenantId, initialExtras = [], initialPacotes = [], initialPromotions = [] }: any) {
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
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [editRuleData, setEditRuleData] = useState<any>({})

  // Feriados
  const [holidays, setHolidays] = useState(initialHolidays)
  // Fala em NOITES (primeira/última), não em date_from/date_to. A conversão
  // para os campos do banco acontece no salvar, via paraArmazenamento().
  const [newHoliday, setNewHoliday] = useState({ property_id: '', name: '', primeira: '', ultima: '', price: '', min_nights: '1' })
  const [singleDate, setSingleDate] = useState("")
  const [singleDateOut, setSingleDateOut] = useState("")
  const [savingHoliday, setSavingHoliday] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<string | null>(null)
  const [editHolidayData, setEditHolidayData] = useState<any>({})

  // Bloqueios
  const [blocks, setBlocks] = useState(initialBlocks)
  const [togglingBlock, setTogglingBlock] = useState(false)
  const { ConfirmModal, confirm } = useConfirm()

  const activeProp = properties.find((p: any) => p.id === activeTab)
  const activeRules = rules.filter((r: any) => r.property_id === activeTab)
  const activeHolidays = holidays.filter((h: any) => h.property_id === activeTab)

  // Detecta buraco/duplicata entre registros de mesmo nome (só alerta, nunca
  // corrige sozinho). Contíguas de 1 noite que cobrem tudo não geram aviso.
  const problemasDatas = (() => {
    const out: any[] = []
    const grupos = (lista: any[], campo: string, tipo: 'feriado' | 'regra') => {
      const porNome = new Map<string, any[]>()
      for (const x of lista) {
        const nome = (x[campo] || '').trim()
        const g = porNome.get(nome)
        if (g) g.push(x); else porNome.set(nome, [x])
      }
      for (const [nome, grupo] of porNome) out.push(...detectarProblemas(tipo, nome, grupo))
    }
    grupos(activeHolidays, 'name', 'feriado')
    grupos(activeRules, 'label', 'regra')
    return out
  })()

  const [pricesMsg, setPricesMsg] = useState<{ text: string, type: 'ok' | 'err' } | null>(null)

  const handlePriceChange = (field: string, value: any) => {
    setPricesMsg(null)
    setProperties(properties.map((p: any) => p.id === activeTab ? { ...p, [field]: value } : p))
  }

  const savePrices = async () => {
    if (!activeProp) return
    setPricesMsg(null)

    // Os campos de preço guardam o texto cru para a pessoa poder digitar
    // "800,50"; a conversão acontece aqui. Sem isto, Number("800,50") = NaN
    // e o preço da cabana ia para o banco zerado ou quebrado.
    const campos: [string, string][] = [
      ['base_price_weekday', 'Dias úteis'],
      ['base_price_weekend', 'Fim de semana'],
      ['single_night_weekday_price', 'Isolada dia útil'],
    ]
    const precos: Record<string, number | null> = {}
    for (const [campo, rotulo] of campos) {
      const bruto = activeProp[campo]
      if (bruto === '' || bruto === null || bruto === undefined) {
        precos[campo] = null
        continue
      }
      const n = parseMoney(bruto)
      if (isNaN(n) || n < 0) {
        setPricesMsg({ text: `Preço inválido em "${rotulo}". Use por exemplo 800 ou 800,50.`, type: 'err' })
        return
      }
      precos[campo] = n
    }

    // base_price_weekday e base_price_weekend são obrigatórios no banco
    if (precos.base_price_weekday === null || precos.base_price_weekend === null) {
      setPricesMsg({ text: 'Dias úteis e Fim de semana são obrigatórios.', type: 'err' })
      return
    }

    setSavingPrices(true)
    const { error } = await supabase.from('properties').update({
      ...precos,
      min_nights_weekday: Number(activeProp.min_nights_weekday) || 1,
      min_nights_weekend: Number(activeProp.min_nights_weekend) || 1,
      min_nights_holiday: Number(activeProp.min_nights_holiday) || 1,
    }).eq('id', activeProp.id)
    setSavingPrices(false)

    // Antes o erro era engolido: a dona clicava em salvar e nada acontecia.
    setPricesMsg(error
      ? { text: `Erro ao salvar: ${error.message}`, type: 'err' }
      : { text: 'Preços salvos.', type: 'ok' })
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
    if (!(await confirm("Excluir regra", "Remover esta regra especial?"))) return
    const r = await executar(supabase.from('pricing_rules').delete().eq('id', id))
    if (!r.ok) { setPricesMsg({ text: r.erro, type: 'err' }); return }
    setRules(rules.filter((r: any) => r.id !== id))
  }

  const handleEditRule = (r: any) => {
    setEditingRule(r.id)
    // Converte armazenamento -> noites. Regra é INCLUSIVA: última noite = valid_until.
    const { primeira, ultima } = noitesDoRegistro('regra', r)
    setEditRuleData({ ...r, primeira, ultima })
  }

  const handleSaveRuleEdit = async () => {
    if (editRuleData.ultima < editRuleData.primeira) {
      setPricesMsg({ text: 'A última noite não pode ser antes da primeira.', type: 'err' }); return
    }
    setSavingRule(true)
    const { data, error } = await supabase.from('pricing_rules').update({
      label: editRuleData.label,
      price: Number(editRuleData.price),
      ...paraArmazenamento('regra', editRuleData.primeira, editRuleData.ultima),
    }).eq('id', editRuleData.id).select()
    setSavingRule(false)
    if (error) { setPricesMsg({ text: error.message, type: 'err' }); return }
    if (data && data.length > 0) {
      setRules(rules.map((r: any) => r.id === editRuleData.id ? data[0] : r))
    }
    setEditingRule(null)
  }

  const handleReplicateRule = async (r: any) => {
    if (!(await confirm("Replicar", "Replicar esta regra para as outras propriedades?"))) return;
    setSavingRule(true)
    const otherProps = properties.filter((p: any) => p.id !== activeTab)
    const newRules = otherProps.map((p: any) => ({
      property_id: p.id,
      label: r.label,
      price: r.price,
      valid_from: r.valid_from,
      valid_until: r.valid_until
    }))
    const { data } = await supabase.from('pricing_rules').insert(newRules).select()
    if (data && data.length > 0) {
      setRules([...rules, ...data])
      alert("Regra replicada com sucesso!")
    }
    setSavingRule(false)
  }

  const handleAddHoliday = async (e: React.FormEvent, propertyId: string) => {
    e.preventDefault()
    setPricesMsg(null)
    if (!newHoliday.primeira || !newHoliday.ultima) {
      setPricesMsg({ text: 'Escolha a primeira e a última noite.', type: 'err' }); return
    }
    if (newHoliday.ultima < newHoliday.primeira) {
      setPricesMsg({ text: 'A última noite não pode ser antes da primeira.', type: 'err' }); return
    }
    setSavingHoliday(true)
    const holidayObj = {
      property_id: propertyId,
      name: newHoliday.name,
      ...paraArmazenamento('feriado', newHoliday.primeira, newHoliday.ultima),
      price: newHoliday.price ? Number(newHoliday.price) : null,
      min_nights: Number(newHoliday.min_nights) || 1,
    }
    const { data, error } = await supabase.from('holidays').insert([holidayObj]).select()
    setSavingHoliday(false)
    if (error) { setPricesMsg({ text: error.message, type: 'err' }); return }
    if (data && data.length > 0) {
      setHolidays([...holidays, data[0]])
      setNewHoliday({ property_id: '', name: '', primeira: '', ultima: '', price: '', min_nights: '1' })
    }
  }

  const handleQuickAddHoliday = async (e: React.FormEvent, form: HTMLFormElement, propertyId: string) => {
    e.preventDefault()
    if (!singleDate || !singleDateOut) return
    if (singleDateOut <= singleDate) {
      alert("A data de check-out deve ser posterior ao check-in.")
      return
    }
    setSavingHoliday(true)
    const priceInput = form.elements.namedItem('singlePrice') as HTMLInputElement;
    const price = priceInput.value;

    const holidayObj = {
      property_id: propertyId,
      name: 'Diária Única (Exceção)',
      date_from: singleDate,
      date_to: singleDateOut,
      price: price ? Number(price) : null,
      min_nights: 1,
    }
    const { data } = await supabase.from('holidays').insert([holidayObj]).select()
    if (data && data.length > 0) {
      setHolidays([...holidays, data[0]])
      form.reset()
      setSingleDate("")
      setSingleDateOut("")
    }
    setSavingHoliday(false)
  }

  const handleDeleteHoliday = async (id: string) => {
    if (!(await confirm("Excluir feriado", "Remover este feriado?"))) return
    const r = await executar(supabase.from('holidays').delete().eq('id', id))
    if (!r.ok) { setPricesMsg({ text: r.erro, type: 'err' }); return }
    setHolidays(holidays.filter((h: any) => h.id !== id))
  }

  const handleEditHoliday = (h: any) => {
    setEditingHoliday(h.id)
    // Feriado é EXCLUSIVO: última noite = date_to - 1.
    const { primeira, ultima } = noitesDoRegistro('feriado', h)
    setEditHolidayData({ ...h, primeira, ultima })
  }

  const handleSaveHolidayEdit = async () => {
    if (editHolidayData.ultima < editHolidayData.primeira) {
      setPricesMsg({ text: 'A última noite não pode ser antes da primeira.', type: 'err' }); return
    }
    setSavingHoliday(true)
    const { data, error } = await supabase.from('holidays').update({
      name: editHolidayData.name,
      ...paraArmazenamento('feriado', editHolidayData.primeira, editHolidayData.ultima),
      price: editHolidayData.price ? Number(editHolidayData.price) : null,
      min_nights: Number(editHolidayData.min_nights) || 1,
    }).eq('id', editHolidayData.id).select()
    setSavingHoliday(false)
    if (error) { setPricesMsg({ text: error.message, type: 'err' }); return }
    if (data && data.length > 0) {
      setHolidays(holidays.map((h: any) => h.id === editHolidayData.id ? data[0] : h))
    }
    setEditingHoliday(null)
  }

  const handleReplicateHoliday = async (h: any) => {
    if (!(await confirm("Replicar", "Replicar este feriado para as outras propriedades?"))) return;
    setSavingHoliday(true)
    const otherProps = properties.filter((p: any) => p.id !== activeTab)
    const newHolidays = otherProps.map((p: any) => ({
      property_id: p.id,
      name: h.name,
      date_from: h.date_from,
      date_to: h.date_to,
      price: h.price,
      min_nights: h.min_nights
    }))
    const { data } = await supabase.from('holidays').insert(newHolidays).select()
    if (data && data.length > 0) {
      setHolidays([...holidays, ...data])
      alert("Feriado replicado com sucesso!")
    }
    setSavingHoliday(false)
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
      <ConfirmModal />
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
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Dias Úteis (R$)</label>
                    <MoneyInput
                      value={activeProp.base_price_weekday == null ? '' : String(activeProp.base_price_weekday)}
                      onChange={v => handlePriceChange('base_price_weekday', v)}
                      style={precoInputStyle}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Fim de Semana (R$)</label>
                    <MoneyInput
                      value={activeProp.base_price_weekend == null ? '' : String(activeProp.base_price_weekend)}
                      onChange={v => handlePriceChange('base_price_weekend', v)}
                      style={precoInputStyle}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Isolada Dia Útil (R$)</label>
                    <MoneyInput
                      value={activeProp.single_night_weekday_price == null ? '' : String(activeProp.single_night_weekday_price)}
                      onChange={v => handlePriceChange('single_night_weekday_price', v)}
                      style={precoInputStyle}
                    />
                  </div>
                </div>

                {pricesMsg && (
                  <p style={{
                    marginTop: '14px', fontSize: '13px', fontWeight: 500,
                    color: pricesMsg.type === 'ok' ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {pricesMsg.text}
                  </p>
                )}

                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                  <h3 style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Mínimo de Noites</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Semana (dom-qui)</label>
                      <input
                        type="number"
                        value={activeProp.min_nights_weekday || ''}
                        onChange={e => handlePriceChange('min_nights_weekday', Number(e.target.value))}
                        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none' }}
                      />
                      <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>Aplica-se a reservas iniciando neste período.</p>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Final de semana</label>
                      <input
                        type="number"
                        value={activeProp.min_nights_weekend || ''}
                        onChange={e => handlePriceChange('min_nights_weekend', Number(e.target.value))}
                        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none' }}
                      />
                      <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>Aplica-se a reservas iniciando neste período.</p>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Feriados</label>
                      <input
                        type="number"
                        value={activeProp.min_nights_holiday || ''}
                        onChange={e => handlePriceChange('min_nights_holiday', Number(e.target.value))}
                        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none' }}
                      />
                      <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>Aplica-se a reservas iniciando neste período.</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={savePrices} disabled={savingPrices} style={{ backgroundColor: 'var(--purple)', color: 'white', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', cursor: 'pointer', marginTop: '16px', fontWeight: 600 }}>
                    {savingPrices ? "Salvando..." : "Salvar Preços"}
                  </button>
                </div>
              </div>

              <PrecosAvancados property={activeProp} />

              <CalendarioPrecos
                property={activeProp}
                dailyRates={initialDailyRates}
                rules={rules}
                holidays={holidays}
              />

              <Promocoes property={activeProp} promotions={initialPromotions} />

              {/* SECTION 2: Regras Especiais e Feriados */}
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ backgroundColor: 'var(--purple-dim)', color: 'var(--accent)', borderRadius: '6px', padding: '3px 12px', fontSize: '13px', fontWeight: 600 }}>02</span>
                    <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Regras Especiais e Feriados</h2>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Sobrescreve os preços base e mínimo de noites em períodos específicos.</p>
                </div>

                {problemasDatas.length > 0 && (
                  <div style={{
                    backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)',
                    borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
                  }}>
                    <p style={{ color: 'var(--warning)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                      ⚠️ Atenção nestas datas
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text)', fontSize: '13px', lineHeight: 1.6 }}>
                      {problemasDatas.map((p: any, i: number) => (
                        <li key={i}>
                          {p.kind === 'buraco'
                            ? <>Em <strong>{p.nomeGrupo}</strong>, {p.faltando.length === 1 ? 'a noite' : 'as noites'} de{' '}
                                <strong>{descreveNoites(p.faltando).split(': ')[1]}</strong>{' '}
                                {p.faltando.length === 1 ? 'ficou de fora' : 'ficaram de fora'} e serão vendidas pelo preço normal.
                                Edite uma das regras e estenda a <strong>última noite</strong> para cobrir.</>
                            : <>Regra <strong>duplicada</strong> ({p.resumo}) — tem entrada repetida. Apague uma delas.</>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeRules.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    {activeRules.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg)' }}>
                        {editingRule === r.id ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <input value={editRuleData.label} onChange={e => setEditRuleData({...editRuleData, label: e.target.value})} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px', width: '140px' }} placeholder="Nome da Regra" />
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--muted)', fontSize: '11px' }}>Primeira noite
                              <input type="date" value={editRuleData.primeira} onChange={e => setEditRuleData({...editRuleData, primeira: e.target.value})} style={{ colorScheme: 'light', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px' }} /></label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--muted)', fontSize: '11px' }}>Última noite
                              <input type="date" value={editRuleData.ultima} onChange={e => setEditRuleData({...editRuleData, ultima: e.target.value})} style={{ colorScheme: 'light', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px' }} /></label>
                            <input type="number" value={editRuleData.price || ''} onChange={e => setEditRuleData({...editRuleData, price: e.target.value})} placeholder="Preço" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px', width: '100px' }} />
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                              <button onClick={handleSaveRuleEdit} style={{ backgroundColor: 'var(--purple)', color: 'white', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={16} /></button>
                              <button onClick={() => setEditingRule(null)} style={{ backgroundColor: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>{r.label}</p>
                              <p style={{ color: 'var(--muted)', fontSize: '12px' }}>
                                {descreveNoites(noitesCobertas('regra', r))}
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>{formatCurrency(r.price)}<span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)' }}>/noite</span></span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleReplicateRule(r)} title="Replicar para outras propriedades" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: 'var(--purple)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Copy size={16} />
                                </button>
                                <button onClick={() => handleEditRule(r)} title="Editar regra" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--info-strong)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteRule(r.id)} title="Excluir regra" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                  <h3 style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Feriados</h3>
                  {activeHolidays.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                      {activeHolidays.map((h: any) => (
                        <div key={h.id} style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg)' }}>
                          {editingHoliday === h.id ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px' }}>
                              <input value={editHolidayData.name} onChange={e => setEditHolidayData({...editHolidayData, name: e.target.value})} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px', width: '140px' }} placeholder="Nome" />
                              <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--muted)', fontSize: '11px' }}>Primeira noite
                                <input type="date" value={editHolidayData.primeira} onChange={e => setEditHolidayData({...editHolidayData, primeira: e.target.value})} style={{ colorScheme: 'light', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px' }} /></label>
                              <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--muted)', fontSize: '11px' }}>Última noite
                                <input type="date" value={editHolidayData.ultima} onChange={e => setEditHolidayData({...editHolidayData, ultima: e.target.value})} style={{ colorScheme: 'light', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px' }} /></label>
                              <input type="number" value={editHolidayData.price || ''} onChange={e => setEditHolidayData({...editHolidayData, price: e.target.value})} placeholder="Preço" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px', width: '100px' }} />
                              <input type="number" value={editHolidayData.min_nights || ''} onChange={e => setEditHolidayData({...editHolidayData, min_nights: e.target.value})} placeholder="Mín. noites" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text)', fontSize: '14px', width: '80px' }} />
                              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                <button onClick={handleSaveHolidayEdit} style={{ backgroundColor: 'var(--purple)', color: 'white', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={16} /></button>
                                <button onClick={() => setEditingHoliday(null)} style={{ backgroundColor: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              position: 'relative',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '16px'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}>
                                <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>{h.name}</p>
                                {h.price && (
                                  <span style={{ color: 'var(--violet-soft)', fontWeight: 500, fontSize: '14px' }}>
                                    {formatCurrency(h.price)}
                                  </span>
                                )}
                                <p style={{ color: 'var(--muted)', fontSize: '12px', opacity: 0.7 }}>
                                  {descreveNoites(noitesCobertas('feriado', h))}
                                </p>
                                <p style={{ color: 'var(--muted)', fontSize: '12px', opacity: 0.7 }}>
                                  {h.min_nights > 1 ? `Mín. ${h.min_nights} noites (para check-in nestas datas)` : 'Mín. 1 noite'}
                                </p>
                              </div>
                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                flexShrink: 0,
                                alignSelf: 'flex-start',
                                marginLeft: 'auto'
                              }}>
                                <button onClick={() => handleReplicateHoliday(h)} title="Replicar para outras propriedades" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: 'var(--purple)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Copy size={16} />
                                </button>
                                <button onClick={() => handleEditHoliday(h)} title="Editar feriado" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--info-strong)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteHoliday(h.id)} title="Excluir feriado" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={(e) => handleAddHoliday(e, activeProp.id)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Nome do Feriado</label>
                      <input required value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} placeholder="Ex: Natal" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Primeira noite</label>
                      <input className="w-full max-w-full box-border" type="date" required value={newHoliday.primeira} onChange={e => setNewHoliday({...newHoliday, primeira: e.target.value})} style={{ colorScheme: 'light', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', minHeight: '48px', outline: 'none' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Última noite</label>
                      <input className="w-full max-w-full box-border" type="date" required value={newHoliday.ultima} onChange={e => setNewHoliday({...newHoliday, ultima: e.target.value})} style={{ colorScheme: 'light', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', minHeight: '48px', outline: 'none' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Preço/noite (R$)</label>
                      <input type="number" value={newHoliday.price} onChange={e => setNewHoliday({...newHoliday, price: e.target.value})} placeholder="Opcional" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Mínimo de noites</label>
                      <input type="number" required min="1" value={newHoliday.min_nights} onChange={e => setNewHoliday({...newHoliday, min_nights: e.target.value})} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                      <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px', lineHeight: 1.4 }}>Aplica-se a quem faz CHECK-IN nestas datas.</p>
                    </div>
                    <button type="submit" disabled={savingHoliday} style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600, height: '45px' }}>
                      {savingHoliday ? "..." : "Adicionar Feriado"}
                    </button>
                    {newHoliday.primeira && newHoliday.ultima && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <PreviaNoites
                          property={activeProp} dailyRates={initialDailyRates} rules={rules} holidays={holidays}
                          primeira={newHoliday.primeira} ultima={newHoliday.ultima}
                          precoDraft={newHoliday.price} minDraft={newHoliday.min_nights}
                        />
                      </div>
                    )}
                  </form>

                  {/* Formulário rápido para Diária Única */}
                  <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <h3 style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Liberar Diária Única (Exceção)</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>Use para liberar apenas 1 noite em um dia que normalmente exigiria mais (ex: Sexta-feira que sobrou de um feriado).</p>
                    <form onSubmit={(e) => handleQuickAddHoliday(e, e.target as HTMLFormElement, activeProp.id)} style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1', minWidth: '180px' }}>
                        <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Data de check-in</label>
                        <input className="w-full max-w-full box-border" name="singleDate" type="date" required value={singleDate} onChange={e => setSingleDate(e.target.value)} style={{ colorScheme: 'light', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', minHeight: '48px', outline: 'none' }} />
                      </div>
                      <div style={{ flex: '1', minWidth: '180px' }}>
                        <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Data de check-out</label>
                        <input className="w-full max-w-full box-border" name="singleDateOut" type="date" required value={singleDateOut} onChange={e => setSingleDateOut(e.target.value)} style={{ colorScheme: 'light', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', minHeight: '48px', outline: 'none' }} />
                      </div>
                      <div style={{ flex: '1', minWidth: '180px' }}>
                        <label style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>Preço/noite (R$)</label>
                        <input name="singlePrice" type="number" placeholder="Opcional" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text)', fontSize: '16px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <button type="submit" disabled={savingHoliday} style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--purple)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600, height: '45px' }}>
                        {savingHoliday ? "..." : "+ Liberar Data"}
                      </button>
                    </form>
                  </div>
                </div>
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

      <ExtrasEPacotes tenantId={tenantId} extras={initialExtras} pacotes={initialPacotes} />

      <div style={{ marginTop: '32px' }}>
        <BotaoBackup />
      </div>
    </div>
  )
}
