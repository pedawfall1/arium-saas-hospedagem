"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/Badge"
import { BookOpen, Clock, CalendarCheck, TrendingUp, Plus, Search, X } from "lucide-react"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { HoldCountdown, BookingFlags, useMinuteTick } from "@/components/ui/HoldCountdown"
import { bookingRevenue, type PaymentLike } from "@/lib/financeiro"
import { seguraDatas } from "@/lib/hold"
import { hojeBR } from "@/lib/hoje"

type Aba = 'proximas' | 'passadas' | 'canceladas'

/** Cor de cada cabana, na mesma ordem do calendário e do Início. */
const COR_CABANA = ['#f97b00', '#8b5cf6', '#14b8a6']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const diaSemana = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export function ReservasClient({ bookings, properties, payments = [], statusInicial = 'all' }: {
  bookings: any[], properties: any[], payments?: PaymentLike[], statusInicial?: string
}) {
  const router = useRouter()
  const agora = useMinuteTick()
  const [aba, setAba] = useState<Aba>('proximas')
  const [filterProp, setFilterProp] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>(statusInicial)
  const [searchGuest, setSearchGuest] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const hoje = hojeBR()

  const cabanas = useMemo(() => [...properties].sort((a: any, b: any) => {
    const doceId = '5be242bc-103f-4488-a9cc-fa8c240579ca'
    if (a.id === doceId) return -1
    if (b.id === doceId) return 1
    return 0
  }), [properties])
  const cabana = (pid: string) => {
    const i = cabanas.findIndex((p: any) => p.id === pid)
    return { nome: String(cabanas[i]?.name || '').replace('Cabana ', ''), cor: COR_CABANA[Math.max(0, i) % COR_CABANA.length] }
  }

  const pagamentosPorReserva = useMemo(() => {
    const m = new Map<string, PaymentLike[]>()
    for (const p of payments) {
      const l = m.get(p.booking_id)
      if (l) l.push(p); else m.set(p.booking_id, [p])
    }
    return m
  }, [payments])

  // ---- Indicadores ----
  const pendentes = agora ? bookings.filter(b => seguraDatas(b, agora)).length : bookings.filter(b => b.status === 'pending').length
  const proximasEstadias = bookings.filter(b => (b.status === 'confirmed' || b.status === 'checked_in') && b.check_out >= hoje).length
  // Mesma regra de Relatórios e do Início (lib/financeiro), com os pagamentos lançados.
  const receitaRealizada = bookings.reduce((s, b) => s + bookingRevenue(b, hoje, pagamentosPorReserva.get(b.id)).realizado, 0)

  // ---- Abas ----
  const daAba = (a: Aba, b: any) =>
    a === 'canceladas' ? b.status === 'cancelled'
      : b.status !== 'cancelled' && (a === 'proximas' ? b.check_out >= hoje : b.check_out < hoje)
  const contagem = (a: Aba) => bookings.filter(b => daAba(a, b)).length

  const filtrosAtivos = filterProp !== 'all' || filterStatus !== 'all' || !!searchGuest || !!filterDateFrom || !!filterDateTo
  const limpar = () => { setFilterProp('all'); setFilterStatus('all'); setSearchGuest(''); setFilterDateFrom(''); setFilterDateTo('') }

  const filtered = bookings
    .filter(b => daAba(aba, b))
    .filter(b => {
      if (aba !== 'canceladas' && filterStatus !== 'all' && b.status !== filterStatus) return false
      if (filterProp !== "all" && b.property_id !== filterProp) return false
      if (searchGuest && !String(b.guest_name || '').toLowerCase().includes(searchGuest.toLowerCase().trim())) return false
      // Período: check-in dentro do intervalo escolhido
      if (filterDateFrom && b.check_in < filterDateFrom) return false
      if (filterDateTo && b.check_in > filterDateTo) return false
      return true
    })
    .sort((a, b) =>
      aba === 'proximas' ? a.check_in.localeCompare(b.check_in)
        : aba === 'passadas' ? b.check_in.localeCompare(a.check_in)
          : String(b.created_at).localeCompare(String(a.created_at)))

  // Agrupa por mês do check-in
  const grupos: { chave: string, titulo: string, itens: any[] }[] = []
  for (const b of filtered) {
    const chave = b.check_in.slice(0, 7)
    let g = grupos.find(x => x.chave === chave)
    if (!g) {
      g = { chave, titulo: `${MESES[Number(chave.slice(5, 7)) - 1]} ${chave.slice(0, 4)}`, itens: [] }
      grupos.push(g)
    }
    g.itens.push(b)
  }

  const handleWppClick = (e: React.MouseEvent, phone: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(`https://wa.me/${String(phone).replace(/\D/g, '')}`, '_blank')
  }

  const card: React.CSSProperties = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }

  const indicadores = [
    { icone: Clock, rotulo: 'Pendentes', valor: String(pendentes), cor: '#eab308', destaque: pendentes > 0 ? 'var(--warning)' : undefined,
      sub: pendentes > 0 ? 'aguardando aprovação' : 'nada para aprovar',
      onClick: () => { setAba('proximas'); setFilterStatus('pending') } },
    { icone: CalendarCheck, rotulo: 'Próximas estadias', valor: String(proximasEstadias), cor: '#3b82f6',
      sub: 'confirmadas a partir de hoje', onClick: () => { setAba('proximas'); setFilterStatus('all') } },
    { icone: TrendingUp, rotulo: 'Receita realizada', valor: formatCurrency(receitaRealizada).replace(/,00$/, ''), cor: '#22c55e',
      sub: 'tudo que já entrou', onClick: () => router.push('/dashboard/relatorios') },
  ]

  return (
    <div style={{ width: '100%' }}>
      <style>{CSS_RESERVAS}</style>

      <div className="res-topo">
        <div>
          <h1>Reservas</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Acompanhe e gerencie as reservas das suas cabanas.</p>
        </div>
        <Link href="/dashboard/reservas/nova" className="res-btn-primario"><Plus size={16} /> Nova reserva</Link>
      </div>

      <div className="res-indicadores">
        {indicadores.map(({ icone: Icone, rotulo, valor, cor, destaque, sub, onClick }) => (
          <button key={rotulo} type="button" onClick={onClick} className="res-indicador" style={card}>
            <span className="res-icone" style={{ backgroundColor: `${cor}1f`, color: cor }}><Icone size={16} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: 'var(--muted)', fontSize: '12px', fontWeight: 500 }}>{rotulo}</span>
              <span className="res-valor" style={{ color: destaque || 'var(--text)' }}>{valor}</span>
              <span style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>{sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        {/* Abas */}
        <div className="res-abas">
          {([['proximas', 'Próximas'], ['passadas', 'Passadas'], ['canceladas', 'Canceladas']] as [Aba, string][]).map(([a, nome]) => (
            <button key={a} type="button" onClick={() => setAba(a)} className={aba === a ? 'ativa' : ''}>
              {nome} <span className="res-contagem">{contagem(a)}</span>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="res-filtros">
          <div className="res-busca">
            <Search size={16} />
            <input type="text" placeholder="Buscar hóspede" value={searchGuest} onChange={e => setSearchGuest(e.target.value)} aria-label="Buscar hóspede" />
          </div>
          <select value={filterProp} onChange={e => setFilterProp(e.target.value)} aria-label="Cabana">
            <option value="all">Todas as cabanas</option>
            {cabanas.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {aba !== 'canceladas' && (
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Status">
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="checked_in">Em hospedagem</option>
              <option value="completed">Concluídas</option>
            </select>
          )}
          <div className="res-periodo">
            <label className="res-data">
              <span>Check-in de</span>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </label>
            <label className="res-data">
              <span>até</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </label>
          </div>
          {filtrosAtivos && (
            <button type="button" onClick={limpar} className="res-limpar"><X size={14} /> Limpar</button>
          )}
        </div>

        {filtrosAtivos && (
          <p style={{ color: 'var(--muted)', fontSize: '12px', padding: '0 20px 10px' }}>
            {filtered.length} de {contagem(aba)} {aba === 'canceladas' ? 'canceladas' : aba === 'passadas' ? 'reservas passadas' : 'próximas reservas'}
          </p>
        )}

        {/* Cabeçalho da lista (computador) */}
        {filtered.length > 0 && (
          <div className="res-linha res-cabecalho">
            <span>Hóspede</span><span>Cabana</span><span>Período</span><span>Valor</span><span>Situação</span>
          </div>
        )}

        {grupos.map(g => (
          <div key={g.chave}>
            <div className="res-mes">{g.titulo} <span>· {g.itens.length}</span></div>
            {g.itens.map(b => {
              const c = cabana(b.property_id)
              const nome = String(b.guest_name || '').trim()
              const noites = Math.max(1, differenceInCalendarDays(parseISO(b.check_out), parseISO(b.check_in)))
              const agoraNaCabana = b.check_in <= hoje && b.check_out > hoje && b.status !== 'cancelled'
              return (
                <Link key={b.id} href={`/dashboard/reservas/${b.id}`} className="res-linha res-item">
                  <span className="res-hospede">
                    <span className="res-avatar" style={{ backgroundColor: `${c.cor}24`, color: c.cor }}>{nome.charAt(0).toUpperCase() || '?'}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span className="res-nome">{nome}</span>
                        {b.guest_phone && (
                          <span role="button" tabIndex={0} onClick={(e) => handleWppClick(e, b.guest_phone)} title="Chamar no WhatsApp" aria-label="Chamar no WhatsApp" className="res-wpp">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                          </span>
                        )}
                      </span>
                      <span className="res-so-celular res-sub">
                        <span style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: c.cor, flexShrink: 0 }} />
                        {c.nome}
                      </span>
                      <span className="res-so-celular res-sub">
                        {ddmm(b.check_in)} → {ddmm(b.check_out)} · {noites} {noites === 1 ? 'noite' : 'noites'}
                      </span>
                    </span>
                  </span>
                  <span className="res-so-pc" style={{ alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: c.cor, flexShrink: 0 }} /> {c.nome}
                  </span>
                  <span className="res-so-pc" style={{ flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 500 }}>
                      {diaSemana(b.check_in)} {ddmm(b.check_in)} → {diaSemana(b.check_out)} {ddmm(b.check_out)}
                    </span>
                    <span style={{ color: agoraNaCabana ? 'var(--success)' : 'var(--muted)', fontSize: '12px' }}>
                      {noites} {noites === 1 ? 'noite' : 'noites'}{agoraNaCabana ? ' · hospedado agora' : ''}
                    </span>
                  </span>
                  <span className="res-valor-col">
                    <span style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(b.total_amount)}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '12px' }}>sinal {formatCurrency(b.deposit_amount)}</span>
                  </span>
                  <span className="res-situacao">
                    <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <StatusBadge status={b.status} />
                      {b.status !== 'cancelled' && <StatusBadge status={b.payment_status} />}
                    </span>
                    <HoldCountdown booking={b} />
                    <BookingFlags booking={b} />
                  </span>
                </Link>
              )
            })}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <BookOpen size={36} style={{ color: 'var(--muted)', opacity: 0.4, margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              {filtrosAtivos ? 'Nenhuma reserva com esses filtros' : aba === 'canceladas' ? 'Nenhuma reserva cancelada' : aba === 'passadas' ? 'Nenhuma reserva passada' : 'Nenhuma reserva pela frente'}
            </p>
            {filtrosAtivos && <button type="button" onClick={limpar} className="res-limpar" style={{ margin: '8px auto 0' }}>Limpar filtros</button>}
          </div>
        )}
      </div>
    </div>
  )
}

const CSS_RESERVAS = `
.res-topo { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.res-topo h1 { color: var(--text); font-size: 28px; font-weight: 700; margin-bottom: 4px; }
.res-btn-primario { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px; border-radius: 10px; background-color: var(--purple); color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; transition: filter 0.15s; }
.res-btn-primario:hover { filter: brightness(1.12); }
.res-indicadores { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
.res-indicador { display: flex; align-items: center; gap: 14px; padding: 16px 18px; text-align: left; cursor: pointer; font: inherit; transition: border-color 0.15s; min-width: 0; }
.res-indicador:hover { border-color: rgba(124,58,237,0.5) !important; }
.res-icone { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; }
.res-valor { display: block; font-size: 22px; font-weight: 700; line-height: 28px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-abas { display: flex; gap: 4px; padding: 10px 12px 0; border-bottom: 1px solid var(--border); overflow-x: auto; }
.res-abas button { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; margin-bottom: -1px; }
.res-abas button:hover { color: var(--text); }
.res-abas button.ativa { color: var(--text); font-weight: 600; border-bottom-color: var(--purple); }
.res-contagem { font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 99px; background-color: rgba(148,163,184,0.15); color: var(--muted); }
.res-abas button.ativa .res-contagem { background-color: rgba(124,58,237,0.18); color: var(--accent); }
.res-filtros { display: flex; flex-wrap: wrap; gap: 10px; padding: 16px 20px; align-items: center; }
.res-filtros select, .res-filtros .res-data input { height: 40px; padding: 0 12px; font-size: 14px; }
.res-filtros select { min-width: 150px; flex: 0 1 180px; }
.res-periodo { display: flex; gap: 8px; flex: 0 1 auto; }
.res-periodo input { width: 150px; }
.res-busca { position: relative; flex: 1 1 180px; min-width: 160px; }
.res-busca svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
.res-busca input { width: 100%; height: 40px; padding: 0 12px 0 36px; font-size: 14px; }
.res-data { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; white-space: nowrap; }
.res-limpar { display: inline-flex; align-items: center; gap: 4px; height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--field-border); background: transparent; color: var(--muted); font-size: 13px; cursor: pointer; }
.res-limpar:hover { color: var(--text); }
.res-linha { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(0, 1.2fr) minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1.5fr); gap: 16px; align-items: center; padding: 12px 20px; }
.res-cabecalho { padding-top: 8px; padding-bottom: 8px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.res-mes { padding: 14px 20px 6px; color: var(--text); font-size: 13px; font-weight: 700; border-top: 1px solid var(--border); background-color: rgba(127,127,127,0.03); }
.res-mes span { color: var(--muted); font-weight: 500; }
.res-item { text-decoration: none; border-top: 1px solid var(--border); transition: background-color 0.15s; }
.res-item:hover { background-color: rgba(124,58,237,0.06); }
.res-hospede { display: flex; align-items: center; gap: 12px; min-width: 0; }
.res-avatar { width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
.res-nome { color: var(--text); font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-wpp { display: inline-flex; color: var(--whatsapp); padding: 2px; cursor: pointer; flex-shrink: 0; }
.res-sub { align-items: center; gap: 6px; color: var(--muted); font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; }
.res-valor-col { display: flex; flex-direction: column; min-width: 0; }
.res-situacao { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
.res-so-pc { display: flex; min-width: 0; }
.res-so-celular { display: none; }
@media (max-width: 1023px) {
  .res-linha { grid-template-columns: minmax(0, 1fr) auto; row-gap: 8px; }
  .res-cabecalho { display: none; }
  .res-so-pc { display: none; }
  .res-so-celular { display: flex; }
  .res-valor-col { align-items: flex-end; }
  .res-situacao { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 6px; padding-left: 48px; }
}
@media (max-width: 767px) {
  .res-topo h1 { font-size: 22px; }
  .res-btn-primario { width: 100%; justify-content: center; }
  .res-indicadores { grid-template-columns: 1fr 1fr; gap: 10px; }
  .res-indicador { padding: 12px; gap: 10px; }
  .res-indicador:last-child { grid-column: 1 / -1; }
  .res-icone { width: 34px; height: 34px; border-radius: 10px; }
  .res-valor { font-size: 20px; line-height: 26px; }
  .res-abas { padding: 6px 8px 0; }
  .res-abas button { padding: 10px; }
  .res-periodo { flex: 1 1 100%; }
  .res-periodo .res-data { flex: 1; min-width: 0; flex-direction: column; align-items: stretch; gap: 4px; }
  .res-periodo input { width: 100%; min-width: 0; min-height: 40px; flex: none; }
  .res-filtros { padding: 14px 16px; }
  .res-filtros select { flex: 1 1 140px; min-width: 0; }
  .res-data { flex: 1 1 140px; }
  .res-data input { flex: 1; min-width: 0; }
  .res-linha { padding: 12px 16px; }
  .res-mes { padding: 12px 16px 6px; }
}
`
