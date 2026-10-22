"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X, Lock, Pencil, CalendarRange, Plus, List, LayoutGrid } from "lucide-react"
import { format, addMonths, subMonths, addDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO, differenceInCalendarDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { StatusBadge } from "@/components/ui/Badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/components/ConfirmModal"
import { executar } from "@/lib/salvar"
import { seguraDatas } from "@/lib/hold"
import { useMinuteTick } from "@/components/ui/HoldCountdown"
import { precoDoDia } from "@/lib/precoDoDia"

/**
 * Cor de cada cabana, pela ordem (a 1ª, a 2ª, a 3ª; depois repete).
 * `texto` usa variável de tema (escurece no tema claro); fundo e borda são
 * tons translúcidos que funcionam nos dois temas.
 */
const CORES_CABANA = [
  { base: '#f97b00', texto: 'var(--cabin-1)', fundo: 'rgba(249,123,0,0.18)', borda: 'rgba(249,123,0,0.55)' },
  { base: '#8b5cf6', texto: 'var(--cabin-2)', fundo: 'rgba(139,92,246,0.2)', borda: 'rgba(139,92,246,0.6)' },
  { base: '#14b8a6', texto: 'var(--cabin-3)', fundo: 'rgba(20,184,166,0.18)', borda: 'rgba(20,184,166,0.55)' },
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  height: '38px', padding: '0 14px', borderRadius: '10px',
  fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
}
const btnSecundario: React.CSSProperties = {
  ...btnBase, backgroundColor: 'transparent', color: 'var(--text)', border: '1px solid var(--field-border)',
}
const btnPrimario: React.CSSProperties = {
  ...btnBase, backgroundColor: 'var(--purple)', color: '#fff', border: '1px solid var(--purple)', fontWeight: 600,
}
const btnIcone: React.CSSProperties = {
  ...btnSecundario, width: '38px', padding: 0, color: 'var(--muted)',
}

export function CalendarioClient({ properties, bookings, allBookings, blockedDates, holidays, dailyRates, pricingRules }: any) {
  // Relógio compartilhado: uma pendente só aparece enquanto a trava de 24h
  // não venceu. É `null` até montar no cliente, para o HTML do servidor não
  // divergir do navegador (hydration). Ver lib/hold.ts.
  const agora = useMinuteTick()
  /** Mesma condição do banco: pendente que ainda segura a data. */
  const seguraAgora = (b: any) => agora !== null && seguraDatas(b, agora)

  const router = useRouter()
  const supabase = createClient()

  const sortedProperties = [...properties].sort((a: any, b: any) => {
    const doceId = '5be242bc-103f-4488-a9cc-fa8c240579ca'
    if (a.id === doceId) return -1
    if (b.id === doceId) return 1
    return 0
  })

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [filterProperty, setFilterProperty] = useState<string>(sortedProperties[0]?.id || '')
  const [blockData, setBlockData] = useState({ date: '', property_id: filterProperty, reason: '', guest_name: '' })
  const [loading, setLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'grid' | 'list'>('grid')
  const [editingBlock, setEditingBlock] = useState<any>(null)
  const [editData, setEditData] = useState({ reason: '', guest_name: '' })
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)
  const [rangeMode, setRangeMode] = useState(false)
  const [calendarMode, setCalendarMode] = useState<'split' | 'unified'>('split')
  const [rangeReason, setRangeReason] = useState('')
  const [rangeGuestName, setRangeGuestName] = useState('')
  const { ConfirmModal, confirm } = useConfirm()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })
  const hojeIso = iso(new Date())

  const propertyIndex = (pid: string) => sortedProperties.findIndex((p: any) => p.id === pid)
  const coresDe = (pid: string) => CORES_CABANA[Math.max(0, propertyIndex(pid)) % CORES_CABANA.length]

  /** Reservas confirmadas e bloqueios de UMA cabana numa data. */
  const getDayInfo = (date: Date, propertyId: string) => {
    const d = iso(date)
    const dayBookings = bookings.filter((b: any) =>
      ['confirmed', 'checked_in', 'completed'].includes(b.status) &&
      b.property_id === propertyId && d >= b.check_in && d < b.check_out
    )
    const dayBlocks = blockedDates.filter((b: any) => b.date === d && b.property_id === propertyId)
    return { bookings: dayBookings, blocks: dayBlocks }
  }

  /** Para o painel do dia: tudo que não foi cancelado (inclui pendentes). */
  const getAllDayBookings = (date: Date, propertyId: string) => {
    const d = iso(date)
    const dayBookings = (allBookings || []).filter((b: any) =>
      b.status !== 'cancelled' && b.property_id === propertyId && d >= b.check_in && d < b.check_out
    )
    const dayBlocks = blockedDates.filter((b: any) => b.date === d && b.property_id === propertyId)
    return { bookings: dayBookings, blocks: dayBlocks }
  }

  const getPriceForDay = (date: Date, propertyId: string): number | null => {
    const property = sortedProperties.find((p: any) => p.id === propertyId)
    if (!property) return null
    // Mesma precedência do calculate_price (ver lib/precoDoDia).
    const doImovel = (lista: any[] | undefined) => (lista || []).filter((x: any) => x.property_id === propertyId)
    const dia = precoDoDia(iso(date), property, doImovel(dailyRates), doImovel(pricingRules), doImovel(holidays))
    // Diária única de dia de semana: é o que o motor cobra numa estadia de 1 noite.
    if (dia.origem === 'semana' && property.single_night_weekday_price != null) {
      return Number(property.single_night_weekday_price)
    }
    return dia.preco
  }

  const isBlockedOn = (d: string, pid: string) => blockedDates.some((x: any) => x.date === d && x.property_id === pid)

  /**
   * O que ocupa a noite, para desenhar a faixa. `inicio`/`fim` dizem se a faixa
   * começa/termina neste dia (ou quebra na virada da semana/mês) — é o que
   * deixa uma estadia de várias noites como uma barra contínua.
   */
  const ocupacao = (day: Date, pid: string) => {
    const d = iso(day)
    const ontem = iso(addDays(day, -1))
    const amanha = iso(addDays(day, 1))
    const quebraInicio = day.getDay() === 0 || day.getDate() === 1
    const quebraFim = day.getDay() === 6 || d === iso(endOfMonth(day))

    const reserva = bookings.find((b: any) =>
      b.status !== 'cancelled' && b.status !== 'pending' &&
      b.property_id === pid && d >= b.check_in && d < b.check_out
    )
    if (reserva) {
      return {
        tipo: 'reserva' as const, item: reserva, texto: reserva.guest_name || 'Reservado',
        inicio: d === reserva.check_in || quebraInicio,
        fim: amanha >= reserva.check_out || quebraFim,
      }
    }
    const bloqueio = blockedDates.find((x: any) => x.date === d && x.property_id === pid)
    if (bloqueio) {
      return {
        tipo: 'bloqueio' as const, item: bloqueio, texto: bloqueio.guest_name || bloqueio.reason || 'Bloqueado',
        inicio: !isBlockedOn(ontem, pid) || quebraInicio,
        fim: !isBlockedOn(amanha, pid) || quebraFim,
      }
    }
    const pendente = (allBookings || []).find((b: any) =>
      seguraAgora(b) && b.property_id === pid && d >= b.check_in && d < b.check_out
    )
    if (pendente) {
      return {
        tipo: 'pendente' as const, item: pendente, texto: pendente.guest_name || 'Pendente',
        inicio: d === pendente.check_in || quebraInicio,
        fim: amanha >= pendente.check_out || quebraFim,
      }
    }
    return null
  }

  /** Outras cabanas ocupadas (ou segurando por pendente) neste dia. */
  const outrasNoDia = (day: Date, pid: string) => {
    const d = iso(day)
    return sortedProperties
      .filter((o: any) => o.id !== pid)
      .map((o: any) => {
        const ocupada = isBlockedOn(d, o.id) ||
          bookings.some((b: any) => b.property_id === o.id && d >= b.check_in && d < b.check_out)
        const pendente = !ocupada && (allBookings || []).some((b: any) =>
          seguraAgora(b) && b.property_id === o.id && d >= b.check_in && d < b.check_out)
        return { cabana: o, ocupada, pendente }
      })
      .filter(x => x.ocupada || x.pendente)
  }

  /** Letra do selo da outra cabana; usa 2 letras se houver iniciais iguais. */
  const siglaCabana = (p: any) => {
    const limpa = (n: string) => String(n).replace('Cabana ', '').replace('Chalé ', '').trim()
    const nome = limpa(p.name)
    const repetida = sortedProperties.some((o: any) => o.id !== p.id &&
      limpa(o.name).charAt(0).toLowerCase() === nome.charAt(0).toLowerCase())
    return repetida ? nome.slice(0, 2) : nome.charAt(0)
  }

  const handleDayClick = (day: Date, pid: string) => {
    const dateStr = iso(day)
    // Seleção de período tem prioridade: nunca abre painel nem formulário.
    if (rangeMode) {
      if (!rangeStart || rangeEnd) {
        setRangeStart(dateStr)
        setRangeEnd(null)
      } else if (dateStr < rangeStart) {
        setRangeEnd(rangeStart)
        setRangeStart(dateStr)
      } else {
        setRangeEnd(dateStr)
      }
      return
    }
    const { blocks } = getDayInfo(day, pid)
    const { bookings: todas } = getAllDayBookings(day, pid)
    if (blocks.length === 0 && todas.length === 0) {
      setBlockData(prev => ({ ...prev, date: dateStr, property_id: pid }))
      setShowBlockForm(true)
    } else {
      setEditingBlock(null)
      setSelectedDay({ dateStr, dayBookings: todas, blocks })
    }
  }

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('blocked_dates').insert([{
      property_id: blockData.property_id,
      date: blockData.date,
      reason: blockData.reason || null,
      guest_name: blockData.guest_name || null,
    }]).select()
    if (error) {
      alert('Erro: ' + error.message)
    } else {
      setShowBlockForm(false)
      setBlockData({ date: '', property_id: filterProperty, reason: '', guest_name: '' })
      router.refresh()
    }
    setLoading(false)
  }

  const handleUnblock = async (id: string) => {
    if (!(await confirm('Desbloquear data', 'Deseja realmente desbloquear esta data?'))) return
    setLoading(true)
    const r = await executar(supabase.from('blocked_dates').delete().eq('id', id))
    setLoading(false)
    if (!r.ok) { alert(r.erro); return }
    setSelectedDay(null)
    router.refresh()
  }

  const handleEditBlock = async (id: string) => {
    setLoading(true)
    const { error } = await supabase
      .from('blocked_dates')
      .update({ reason: editData.reason || null, guest_name: editData.guest_name || null })
      .eq('id', id)
    if (error) {
      alert('Erro: ' + error.message)
    } else {
      setEditingBlock(null)
      setSelectedDay(null)
      router.refresh()
    }
    setLoading(false)
  }

  const datasDoPeriodo = () => {
    if (!rangeStart || !rangeEnd) return []
    return eachDayOfInterval({ start: parseISO(rangeStart), end: parseISO(rangeEnd) }).map(iso)
  }

  const limparPeriodo = () => {
    setRangeStart(null); setRangeEnd(null); setRangeMode(false); setRangeReason(''); setRangeGuestName('')
  }

  const bloquearPeriodo = async () => {
    setLoading(true)
    const { error } = await supabase.from('blocked_dates').insert(datasDoPeriodo().map(date => ({
      property_id: filterProperty, date,
      reason: rangeReason || null, guest_name: rangeGuestName || null,
    })))
    setLoading(false)
    if (error) { alert('Erro: ' + error.message); return }
    limparPeriodo()
    router.refresh()
  }

  const desbloquearPeriodo = async () => {
    if (!(await confirm('Desbloquear período', 'Deseja realmente desbloquear este período?'))) return
    setLoading(true)
    const { error } = await supabase.from('blocked_dates').delete()
      .in('date', datasDoPeriodo()).eq('property_id', filterProperty)
    setLoading(false)
    if (error) { alert('Erro: ' + error.message); return }
    limparPeriodo()
    router.refresh()
  }

  // ---------- Desenho de um dia ----------

  const renderDia = (day: Date, pid: string, opts: { compacto?: boolean; mostrarOutras?: boolean }) => {
    if (!isSameMonth(day, currentMonth)) {
      return <div key={day.toISOString()} className="cal2-cell cal2-fora" />
    }
    const d = iso(day)
    const passado = d < hojeIso
    const hoje = isToday(day)
    const oc = ocupacao(day, pid)
    const cores = coresDe(pid)
    const outras = opts.mostrarOutras ? outrasNoDia(day, pid) : []
    const preco = passado ? null : getPriceForDay(day, pid)

    const noPeriodo = rangeMode && rangeStart && (
      rangeEnd ? d >= rangeStart && d <= rangeEnd : d === rangeStart
    )
    const pontaPeriodo = rangeMode && (d === rangeStart || d === rangeEnd)

    let faixa: React.ReactNode = null
    if (oc) {
      const estilo: React.CSSProperties =
        // Tons translúcidos sobre fundo sólido (var(--surface)): sem isso a
        // linha entre os dias aparecia por dentro da faixa.
        oc.tipo === 'reserva'
          ? { background: `linear-gradient(${cores.fundo}, ${cores.fundo}), var(--surface)`, color: cores.texto, borderColor: cores.borda }
          : oc.tipo === 'pendente'
            ? { background: 'linear-gradient(rgba(234,179,8,0.1), rgba(234,179,8,0.1)), var(--surface)', color: 'var(--warning)', borderColor: 'rgba(234,179,8,0.6)', borderStyle: 'dashed' }
            : { background: 'repeating-linear-gradient(135deg, rgba(148,163,184,0.2) 0 6px, rgba(148,163,184,0.08) 6px 12px), var(--surface)', color: 'var(--text)', borderColor: 'rgba(148,163,184,0.35)' }
      faixa = (
        <div
          className={`cal2-faixa${oc.inicio ? ' ini' : ''}${oc.fim ? ' fim' : ''}`}
          title={`${oc.tipo === 'reserva' ? 'Reserva' : oc.tipo === 'pendente' ? 'Pendente' : 'Bloqueado'}: ${oc.texto}`}
          style={estilo}
        >
          {oc.inicio && (
            <>
              {oc.tipo === 'bloqueio' && <Lock size={11} style={{ flexShrink: 0, opacity: 0.8 }} />}
              <span className="cal2-faixa-texto">{oc.tipo === 'pendente' ? `Pendente · ${oc.texto}` : oc.texto}</span>
            </>
          )}
        </div>
      )
    }

    return (
      <button
        type="button"
        key={day.toISOString()}
        onClick={() => handleDayClick(day, pid)}
        className={`cal2-cell${opts.compacto ? ' compacto' : ''}${passado ? ' passado' : ''}${hoje ? ' hoje' : ''}`}
        style={{
          ...(noPeriodo ? { backgroundColor: 'rgba(124,58,237,0.16)' } : {}),
          ...(pontaPeriodo ? { boxShadow: 'inset 0 0 0 2px var(--purple)' } : {}),
        }}
        aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
      >
        <div className="cal2-topo">
          <span className={`cal2-num${hoje ? ' hoje' : ''}`}>{format(day, 'd')}</span>
          {outras.length > 0 && (
            <span className="cal2-outras">
              {outras.map(({ cabana, ocupada }) => {
                const c = coresDe(cabana.id)
                return (
                  <span
                    key={cabana.id}
                    title={`${cabana.name} ${ocupada ? 'ocupada' : 'com reserva pendente'}`}
                    className="cal2-sigla"
                    style={ocupada
                      ? { backgroundColor: c.fundo, color: c.texto, borderColor: c.borda }
                      : { backgroundColor: 'transparent', color: c.texto, borderColor: c.borda, borderStyle: 'dashed', opacity: 0.8 }}
                  >
                    {siglaCabana(cabana)}
                  </span>
                )
              })}
            </span>
          )}
        </div>
        <div className="cal2-meio">{faixa}</div>
        <div className="cal2-preco">{preco ? `R$ ${preco.toLocaleString('pt-BR')}` : ''}</div>
      </button>
    )
  }

  const renderGrade = (pid: string, opts: { compacto?: boolean; mostrarOutras?: boolean }) => (
    <>
      <div className="cal2-semana">
        {DIAS_SEMANA.map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="cal2-grade">
        {calendarDays.map(day => renderDia(day, pid, opts))}
      </div>
    </>
  )

  // ---------- Lista (celular) ----------

  const diasComAlgo = calendarDays
    .filter(d => isSameMonth(d, currentMonth))
    .map(day => ({ day, ...getAllDayBookings(day, filterProperty) }))
    .filter(x => x.bookings.length > 0 || x.blocks.length > 0)

  const nomeCabana = (pid: string) => sortedProperties.find((p: any) => p.id === pid)?.name

  const corFiltro = coresDe(filterProperty)

  return (
    <div style={{ width: '100%' }}>
      <ConfirmModal />
      <style>{CSS_CALENDARIO}</style>

      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>
        Calendário de Ocupação
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
        Toque num dia livre para bloquear, ou num dia ocupado para ver os detalhes.
      </p>

      {showBlockForm && (
        <>
          <div onClick={() => setShowBlockForm(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 50, width: 'calc(100% - 32px)', maxWidth: '400px',
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px', boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text)', fontSize: '17px', fontWeight: 600 }}>Bloquear data</h3>
              <button onClick={() => setShowBlockForm(false)} aria-label="Fechar" style={{ ...btnIcone, border: 'none', width: '32px', height: '32px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleBlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Campo label="Cabana">
                <select required value={blockData.property_id} onChange={e => setBlockData({ ...blockData, property_id: e.target.value })} style={campoStyle}>
                  {sortedProperties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Campo>
              <Campo label="Data">
                <input type="date" required value={blockData.date} onChange={e => setBlockData({ ...blockData, date: e.target.value })} style={campoStyle} />
              </Campo>
              <Campo label="Nome do hóspede (opcional)">
                <input type="text" value={blockData.guest_name} onChange={e => setBlockData({ ...blockData, guest_name: e.target.value })} placeholder="Quem vai ficar" style={campoStyle} />
              </Campo>
              <Campo label="Motivo (opcional)">
                <input type="text" value={blockData.reason} onChange={e => setBlockData({ ...blockData, reason: e.target.value })} placeholder="Manutenção, uso próprio..." style={campoStyle} />
              </Campo>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowBlockForm(false)} style={{ ...btnSecundario, flex: 1, height: '42px' }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ ...btnPrimario, flex: 1, height: '42px', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Salvando...' : 'Bloquear'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="cal2-card">
        {/* Cabeçalho: mês + navegação | modo */}
        <div className="cal2-barra">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={btnIcone} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={btnIcone} aria-label="Próximo mês"><ChevronRight size={18} /></button>
            <h2 style={{ color: 'var(--text)', fontSize: '19px', fontWeight: 700, textTransform: 'capitalize', margin: '0 6px', minWidth: '150px' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            {!isSameMonth(currentMonth, new Date()) && (
              <button onClick={() => setCurrentMonth(startOfMonth(new Date()))} style={{ ...btnSecundario, height: '32px', fontSize: '12px' }}>Hoje</button>
            )}
          </div>

          {sortedProperties.length >= 2 && (
            <div className="cal2-segmento">
              <button onClick={() => setCalendarMode('split')} className={calendarMode === 'split' ? 'ativo' : ''}>Separado</button>
              <button onClick={() => { setCalendarMode('unified'); limparPeriodo() }} className={calendarMode === 'unified' ? 'ativo' : ''}>Lado a lado</button>
            </div>
          )}
        </div>

        {/* Cabanas | ações */}
        <div className="cal2-barra" style={{ paddingTop: 0 }}>
          {calendarMode === 'split' ? (
            <div className="cal2-abas">
              {sortedProperties.map((p: any) => {
                const c = coresDe(p.id)
                const ativa = filterProperty === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setFilterProperty(p.id)}
                    className={ativa ? 'ativa' : ''}
                    style={ativa ? { backgroundColor: c.fundo, color: c.texto, borderColor: c.borda } : undefined}
                  >
                    <span className="cal2-ponto" style={{ backgroundColor: c.base }} />
                    {String(p.name).startsWith('Cabana ')
                      ? <span><span className="cal2-prefixo">Cabana </span>{String(p.name).slice(7)}</span>
                      : p.name}
                  </button>
                )
              })}
            </div>
          ) : <div />}

          <div className="cal2-acoes">
            <button onClick={() => setMobileView(v => v === 'grid' ? 'list' : 'grid')} className="cal2-so-celular" style={btnSecundario}>
              {mobileView === 'list' ? <><LayoutGrid size={15} /> Grade</> : <><List size={15} /> Lista</>}
            </button>
            {calendarMode === 'split' && (
              <button
                onClick={() => rangeMode ? limparPeriodo() : setRangeMode(true)}
                style={rangeMode ? { ...btnSecundario, borderColor: 'var(--purple)', color: 'var(--accent)' } : btnSecundario}
              >
                {rangeMode ? <><X size={15} /> Cancelar seleção</> : <><CalendarRange size={15} /> Selecionar período</>}
              </button>
            )}
            <button onClick={() => { setBlockData(prev => ({ ...prev, property_id: filterProperty })); setShowBlockForm(true) }} style={btnPrimario}>
              <Plus size={16} /> Bloquear data
            </button>
          </div>
        </div>

        {/* Seleção de período */}
        {rangeMode && (
          <div className="cal2-periodo">
            {!rangeStart || !rangeEnd ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                {!rangeStart ? 'Toque no primeiro dia do período.' : 'Agora toque no último dia.'}
              </p>
            ) : (
              <>
                <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                  {format(parseISO(rangeStart), 'dd/MM')} a {format(parseISO(rangeEnd), 'dd/MM/yyyy')} · {differenceInCalendarDays(parseISO(rangeEnd), parseISO(rangeStart)) + 1} dias · {nomeCabana(filterProperty)}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <input type="text" value={rangeGuestName} onChange={e => setRangeGuestName(e.target.value)} placeholder="Nome do hóspede (opcional)" style={campoStyle} />
                  <input type="text" value={rangeReason} onChange={e => setRangeReason(e.target.value)} placeholder="Motivo (opcional)" style={campoStyle} />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={bloquearPeriodo} disabled={loading} style={{ ...btnPrimario, opacity: loading ? 0.6 : 1 }}>
                    <Lock size={14} /> {loading ? 'Processando...' : 'Bloquear período'}
                  </button>
                  <button onClick={desbloquearPeriodo} disabled={loading} style={{ ...btnSecundario, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.4)' }}>
                    Desbloquear período
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Grade */}
        <div className={`cal2-grade-wrap${mobileView === 'list' ? ' esconder-no-celular' : ''}`}>
          {calendarMode === 'split' ? (
            renderGrade(filterProperty, { mostrarOutras: true })
          ) : (
            <div className="cal2-lado-a-lado">
              {sortedProperties.map((p: any) => {
                const c = coresDe(p.id)
                return (
                  <div key={p.id} className="cal2-coluna">
                    <div className="cal2-coluna-titulo">
                      <span className="cal2-ponto" style={{ backgroundColor: c.base }} />
                      <span style={{ color: c.texto }}>{p.name}</span>
                    </div>
                    {renderGrade(p.id, { compacto: true })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Lista (celular) */}
        {mobileView === 'list' && (
          <div className="cal2-lista">
            {diasComAlgo.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '14px', padding: '24px 16px', textAlign: 'center' }}>
                Nenhuma reserva ou bloqueio em {format(currentMonth, 'MMMM', { locale: ptBR })} na {nomeCabana(filterProperty)}.
              </p>
            )}
            {diasComAlgo.map(({ day, bookings: bs, blocks }) => {
              const passado = iso(day) < hojeIso
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => { setEditingBlock(null); setSelectedDay({ dateStr: iso(day), dayBookings: bs, blocks }) }}
                  className="cal2-lista-item"
                  style={{ opacity: passado ? 0.5 : 1 }}
                >
                  <div className="cal2-lista-data" style={isToday(day) ? { backgroundColor: 'var(--purple)', color: '#fff' } : undefined}>
                    <span style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>{format(day, 'd')}</span>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8 }}>{format(day, 'EEE', { locale: ptBR }).replace('.', '')}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    {bs.map((b: any) => (
                      <p key={b.id} style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="cal2-ponto" style={{ backgroundColor: b.status === 'pending' ? '#eab308' : corFiltro.base }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.guest_name}</span>
                        {b.status === 'pending' && <span style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: 500 }}>pendente</span>}
                      </p>
                    ))}
                    {blocks.map((b: any) => (
                      <p key={b.id} style={{ color: 'var(--muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={12} /> {b.guest_name || b.reason || 'Bloqueado'}
                      </p>
                    ))}
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        )}

        {/* Legenda */}
        <div className="cal2-legenda">
          <span><i style={{ backgroundColor: corFiltro.fundo, borderColor: corFiltro.borda }} /> Reservado</span>
          <span><i style={{ backgroundColor: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.6)', borderStyle: 'dashed' }} /> Pendente</span>
          <span><i style={{ background: 'repeating-linear-gradient(135deg, rgba(148,163,184,0.3) 0 3px, rgba(148,163,184,0.1) 3px 6px)', borderColor: 'rgba(148,163,184,0.35)' }} /> Bloqueado</span>
          {calendarMode === 'split' && sortedProperties.length >= 2 && (
            <span style={{ color: 'var(--muted)' }}>
              Letra no canto = outra cabana ocupada ({sortedProperties.filter((p: any) => p.id !== filterProperty).map((p: any) => `${siglaCabana(p)}: ${String(p.name).replace('Cabana ', '')}`).join(', ')})
            </span>
          )}
        </div>
      </div>

      {/* Painel do dia */}
      {selectedDay && (selectedDay.dayBookings.length > 0 || selectedDay.blocks.length > 0) && (
        <div className="cal2-painel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700 }}>
              {(() => {
                const t = format(parseISO(selectedDay.dateStr), "EEEE, d 'de' MMMM", { locale: ptBR })
                return t.charAt(0).toUpperCase() + t.slice(1)
              })()}
            </h3>
            <button onClick={() => setSelectedDay(null)} aria-label="Fechar" style={{ ...btnIcone, border: 'none' }}><X size={20} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '12px' }}>
            {selectedDay.dayBookings.map((b: any) => {
              const c = coresDe(b.property_id)
              const noites = differenceInCalendarDays(parseISO(b.check_out), parseISO(b.check_in))
              return (
                <div key={b.id} className="cal2-cartao" style={{ borderLeftColor: b.status === 'pending' ? '#eab308' : c.base }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '16px' }}>{b.guest_name}</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <p style={{ color: c.texto, fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{b.properties?.name || nomeCabana(b.property_id)}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '14px' }}>
                    {format(parseISO(b.check_in), 'EEE dd/MM', { locale: ptBR })} → {format(parseISO(b.check_out), 'EEE dd/MM', { locale: ptBR })} · {noites} {noites === 1 ? 'noite' : 'noites'}
                  </p>
                  <button onClick={() => router.push(`/dashboard/reservas/${b.id}`)} style={{ ...btnSecundario, width: '100%' }}>
                    Ver reserva completa
                  </button>
                </div>
              )
            })}

            {selectedDay.blocks.map((block: any) => (
              <div key={block.id} className="cal2-cartao" style={{ borderLeftColor: 'rgba(148,163,184,0.7)' }}>
                {editingBlock === block.id ? (
                  <>
                    <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>Editar bloqueio</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                      <input type="text" value={editData.guest_name} onChange={e => setEditData(prev => ({ ...prev, guest_name: e.target.value }))} placeholder="Nome do hóspede" style={campoStyle} />
                      <input type="text" value={editData.reason} onChange={e => setEditData(prev => ({ ...prev, reason: e.target.value }))} placeholder="Motivo" style={campoStyle} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditingBlock(null)} style={{ ...btnSecundario, flex: 1 }}>Cancelar</button>
                      <button onClick={() => handleEditBlock(block.id)} disabled={loading} style={{ ...btnPrimario, flex: 1, opacity: loading ? 0.6 : 1 }}>
                        {loading ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={15} style={{ color: 'var(--muted)' }} /> {block.guest_name || 'Data bloqueada'}
                      </p>
                      <button
                        onClick={() => { setEditingBlock(block.id); setEditData({ reason: block.reason || '', guest_name: block.guest_name || '' }) }}
                        style={{ ...btnIcone, width: '32px', height: '32px' }}
                        aria-label="Editar bloqueio" title="Editar bloqueio"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                    <p style={{ color: coresDe(block.property_id).texto, fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{nomeCabana(block.property_id)}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '14px' }}>
                      {block.reason ? `Motivo: ${block.reason}` : 'Sem motivo informado'}
                    </p>
                    <button onClick={() => handleUnblock(block.id)} disabled={loading} style={{ ...btnSecundario, width: '100%', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.4)' }}>
                      {loading ? 'Processando...' : 'Desbloquear esta data'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const campoStyle: React.CSSProperties = {
  padding: '11px 14px', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box', color: 'var(--text)',
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '13px', fontWeight: 500 }}>
      {label}
      {children}
    </label>
  )
}

const CSS_CALENDARIO = `
.cal2-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}
.cal2-barra {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; padding: 16px 20px;
}
.cal2-segmento {
  display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px;
  border: 1px solid var(--field-border); background-color: var(--field-bg);
}
.cal2-segmento button {
  height: 30px; padding: 0 14px; border-radius: 8px; border: none; cursor: pointer;
  background: transparent; color: var(--muted); font-size: 13px; font-weight: 500;
}
.cal2-segmento button.ativo { background-color: var(--purple); color: #fff; font-weight: 600; }
.cal2-abas { display: flex; gap: 6px; flex-wrap: wrap; }
.cal2-abas button {
  display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px;
  border-radius: 999px; border: 1px solid var(--field-border); background: transparent;
  color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.cal2-abas button:hover { color: var(--text); border-color: var(--field-border-hover); }
.cal2-abas button.ativa { font-weight: 600; }
.cal2-ponto { width: 8px; height: 8px; border-radius: 999px; display: inline-block; flex-shrink: 0; }
.cal2-periodo {
  margin: 0 20px 16px; padding: 14px 16px; border-radius: 12px;
  border: 1px dashed rgba(124,58,237,0.5); background-color: rgba(124,58,237,0.06);
}
.cal2-grade-wrap { border-top: 1px solid var(--border); }
.cal2-semana { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-bottom: 1px solid var(--border); }
.cal2-semana div {
  padding: 10px 0; text-align: center; color: var(--muted);
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
}
.cal2-grade { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.cal2-cell {
  display: flex; flex-direction: column; min-width: 0; min-height: 108px;
  padding: 8px; text-align: left; font: inherit; color: inherit;
  background: transparent; border: none; border-radius: 0;
  border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background-color 0.12s;
}
.cal2-grade > .cal2-cell:nth-child(7n) { border-right: none; }
.cal2-cell:hover { background-color: rgba(124,58,237,0.07); }
.cal2-cell.passado > * { opacity: 0.45; }
.cal2-cell.hoje { background-color: rgba(124,58,237,0.06); }
.cal2-fora { cursor: default; background-color: rgba(127,127,127,0.03); }
.cal2-fora:hover { background-color: rgba(127,127,127,0.03); }
.cal2-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; min-height: 24px; }
.cal2-num { font-size: 14px; font-weight: 600; color: var(--text); line-height: 24px; padding-left: 2px; }
.cal2-num.hoje {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 0; border-radius: 999px;
  background-color: var(--purple); color: #fff; font-weight: 700;
}
.cal2-outras { display: flex; gap: 3px; flex-wrap: wrap; justify-content: flex-end; }
.cal2-sigla {
  font-size: 10px; font-weight: 700; line-height: 16px; min-width: 18px; text-align: center;
  padding: 0 4px; border-radius: 5px; border: 1px solid;
}
.cal2-meio { flex: 1; display: flex; align-items: center; min-height: 28px; }
.cal2-faixa {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 5px;
  width: calc(100% + 18px); height: 24px; margin: 0 -9px; padding: 0 9px;
  border: 1px solid; border-left-width: 0; border-right-width: 0;
  font-size: 12px; font-weight: 600; overflow: hidden;
}
.cal2-faixa.ini { margin-left: 0; width: calc(100% + 9px); border-left-width: 1px; border-top-left-radius: 7px; border-bottom-left-radius: 7px; padding-left: 7px; }
.cal2-faixa.fim { margin-right: 0; width: calc(100% + 9px); border-right-width: 1px; border-top-right-radius: 7px; border-bottom-right-radius: 7px; }
.cal2-faixa.ini.fim { width: 100%; }
.cal2-faixa-texto { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.cal2-preco { font-size: 12px; color: var(--muted); text-align: right; min-height: 16px; font-variant-numeric: tabular-nums; }
.cal2-lado-a-lado { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.cal2-coluna + .cal2-coluna { border-left: 1px solid var(--border); }
.cal2-coluna-titulo {
  display: flex; align-items: center; gap: 8px; padding: 12px 16px;
  font-size: 14px; font-weight: 700; border-bottom: 1px solid var(--border);
}
.cal2-cell.compacto { min-height: 84px; padding: 6px; }
.cal2-cell.compacto .cal2-faixa { margin: 0 -7px; padding: 0 7px; width: calc(100% + 14px); font-size: 11px; height: 22px; }
.cal2-cell.compacto .cal2-faixa.ini { margin-left: 0; width: calc(100% + 7px); padding-left: 6px; }
.cal2-cell.compacto .cal2-faixa.fim { margin-right: 0; width: calc(100% + 7px); }
.cal2-cell.compacto .cal2-faixa.ini.fim { width: 100%; }
.cal2-cell.compacto .cal2-preco { font-size: 11px; }
.cal2-legenda {
  display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 14px 20px;
  border-top: 1px solid var(--border); font-size: 12px; color: var(--text);
}
.cal2-legenda span { display: inline-flex; align-items: center; gap: 7px; }
.cal2-legenda i { display: inline-block; width: 22px; height: 12px; border-radius: 4px; border: 1px solid; }
.cal2-lista { border-top: 1px solid var(--border); }
.cal2-lista-item {
  display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 16px;
  background: transparent; border: none; border-bottom: 1px solid var(--border);
  cursor: pointer; font: inherit; color: inherit;
}
.cal2-lista-data {
  width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  background-color: var(--field-bg); border: 1px solid var(--field-border); color: var(--text);
}
.cal2-painel {
  margin-top: 20px; padding: 20px; border-radius: 16px;
  background-color: var(--surface); border: 1px solid var(--border);
}
.cal2-cartao {
  padding: 16px; border-radius: 12px; border: 1px solid var(--border); border-left: 4px solid;
  background-color: var(--field-bg);
}
.cal2-acoes { display: flex; gap: 8px; flex-wrap: wrap; }
.cal2-so-celular { display: none !important; }
@media (max-width: 767px) {
  .cal2-so-celular { display: inline-flex !important; }
  .cal2-grade-wrap.esconder-no-celular { display: none; }
  .cal2-barra { padding: 14px; }
  .cal2-barra > div { width: 100%; }
  .cal2-acoes > button { flex: 1; }
  .cal2-segmento button { flex: 1; }
  .cal2-prefixo { display: none; }
  .cal2-abas button { flex: 1; justify-content: center; }
  .cal2-cell { min-height: 68px; padding: 4px; }
  .cal2-num { font-size: 12px; line-height: 20px; }
  .cal2-num.hoje { width: 22px; height: 22px; }
  .cal2-faixa, .cal2-cell.compacto .cal2-faixa { height: 18px; margin: 0 -5px; padding: 0 4px; width: calc(100% + 10px); font-size: 10px; }
  .cal2-faixa.ini, .cal2-cell.compacto .cal2-faixa.ini { margin-left: 0; width: calc(100% + 5px); padding-left: 4px; }
  .cal2-faixa.fim, .cal2-cell.compacto .cal2-faixa.fim { margin-right: 0; width: calc(100% + 5px); }
  .cal2-faixa.ini.fim, .cal2-cell.compacto .cal2-faixa.ini.fim { width: 100%; }
  .cal2-faixa svg { display: none; }
  .cal2-preco { font-size: 10px; }
  .cal2-sigla { font-size: 9px; line-height: 13px; min-width: 14px; padding: 0 2px; }
  .cal2-legenda { padding: 12px 14px; }
  .cal2-lado-a-lado { grid-template-columns: 1fr; }
  .cal2-coluna + .cal2-coluna { border-left: none; border-top: 1px solid var(--border); }
}
`
