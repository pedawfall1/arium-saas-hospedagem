import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar, BarChart2, ChevronRight, TrendingUp, Clock, BedDouble, Plus, Tag, LogIn, LogOut, Sun } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { RecentBookingsTable } from "@/components/dashboard/RecentBookingsTable"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { bookingRevenue } from "@/lib/financeiro"
import { seguraDatas } from "@/lib/hold"
import { hojeBR, limitesDoMes, somaDias } from "@/lib/hoje"
import { PrimeirosPassos } from "@/components/dashboard/PrimeirosPassos"

export const revalidate = 30

const ATIVAS = ['confirmed', 'checked_in', 'completed']

/** Cor de cada cabana, na mesma ordem do calendário. */
const COR_CABANA = ['#f97b00', '#8b5cf6', '#14b8a6']

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DIAS_EXTENSO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** 'yyyy-MM-dd' -> dia da semana (0 = domingo), sem passar por fuso. */
const diaSemana = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const reais = (v: number) => formatCurrency(v).replace(/,00$/, '')

export default async function TenantDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name, whatsapp_status')
    .eq('auth_user_id', user.id)
    .single()
  if (!tenant) redirect("/login")

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, base_price_weekday, base_price_weekend')
    .eq('tenant_id', tenant.id)

  // Mesma ordem do calendário (Doce Encanto primeiro), para as cores baterem.
  const cabanas = [...(properties || [])].sort((a: any, b: any) => {
    const doceId = '5be242bc-103f-4488-a9cc-fa8c240579ca'
    if (a.id === doceId) return -1
    if (b.id === doceId) return 1
    return 0
  })
  const propertyIds = cabanas.map(p => p.id)
  const cabana = (pid: string) => {
    const i = cabanas.findIndex(p => p.id === pid)
    return { nome: String(cabanas[i]?.name || '').replace('Cabana ', ''), cor: COR_CABANA[Math.max(0, i) % COR_CABANA.length] }
  }

  // Data e mês de Brasília (o servidor é UTC: depois das 21h já seria "amanhã").
  const now = new Date()
  const hoje = hojeBR(now)
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(hoje)
  const { inicio: inicioMesPassado, fim: fimMesPassado } = limitesDoMes(somaDias(inicioMes, -1))

  // O painel mostra o gráfico de 6 meses, o mês atual e as últimas reservas —
  // nada disso precisa do histórico completo. 13 meses cobre tudo com folga.
  const desde = somaDias(hoje, -400)

  let bookings: any[] = []
  let bloqueiosMes: any[] = []
  if (propertyIds.length > 0) {
    const [{ data }, { data: blocks }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, properties(name)')
        .in('property_id', propertyIds)
        .gte('check_in', desde)
        // Ordenado pela criação: "Reservas recentes" é o que acabou de entrar.
        .order('created_at', { ascending: false }),
      supabase
        .from('blocked_dates')
        .select('property_id, date')
        .in('property_id', propertyIds)
        .gte('date', inicioMes)
        .lte('date', fimMes),
    ])
    bookings = data || []
    bloqueiosMes = blocks || []
  }

  const { data: payments } = await supabase
    .from('booking_payments')
    .select('id, booking_id, amount, date')
    .eq('tenant_id', tenant.id)

  const pagamentosDa = (id: string) => (payments || []).filter(p => p.booking_id === id)

  // Só conta a pendente que AINDA segura as datas (trava de 24h). Uma pendente
  // vencida já foi liberada pelo site e não precisa mais de ação.
  const pendentes = bookings.filter(b => seguraDatas(b, now)).length

  // Mesma regra de Relatórios (lib/financeiro), atribuída pelo check-in.
  const receitaDoPeriodo = (de: string, ate: string) => bookings
    .filter(b => b.check_in >= de && b.check_in <= ate)
    .reduce((acc, b) => acc + bookingRevenue(b, hoje, pagamentosDa(b.id)).realizado, 0)
  const receitaMes = receitaDoPeriodo(inicioMes, fimMes)
  const receitaMesPassado = receitaDoPeriodo(inicioMesPassado, fimMesPassado)
  const mesPassadoNome = MESES[Number(inicioMesPassado.slice(5, 7)) - 1]

  // Ocupação do mês: noites indisponíveis (reserva ativa ou bloqueio) sobre o
  // total de noites de todas as cabanas. Reserva manual também gera bloqueio,
  // por isso cada noite entra uma vez só por cabana.
  const diasNoMes = Number(fimMes.slice(8, 10))
  const ocupadas = new Set<string>()
  for (const b of bloqueiosMes) ocupadas.add(`${b.property_id}|${b.date}`)
  for (const b of bookings) {
    if (!ATIVAS.includes(b.status)) continue
    if (b.check_out <= inicioMes || b.check_in > fimMes) continue
    for (let d = b.check_in < inicioMes ? inicioMes : b.check_in; d < b.check_out && d <= fimMes; d = somaDias(d, 1)) {
      ocupadas.add(`${b.property_id}|${d}`)
    }
  }
  const totalNoites = diasNoMes * cabanas.length
  const ocupacao = totalNoites > 0 ? Math.round((ocupadas.size / totalNoites) * 100) : 0

  // Próximos 7 dias: quem chega e quem sai (saídas primeiro no mesmo dia).
  const daquiUmaSemana = somaDias(hoje, 6)
  const confirmadas = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in')
  const movimentos = [
    ...confirmadas.filter(b => b.check_in >= hoje && b.check_in <= daquiUmaSemana).map(b => ({ tipo: 'chega' as const, data: b.check_in as string, b })),
    ...confirmadas.filter(b => b.check_out >= hoje && b.check_out <= daquiUmaSemana).map(b => ({ tipo: 'sai' as const, data: b.check_out as string, b })),
  ].sort((x, y) => x.data.localeCompare(y.data) || (x.tipo === 'sai' ? -1 : 1))
  // Em semana cheia a lista ficaria enorme: mostra os 8 primeiros movimentos.
  const LIMITE_MOV = 8
  const movimentosVisiveis = movimentos.slice(0, LIMITE_MOV)
  const diasComMovimento = [...new Set(movimentosVisiveis.map(m => m.data))]

  const rotuloDia = (iso: string) => {
    if (iso === hoje) return 'Hoje'
    if (iso === somaDias(hoje, 1)) return 'Amanhã'
    const s = DIAS[diaSemana(iso)]
    return `${s.charAt(0).toUpperCase() + s.slice(1)}, ${ddmm(iso)}`
  }

  const proximo = confirmadas
    .filter(b => b.check_in >= hoje)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))[0]

  const recentes = bookings.slice(0, 6)

  const [ano, mes, dia] = hoje.split('-').map(Number)
  const dataExtenso = `${DIAS_EXTENSO[diaSemana(hoje)]}, ${dia} de ${MESES[mes - 1]} de ${ano}`

  const card: React.CSSProperties = {
    backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
  }

  const indicadores = [
    {
      href: '/dashboard/reservas?status=pending', icone: Clock, rotulo: 'Aguardando ação',
      valor: String(pendentes),
      sub: pendentes === 0 ? 'Nenhuma reserva pendente' : pendentes === 1 ? 'reserva para aprovar' : 'reservas para aprovar',
      destaque: pendentes > 0 ? 'var(--warning)' : undefined, cor: '#eab308',
    },
    {
      href: '/dashboard/relatorios', icone: TrendingUp, rotulo: 'Receita do mês',
      valor: reais(receitaMes),
      sub: `${mesPassadoNome.charAt(0).toUpperCase() + mesPassadoNome.slice(1)}: ${reais(receitaMesPassado)}`,
      cor: '#22c55e',
    },
    {
      href: '/dashboard/calendario', icone: BedDouble, rotulo: 'Ocupação do mês',
      valor: `${ocupacao}%`,
      sub: `${ocupadas.size} de ${totalNoites} noites ocupadas`,
      cor: '#8b5cf6', barra: ocupacao,
    },
    {
      href: proximo ? `/dashboard/reservas/${proximo.id}` : '/dashboard/calendario', icone: Calendar, rotulo: 'Próximo check-in',
      valor: proximo ? String(proximo.guest_name || '').trim() : 'Nenhum',
      sub: proximo ? `${rotuloDia(proximo.check_in)} · ${cabana(proximo.property_id).nome}` : 'Sem chegadas marcadas',
      cor: '#3b82f6', texto: true,
    },
  ]

  return (
    <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>
      <style>{CSS_INICIO}</style>

      <div className="ini-topo">
        <div style={{ minWidth: 0 }}>
          <h1>Olá, <span style={{ color: 'var(--accent)' }}>{tenant.business_name}</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{dataExtenso}</p>
        </div>
        <Link href="/dashboard/reservas/nova" className="ini-btn-primario">
          <Plus size={16} /> Nova reserva
        </Link>
      </div>

      <PrimeirosPassos
        temCabana={cabanas.length > 0}
        temPreco={cabanas.some(p => Number(p.base_price_weekday) > 0 && Number(p.base_price_weekend) > 0)}
        temWhatsapp={tenant.whatsapp_status === 'connected'}
        temReserva={bookings.length > 0}
      />

      {/* Indicadores */}
      <div className="ini-indicadores">
        {indicadores.map(({ href, icone: Icone, rotulo, valor, sub, destaque, cor, barra, texto }) => (
          <Link key={rotulo} href={href} className="ini-indicador" style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span className="ini-icone" style={{ backgroundColor: `${cor}1f`, color: cor }}><Icone size={15} /></span>
              <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 500 }}>{rotulo}</span>
            </div>
            <p className={texto ? 'ini-valor ini-valor-texto' : 'ini-valor'} style={{ color: destaque || 'var(--text)' }}>{valor}</p>
            {barra !== undefined && (
              <div className="ini-barra"><div style={{ width: `${Math.min(100, barra)}%`, backgroundColor: cor }} /></div>
            )}
            <p className="ini-sub" style={{ marginTop: barra !== undefined ? '8px' : '6px' }}>{sub}</p>
          </Link>
        ))}
      </div>

      <div className="ini-grade">
        {/* Coluna principal */}
        <div className="ini-coluna">
          <section className="ini-ordem-3" style={{ ...card, padding: '20px 20px 12px' }}>
            <div className="ini-secao-topo">
              <h2>Receita dos últimos 6 meses</h2>
              <Link href="/dashboard/relatorios" className="ini-link">Relatórios <ChevronRight size={14} /></Link>
            </div>
            <RevenueChart bookings={bookings} payments={payments || []} />
          </section>

          <section className="ini-ordem-2" style={{ ...card, overflow: 'hidden' }}>
            <div className="ini-secao-topo" style={{ padding: '18px 20px 6px', marginBottom: 0 }}>
              <h2>Reservas recentes</h2>
              <Link href="/dashboard/reservas" className="ini-link">Ver todas <ChevronRight size={14} /></Link>
            </div>
            <RecentBookingsTable bookings={recentes.map(b => ({ ...b, _cabana: cabana(b.property_id) }))} />
          </section>
        </div>

        {/* Lateral */}
        <div className="ini-coluna">
          <section className="ini-ordem-1" style={{ ...card, padding: '18px 20px' }}>
            <div className="ini-secao-topo">
              <h2>Próximos 7 dias</h2>
              <Link href="/dashboard/hoje" className="ini-link"><Sun size={13} /> Ver hoje</Link>
            </div>
            {diasComMovimento.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px', padding: '4px 0' }}>Nenhuma entrada ou saída nos próximos 7 dias.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {diasComMovimento.map(d => (
                  <div key={d}>
                    <p className="ini-dia" style={d === hoje ? { color: 'var(--accent)' } : undefined}>{rotuloDia(d)}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {movimentosVisiveis.filter(m => m.data === d).map(m => {
                        const c = cabana(m.b.property_id)
                        return (
                          <Link key={m.tipo + m.b.id} href={`/dashboard/reservas/${m.b.id}`} className="ini-mov">
                            <span className="ini-icone" style={m.tipo === 'chega'
                              ? { color: 'var(--success)', backgroundColor: 'rgba(34,197,94,0.12)' }
                              : { color: 'var(--muted)', backgroundColor: 'rgba(148,163,184,0.12)' }}>
                              {m.tipo === 'chega' ? <LogIn size={13} /> : <LogOut size={13} />}
                            </span>
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span className="ini-mov-nome">{String(m.b.guest_name || '').trim()}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '12px' }}>
                                <span style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: c.cor, flexShrink: 0 }} />
                                {m.tipo === 'chega' ? 'Chega' : 'Sai'} · {c.nome}
                              </span>
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {movimentos.length > LIMITE_MOV && (
                  <Link href="/dashboard/calendario" className="ini-link">
                    +{movimentos.length - LIMITE_MOV} {movimentos.length - LIMITE_MOV === 1 ? 'movimento' : 'movimentos'} na semana · ver calendário <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </section>

          <section className="ini-ordem-4" style={{ ...card, padding: '8px' }}>
            {[
              { href: '/dashboard/calendario', icone: Calendar, titulo: 'Calendário', sub: 'Ocupação e bloqueios' },
              { href: '/dashboard/propriedades', icone: Tag, titulo: 'Preços e feriados', sub: 'Diárias, regras e datas especiais' },
              { href: '/dashboard/relatorios', icone: BarChart2, titulo: 'Relatórios', sub: 'Faturamento e despesas' },
            ].map(({ href, icone: Icone, titulo, sub }) => (
              <Link key={href} href={href} className="ini-atalho">
                <span className="ini-icone" style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.12)', color: 'var(--accent)' }}><Icone size={17} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>{titulo}</span>
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: '12px' }}>{sub}</span>
                </span>
                <ChevronRight size={16} color="var(--muted)" />
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

const CSS_INICIO = `
.ini-topo { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
.ini-topo h1 { font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.ini-btn-primario {
  display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px;
  border-radius: 10px; background-color: var(--purple); color: #fff; font-size: 14px; font-weight: 600;
  text-decoration: none; transition: filter 0.15s;
}
.ini-btn-primario:hover { filter: brightness(1.12); }
.ini-indicadores { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
.ini-indicador { display: block; padding: 18px 20px; text-decoration: none; min-width: 0; transition: border-color 0.15s, transform 0.15s; }
.ini-indicador:hover { border-color: rgba(124,58,237,0.5) !important; transform: translateY(-2px); }
.ini-icone { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; }
.ini-valor { font-size: 28px; font-weight: 700; line-height: 34px; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ini-valor-texto { font-size: 20px; }
.ini-sub { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ini-barra { height: 6px; border-radius: 99px; background-color: rgba(148,163,184,0.15); margin-top: 10px; overflow: hidden; }
.ini-barra > div { height: 100%; border-radius: 99px; }
.ini-grade { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
.ini-coluna { min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.ini-secao-topo { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.ini-secao-topo h2 { color: var(--text); font-size: 15px; font-weight: 700; }
.ini-link { display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-size: 13px; font-weight: 500; text-decoration: none; white-space: nowrap; }
.ini-link:hover { text-decoration: underline; }
.ini-dia { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 6px; }
.ini-mov { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; text-decoration: none; background-color: var(--field-bg); border: 1px solid var(--border); transition: border-color 0.15s; }
.ini-mov:hover { border-color: rgba(124,58,237,0.5); }
.ini-mov-nome { display: block; color: var(--text); font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ini-atalho { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 12px; text-decoration: none; transition: background-color 0.15s; }
.ini-atalho:hover { background-color: rgba(124,58,237,0.08); }
@media (max-width: 1199px) {
  .ini-indicadores { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ini-grade { grid-template-columns: minmax(0, 1fr); }
  /* Uma coluna só: o que importa no dia a dia vem primeiro. */
  .ini-coluna { display: contents; }
  .ini-ordem-1 { order: 1; } .ini-ordem-2 { order: 2; } .ini-ordem-3 { order: 3; } .ini-ordem-4 { order: 4; }
}
@media (max-width: 767px) {
  .ini-indicadores { gap: 10px; }
  .ini-indicador { padding: 14px; }
  .ini-valor { font-size: 22px; line-height: 28px; }
  .ini-valor-texto { font-size: 16px; }
  .ini-topo h1 { font-size: 22px; }
  .ini-btn-primario { width: 100%; justify-content: center; }
}
`
