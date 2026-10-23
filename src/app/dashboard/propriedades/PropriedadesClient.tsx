"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Trash2, Edit2, Copy, Tag, CalendarDays, PartyPopper, Percent, Lock, Gift } from "lucide-react"
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
import { EditarDataEspecial } from "@/components/propriedades/EditarDataEspecial"
import { Campo } from "@/components/ui/Campo"
import { AriumDatePicker } from "@/components/ui/DatePicker"
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
  const [newHoliday, setNewHoliday] = useState<any>({ property_id: '', name: '', primeira: '', ultima: '', price: '', price_full_occupancy: '', full_occupancy_min_guests: '', min_nights: '1' })
  const [singlePrice, setSinglePrice] = useState('')
  const [secao, setSecao] = useState<Secao>('precos')
  const [mostrarPassados, setMostrarPassados] = useState(false)
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
    if (isNaN(parseMoney(editRuleData.price))) {
      setPricesMsg({ text: 'Informe o preço por noite da regra.', type: 'err' }); return
    }
    setSavingRule(true)
    const { data, error } = await supabase.from('pricing_rules').update({
      label: editRuleData.label,
      price: parseMoney(editRuleData.price),
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

  const handleAddHoliday = async (propertyId: string) => {
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
      price: isNaN(parseMoney(newHoliday.price)) ? null : parseMoney(newHoliday.price),
      price_full_occupancy: isNaN(parseMoney(newHoliday.price_full_occupancy)) ? null : parseMoney(newHoliday.price_full_occupancy),
      full_occupancy_min_guests: newHoliday.full_occupancy_min_guests ? Number(newHoliday.full_occupancy_min_guests) : null,
      min_nights: Number(newHoliday.min_nights) || 1,
    }
    const { data, error } = await supabase.from('holidays').insert([holidayObj]).select()
    setSavingHoliday(false)
    if (error) { setPricesMsg({ text: error.message, type: 'err' }); return }
    if (data && data.length > 0) {
      setHolidays([...holidays, data[0]])
      setNewHoliday({ property_id: '', name: '', primeira: '', ultima: '', price: '', price_full_occupancy: '', full_occupancy_min_guests: '', min_nights: '1' })
    }
  }

  const handleQuickAddHoliday = async (e: React.FormEvent, propertyId: string) => {
    e.preventDefault()
    if (!singleDate || !singleDateOut) return
    if (singleDateOut <= singleDate) {
      alert("A data de check-out deve ser posterior ao check-in.")
      return
    }
    setSavingHoliday(true)
    const price = parseMoney(singlePrice)

    const holidayObj = {
      property_id: propertyId,
      name: 'Diária Única (Exceção)',
      date_from: singleDate,
      date_to: singleDateOut,
      price: isNaN(price) ? null : price,
      min_nights: 1,
    }
    const { data } = await supabase.from('holidays').insert([holidayObj]).select()
    if (data && data.length > 0) {
      setHolidays([...holidays, data[0]])
      setSinglePrice('')
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
      price: isNaN(parseMoney(editHolidayData.price)) ? null : parseMoney(editHolidayData.price),
      price_full_occupancy: isNaN(parseMoney(editHolidayData.price_full_occupancy)) ? null : parseMoney(editHolidayData.price_full_occupancy),
      full_occupancy_min_guests: editHolidayData.full_occupancy_min_guests ? Number(editHolidayData.full_occupancy_min_guests) : null,
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
      price_full_occupancy: h.price_full_occupancy,
      full_occupancy_min_guests: h.full_occupancy_min_guests,
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

  const hoje = format(new Date(), 'yyyy-MM-dd')
  // Feriado passado = a última noite já foi (date_to é exclusivo).
  const feriadosFuturos = activeHolidays.filter((h: any) => h.date_to > hoje)
  const feriadosPassados = activeHolidays.filter((h: any) => h.date_to <= hoje)
  const cabeCasaCheia = activeProp && Number(activeProp.max_guests) > Number(activeProp.included_guests ?? 2)

  const linhaFeriado = (h: any) => (
    <div key={h.id} className="prop-item">
      {editingHoliday === h.id ? (
        <EditarDataEspecial
          tipo="feriado" dados={editHolidayData} onChange={setEditHolidayData}
          onSalvar={handleSaveHolidayEdit} onCancelar={() => setEditingHoliday(null)} salvando={savingHoliday}
          property={activeProp} dailyRates={initialDailyRates} rules={rules} holidays={holidays}
        />
      ) : (
        <div className="prop-linha">
          <div style={{ minWidth: 0 }}>
            <p className="prop-linha-titulo">{h.name}<span>{h.date_from?.slice(0, 4)}</span></p>
            <p className="prop-linha-sub">{descreveNoites(noitesCobertas('feriado', h))} · {h.min_nights > 1 ? `mín. ${h.min_nights} noites` : 'mín. 1 noite'}</p>
          </div>
          <div className="prop-linha-preco">
            {h.price != null ? <strong>{formatCurrency(h.price)}<span>/noite</span></strong> : <span style={{ color: 'var(--muted)', fontSize: '13px' }}>preço normal</span>}
            {h.price_full_occupancy != null && <small>{h.full_occupancy_min_guests ? `${h.full_occupancy_min_guests}+ pessoas` : `casa cheia (${activeProp.max_guests})`}: {formatCurrency(h.price_full_occupancy)}</small>}
          </div>
          <div className="prop-acoes">
            <button onClick={() => handleReplicateHoliday(h)} title="Copiar para as outras cabanas" aria-label="Copiar para as outras cabanas"><Copy size={15} /></button>
            <button onClick={() => handleEditHoliday(h)} title="Editar" aria-label="Editar"><Edit2 size={15} /></button>
            <button onClick={() => handleDeleteHoliday(h.id)} title="Excluir" aria-label="Excluir" className="perigo"><Trash2 size={15} /></button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ width: '100%' }}>
      <ConfirmModal />
      <style>{CSS_PROPRIEDADES}</style>

      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>Cabanas e preços</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
        Diárias, feriados, promoções e bloqueios de cada cabana.
      </p>

      {properties.length === 0 ? (
        <div className="prop-card" style={{ textAlign: 'center', color: 'var(--muted)' }}>Nenhuma cabana cadastrada.</div>
      ) : (
        <>
          {/* Cabana */}
          {/* Consumo e pacotes vale para todas as cabanas: sem seletor ali. */}
          <div className="prop-cabanas" style={secao === 'extras' ? { visibility: 'hidden', height: 0, margin: 0, overflow: 'hidden' } : undefined}>
            {properties.map((p: any) => (
              <button key={p.id} onClick={() => { setActiveTab(p.id); setEditingHoliday(null); setEditingRule(null) }} className={activeTab === p.id ? 'ativa' : ''}>
                {p.name}
              </button>
            ))}
          </div>

          {/* Assunto */}
          <nav className="prop-secoes" aria-label="Seções">
            {SECOES.map(({ id, rotulo, Icone }) => (
              <button key={id} onClick={() => setSecao(id)} className={secao === id ? 'ativa' : ''}>
                <Icone size={15} /> {rotulo}
              </button>
            ))}
          </nav>

          {activeProp && secao === 'precos' && (
            <>
              <section className="prop-card">
                <CabecalhoSecao titulo="Diárias" descricao="O preço padrão de cada tipo de noite. Feriados, regras e promoções passam por cima destes valores." />
                <div className="prop-grade">
                  <Campo label="Dia de semana">
                    {id => <MoneyInput id={id} value={activeProp.base_price_weekday == null ? '' : String(activeProp.base_price_weekday)} onChange={v => handlePriceChange('base_price_weekday', v)} style={precoInputStyle} />}
                  </Campo>
                  <Campo label="Fim de semana (sex e sáb)">
                    {id => <MoneyInput id={id} value={activeProp.base_price_weekend == null ? '' : String(activeProp.base_price_weekend)} onChange={v => handlePriceChange('base_price_weekend', v)} style={precoInputStyle} />}
                  </Campo>
                  <Campo label="Noite avulsa em dia de semana" hint="Cobrada quando a estadia é de 1 noite só.">
                    {id => <MoneyInput id={id} value={activeProp.single_night_weekday_price == null ? '' : String(activeProp.single_night_weekday_price)} onChange={v => handlePriceChange('single_night_weekday_price', v)} style={precoInputStyle} />}
                  </Campo>
                </div>

                <h3 className="prop-subtitulo">Mínimo de noites</h3>
                <p className="prop-ajuda">Vale para quem faz check-in nesse tipo de dia.</p>
                <div className="prop-grade">
                  <Campo label="Entrando em dia de semana">
                    {id => <input id={id} type="number" min="1" value={activeProp.min_nights_weekday || ''} onChange={e => handlePriceChange('min_nights_weekday', Number(e.target.value))} style={precoInputStyle} />}
                  </Campo>
                  <Campo label="Entrando no fim de semana">
                    {id => <input id={id} type="number" min="1" value={activeProp.min_nights_weekend || ''} onChange={e => handlePriceChange('min_nights_weekend', Number(e.target.value))} style={precoInputStyle} />}
                  </Campo>
                  <Campo label="Entrando em feriado" hint="Se o feriado tiver mínimo próprio, vale o dele.">
                    {id => <input id={id} type="number" min="1" value={activeProp.min_nights_holiday || ''} onChange={e => handlePriceChange('min_nights_holiday', Number(e.target.value))} style={precoInputStyle} />}
                  </Campo>
                </div>

                <div className="prop-rodape">
                  {pricesMsg && <p style={{ fontSize: '13px', fontWeight: 500, color: pricesMsg.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>{pricesMsg.text}</p>}
                  <button onClick={savePrices} disabled={savingPrices} className="prop-btn-primario">{savingPrices ? 'Salvando...' : 'Salvar diárias'}</button>
                </div>
              </section>

              <PrecosAvancados property={activeProp} />
            </>
          )}

          {activeProp && secao === 'calendario' && (
            <CalendarioPrecos property={activeProp} dailyRates={initialDailyRates} rules={rules} holidays={holidays} />
          )}

          {activeProp && secao === 'feriados' && (
            <>
              {problemasDatas.length > 0 && (
                <div className="prop-alerta">
                  <p style={{ color: 'var(--warning)', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Atenção nestas datas</p>
                  <ul>
                    {problemasDatas.map((p: any, i: number) => (
                      <li key={i}>
                        {p.kind === 'buraco'
                          ? <>Em <strong>{p.nomeGrupo}</strong>, {p.faltando.length === 1 ? 'a noite' : 'as noites'} de{' '}
                              <strong>{descreveNoites(p.faltando).split(': ')[1]}</strong>{' '}
                              {p.faltando.length === 1 ? 'ficou de fora' : 'ficaram de fora'} e serão vendidas pelo preço normal.
                              Edite e estenda a <strong>última noite</strong> para cobrir.</>
                          : <>Registro <strong>duplicado</strong> ({p.resumo}). Apague um deles.</>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <section className="prop-card">
                <CabecalhoSecao titulo="Feriados" descricao={`Preço e mínimo de noites próprios para datas especiais.${cabeCasaCheia ? ' Dá para definir um preço fechado para quando a cabana lota.' : ''}`} />
                {feriadosFuturos.length === 0 && <p className="prop-vazio">Nenhum feriado pela frente.</p>}
                <div className="prop-lista">{feriadosFuturos.map(linhaFeriado)}</div>

                {feriadosPassados.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <button className="prop-link" onClick={() => setMostrarPassados(v => !v)}>
                      {mostrarPassados ? 'Esconder' : 'Mostrar'} {feriadosPassados.length} {feriadosPassados.length === 1 ? 'feriado que já passou' : 'feriados que já passaram'}
                    </button>
                    {mostrarPassados && <div className="prop-lista" style={{ marginTop: '10px', opacity: 0.7 }}>{feriadosPassados.map(linhaFeriado)}</div>}
                  </div>
                )}

                <div className="prop-novo">
                  <EditarDataEspecial
                    tipo="feriado" dados={newHoliday} onChange={setNewHoliday}
                    onSalvar={() => handleAddHoliday(activeProp.id)} salvando={savingHoliday}
                    titulo="Adicionar feriado" rotuloSalvar="Adicionar feriado"
                    property={activeProp} dailyRates={initialDailyRates} rules={rules} holidays={holidays}
                  />
                </div>
              </section>

              {activeRules.length > 0 && (
                <section className="prop-card">
                  <CabecalhoSecao titulo="Regras de preço" descricao="Preço fixo por noite num período. Têm prioridade sobre os feriados." />
                  <div className="prop-lista">
                    {activeRules.map((r: any) => (
                      <div key={r.id} className="prop-item">
                        {editingRule === r.id ? (
                          <EditarDataEspecial
                            tipo="regra" dados={editRuleData} onChange={setEditRuleData}
                            onSalvar={handleSaveRuleEdit} onCancelar={() => setEditingRule(null)} salvando={savingRule}
                            property={activeProp} dailyRates={initialDailyRates} rules={rules} holidays={holidays}
                          />
                        ) : (
                          <div className="prop-linha">
                            <div style={{ minWidth: 0 }}>
                              <p className="prop-linha-titulo">{r.label}<span>{r.valid_from?.slice(0, 4)}</span></p>
                              <p className="prop-linha-sub">{descreveNoites(noitesCobertas('regra', r))}</p>
                            </div>
                            <div className="prop-linha-preco"><strong>{formatCurrency(r.price)}<span>/noite</span></strong></div>
                            <div className="prop-acoes">
                              <button onClick={() => handleReplicateRule(r)} title="Copiar para as outras cabanas" aria-label="Copiar para as outras cabanas"><Copy size={15} /></button>
                              <button onClick={() => handleEditRule(r)} title="Editar" aria-label="Editar"><Edit2 size={15} /></button>
                              <button onClick={() => handleDeleteRule(r.id)} title="Excluir" aria-label="Excluir" className="perigo"><Trash2 size={15} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="prop-card">
                <CabecalhoSecao titulo="Liberar noite avulsa" descricao="Para vender só 1 noite numa data que normalmente exigiria mais (ex.: a sexta que sobrou de um feriado)." />
                <form onSubmit={(e) => handleQuickAddHoliday(e, activeProp.id)} className="prop-grade" style={{ alignItems: 'end' }}>
                  <Campo label="Check-in">
                    {() => <AriumDatePicker required value={singleDate} onChange={setSingleDate} />}
                  </Campo>
                  <Campo label="Check-out">
                    {() => <AriumDatePicker required value={singleDateOut} onChange={setSingleDateOut} />}
                  </Campo>
                  <Campo label="Preço da noite (opcional)">
                    {id => <MoneyInput id={id} value={singlePrice} onChange={setSinglePrice} placeholder="Preço normal" style={precoInputStyle} />}
                  </Campo>
                  <button type="submit" disabled={savingHoliday} className="prop-btn-secundario">{savingHoliday ? 'Salvando...' : 'Liberar noite'}</button>
                </form>
              </section>
            </>
          )}

          {activeProp && secao === 'promocoes' && (
            <Promocoes property={activeProp} promotions={initialPromotions} />
          )}

          {activeProp && secao === 'bloqueios' && (
            <section className="prop-card">
              <CabecalhoSecao titulo="Bloquear dias" descricao="Toque num dia para bloquear ou liberar (uso próprio, manutenção). Para ver reservas junto, use o Calendário." />
              <div style={{ maxWidth: '380px' }}>
                <MiniCalendar propertyId={activeProp.id} blocks={blocks} onToggleBlock={handleToggleBlock} />
              </div>
            </section>
          )}

          {secao === 'extras' && (
            <ExtrasEPacotes tenantId={tenantId} extras={initialExtras} pacotes={initialPacotes} />
          )}
        </>
      )}

      <div style={{ marginTop: '32px' }}>
        <BotaoBackup />
      </div>
    </div>
  )
}

type Secao = 'precos' | 'calendario' | 'feriados' | 'promocoes' | 'bloqueios' | 'extras'

const SECOES: { id: Secao, rotulo: string, Icone: typeof Tag }[] = [
  { id: 'precos', rotulo: 'Diárias e taxas', Icone: Tag },
  { id: 'calendario', rotulo: 'Preço por dia', Icone: CalendarDays },
  { id: 'feriados', rotulo: 'Feriados', Icone: PartyPopper },
  { id: 'promocoes', rotulo: 'Promoções', Icone: Percent },
  { id: 'bloqueios', rotulo: 'Bloqueios', Icone: Lock },
  { id: 'extras', rotulo: 'Consumo e pacotes', Icone: Gift },
]

function CabecalhoSecao({ titulo, descricao }: { titulo: string, descricao?: string }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{titulo}</h2>
      {descricao && <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5 }}>{descricao}</p>}
    </div>
  )
}

const CSS_PROPRIEDADES = `
.prop-cabanas { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.prop-cabanas button { height: 38px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--field-border); background: transparent; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.prop-cabanas button:hover { color: var(--text); border-color: var(--field-border-hover); }
.prop-cabanas button.ativa { background-color: var(--purple); border-color: var(--purple); color: #fff; font-weight: 600; }
.prop-secoes { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; scrollbar-width: none; }
.prop-secoes::-webkit-scrollbar { display: none; }
.prop-secoes button { display: inline-flex; align-items: center; gap: 7px; padding: 10px 14px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.prop-secoes button:hover { color: var(--text); }
.prop-secoes button.ativa { color: var(--text); font-weight: 600; border-bottom-color: var(--purple); }
.prop-card { background-color: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 20px; }
.prop-grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.prop-subtitulo { color: var(--text); font-size: 14px; font-weight: 600; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
.prop-ajuda { color: var(--muted); font-size: 12px; margin: 2px 0 14px; }
.prop-rodape { display: flex; justify-content: flex-end; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 20px; }
.prop-btn-primario { height: 42px; padding: 0 22px; border-radius: 10px; border: none; background-color: var(--purple); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.prop-btn-primario:disabled, .prop-btn-secundario:disabled { opacity: 0.6; cursor: not-allowed; }
.prop-btn-secundario { height: 44px; padding: 0 20px; border-radius: 10px; border: 1px solid var(--purple); background: transparent; color: var(--accent); font-size: 14px; font-weight: 600; cursor: pointer; }
.prop-btn-secundario:hover:not(:disabled) { background-color: rgba(124,58,237,0.1); }
.prop-lista { display: flex; flex-direction: column; gap: 8px; }
.prop-item { border: 1px solid var(--border); border-radius: 12px; background-color: var(--field-bg); }
.prop-linha { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 16px; padding: 12px 14px; }
.prop-linha-titulo { color: var(--text); font-size: 14px; font-weight: 600; }
.prop-linha-titulo span { color: var(--muted); font-weight: 400; font-size: 12px; margin-left: 6px; }
.prop-linha-sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
.prop-linha-preco { display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
.prop-linha-preco strong { color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums; }
.prop-linha-preco strong span { color: var(--muted); font-weight: 400; font-size: 12px; }
.prop-linha-preco small { color: var(--violet-soft); font-size: 12px; }
.prop-acoes { display: flex; gap: 4px; }
.prop-acoes button { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
.prop-acoes button:hover { background-color: rgba(124,58,237,0.12); color: var(--accent); }
.prop-acoes button.perigo:hover { background-color: rgba(239,68,68,0.12); color: var(--danger); }
.prop-vazio { color: var(--muted); font-size: 13px; padding: 4px 0 12px; }
.prop-link { background: none; border: none; padding: 0; color: var(--accent); font-size: 13px; font-weight: 500; cursor: pointer; }
.prop-link:hover { text-decoration: underline; }
.prop-novo { margin-top: 20px; border: 1px dashed var(--field-border); border-radius: 12px; }
.prop-alerta { background-color: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.35); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
.prop-alerta ul { margin: 0; padding-left: 18px; color: var(--text); font-size: 13px; line-height: 1.6; }
@media (max-width: 767px) {
  .prop-card { padding: 18px 16px; }
  .prop-linha { grid-template-columns: minmax(0, 1fr) auto; row-gap: 6px; }
  .prop-linha-preco { align-items: flex-start; text-align: left; grid-column: 1; }
  .prop-acoes { grid-row: 1; grid-column: 2; }
}
`
