"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { executar } from "@/lib/salvar"
import { LogIn, LogOut, BedDouble, CalendarClock, MessageCircle, ChevronRight, Check, Sparkles, Gift, StickyNote, Users } from "lucide-react"

/** Cor de cada cabana, na mesma ordem do calendário e do Início. */
const COR_CABANA = ['#f97b00', '#8b5cf6', '#14b8a6']
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DIAS_EXTENSO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const diaSemana = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
const dataCurta = (iso: string) => `${DIAS[diaSemana(iso)]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/**
 * A tela que a dona abre de manhã, no celular: quem chega, quem sai, quem está
 * na cabana agora. Coluna única — nada de tabela que precise rolar.
 */
export function HojeClient({ properties, bookings, payments = [], hoje, amanha }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [processando, setProcessando] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const cabanas = [...properties].sort((a: any, b: any) => {
    const doceId = '5be242bc-103f-4488-a9cc-fa8c240579ca'
    if (a.id === doceId) return -1
    if (b.id === doceId) return 1
    return 0
  })
  const cabana = (id: string) => {
    const i = cabanas.findIndex((p: any) => p.id === id)
    return { ...(cabanas[i] || {}), cor: COR_CABANA[Math.max(0, i) % COR_CABANA.length] }
  }

  const chegamHoje = bookings.filter((b: any) => b.check_in === hoje && b.status === 'confirmed')
  const saemHoje = bookings.filter((b: any) => b.check_out === hoje)
  // Quem já entrou hoje (check-in marcado) ou está no meio da estadia. Reserva
  // manual costuma ficar "confirmada" o tempo todo, sem check-in marcado: antes
  // ela nunca aparecia aqui nos dias do meio.
  const naCabana = bookings.filter((b: any) =>
    (b.check_in === hoje && b.status === 'checked_in') ||
    (b.check_in < hoje && b.check_out > hoje && (b.status === 'checked_in' || b.status === 'confirmed'))
  )
  const chegamAmanha = bookings.filter((b: any) => b.check_in === amanha)

  const recebidoDa = (id: string) => payments.filter((p: any) => p.booking_id === id).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const aReceber = (b: any) => {
    if (b.is_courtesy || b.payment_status === 'fully_paid') return 0
    const total = Number(b.total_amount || 0)
    const temLancamento = payments.some((p: any) => p.booking_id === b.id)
    // Com recebimentos lançados, vale o que entrou de fato; sem, o sinal.
    const pago = temLancamento ? recebidoDa(b.id) : Number(b.deposit_amount || 0)
    return Math.max(0, total - pago)
  }

  const marcar = async (b: any, novoStatus: string) => {
    setProcessando(b.id)
    setErro('')
    const r = await executar(supabase.from('bookings').update({ status: novoStatus }).eq('id', b.id))
    setProcessando(null)
    if (!r.ok) return setErro(r.erro)
    router.refresh()
  }

  const whatsapp = (telefone: string) => {
    const digitos = String(telefone || '').replace(/\D/g, '')
    if (!digitos || digitos === '00000000000') return
    window.open(`https://wa.me/${digitos.startsWith('55') ? digitos : '55' + digitos}`, '_blank')
  }
  const temTelefone = (t: string) => {
    const d = String(t || '').replace(/\D/g, '')
    return d.length >= 10 && d !== '00000000000'
  }

  const [, mes, dia] = hoje.split('-').map(Number)
  const dataExtenso = `${DIAS_EXTENSO[diaSemana(hoje)]}, ${dia} de ${MESES[mes - 1]}`

  const reserva = (b: any, acao: { texto: string, status: string, Icone: any, cor: string } | null) => {
    const c = cabana(b.property_id)
    const receber = aReceber(b)
    return (
      <div key={b.id} className="hoje-card" style={{ borderLeftColor: c.cor }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="hoje-nome">{String(b.guest_name || '').trim()}</p>
            <p className="hoje-sub">
              <span className="hoje-ponto" style={{ backgroundColor: c.cor }} />
              {String(c.name || '—').replace('Cabana ', '')}
              {b.guests_count ? <><span style={{ opacity: 0.5 }}>·</span><Users size={13} /> {b.guests_count}</> : null}
            </p>
          </div>
          {b.is_courtesy && <span className="hoje-selo"><Gift size={12} /> Cortesia</span>}
        </div>

        <div className="hoje-datas">
          <span>Entra <strong>{dataCurta(b.check_in)}</strong>{c.checkin_time ? ` às ${String(c.checkin_time).slice(0, 5)}` : ''}</span>
          <span>Sai <strong>{dataCurta(b.check_out)}</strong>{c.checkout_time ? ` até ${String(c.checkout_time).slice(0, 5)}` : ''}</span>
        </div>

        {receber > 0 && (
          <p className="hoje-receber">Receber {b.check_in >= hoje ? 'na chegada' : 'em aberto'}: {formatCurrency(receber)}</p>
        )}

        {b.notes && (
          <p className="hoje-notas"><StickyNote size={13} style={{ flexShrink: 0, marginTop: '2px' }} /> <span>{b.notes}</span></p>
        )}

        <div className="hoje-acoes">
          {acao && (
            <button onClick={() => marcar(b, acao.status)} disabled={processando === b.id} className="hoje-btn-acao" style={{ backgroundColor: acao.cor }}>
              <acao.Icone size={16} /> {processando === b.id ? 'Salvando...' : acao.texto}
            </button>
          )}
          {temTelefone(b.guest_phone) && (
            <button onClick={() => whatsapp(b.guest_phone)} className="hoje-btn-wpp">
              <MessageCircle size={15} /> WhatsApp
            </button>
          )}
          <Link href={`/dashboard/reservas/${b.id}`} className="hoje-btn-det">
            Detalhes <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  const secoes = [
    { id: 'chegam', titulo: 'Chegam hoje', Icone: LogIn, cor: '#22c55e', itens: chegamHoje, vazio: 'Nenhuma chegada para hoje.',
      acao: { texto: 'Fazer check-in', status: 'checked_in', Icone: Check, cor: '#16a34a' } },
    { id: 'saem', titulo: 'Saem hoje', Icone: LogOut, cor: '#3b82f6', itens: saemHoje, vazio: 'Ninguém sai hoje.',
      acao: { texto: 'Finalizar estadia', status: 'completed', Icone: Sparkles, cor: '#2563eb' } },
    { id: 'agora', titulo: 'Na cabana agora', Icone: BedDouble, cor: '#8b5cf6', itens: naCabana, vazio: 'Nenhuma cabana ocupada no momento.', acao: null },
    { id: 'amanha', titulo: 'Chegam amanhã', Icone: CalendarClock, cor: '#eab308', itens: chegamAmanha, vazio: 'Nenhuma chegada para amanhã.', acao: null },
  ]

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto' }}>
      <style>{CSS_HOJE}</style>
      <h1 style={{ color: 'var(--text)', fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>Hoje</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>{dataExtenso}</p>

      {/* Resumo: toca e desce até a seção */}
      <div className="hoje-resumo">
        {secoes.map(({ id, titulo, Icone, cor, itens }) => (
          <a key={id} href={`#${id}`} className="hoje-resumo-item">
            <span className="hoje-icone" style={{ backgroundColor: `${cor}1f`, color: cor }}><Icone size={15} /></span>
            <span style={{ minWidth: 0 }}>
              <strong style={{ color: itens.length ? 'var(--text)' : 'var(--muted)' }}>{itens.length}</strong>
              <small>{titulo}</small>
            </span>
          </a>
        ))}
      </div>

      {erro && <div className="hoje-erro">{erro}</div>}

      {secoes.map(({ id, titulo, Icone, cor, itens, vazio, acao }) => (
        <section key={id} id={id} className="hoje-secao">
          <div className="hoje-secao-topo">
            <span className="hoje-icone" style={{ backgroundColor: `${cor}1f`, color: cor, width: 34, height: 34, borderRadius: 10 }}><Icone size={17} /></span>
            <h2>{titulo}</h2>
            <span className="hoje-contagem" style={itens.length ? { color: cor, borderColor: `${cor}66`, backgroundColor: `${cor}14` } : undefined}>{itens.length}</span>
          </div>
          {itens.length === 0
            ? <p className="hoje-vazio">{vazio}</p>
            : itens.map((b: any) => reserva(b, acao))}
        </section>
      ))}
    </div>
  )
}

const CSS_HOJE = `
.hoje-resumo { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 28px; }
.hoje-resumo-item { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 14px; background-color: var(--surface); border: 1px solid var(--border); text-decoration: none; transition: border-color 0.15s; min-width: 0; }
.hoje-resumo-item:hover { border-color: rgba(124,58,237,0.5); }
.hoje-resumo-item strong { display: block; font-size: 20px; line-height: 1.1; font-weight: 700; }
.hoje-resumo-item small { display: block; color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hoje-icone { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; }
.hoje-erro { background-color: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 13px 16px; margin-bottom: 18px; color: var(--danger); font-size: 14px; font-weight: 500; }
.hoje-secao { margin-bottom: 30px; scroll-margin-top: 90px; }
.hoje-secao-topo { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.hoje-secao-topo h2 { color: var(--text); font-size: 16px; font-weight: 700; flex: 1; }
.hoje-contagem { min-width: 30px; text-align: center; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); font-size: 13px; font-weight: 700; }
.hoje-vazio { color: var(--muted); font-size: 14px; padding: 14px 16px; border: 1px dashed var(--field-border); border-radius: 12px; }
.hoje-card { background-color: var(--surface); border: 1px solid var(--border); border-left: 4px solid; border-radius: 14px; padding: 16px 18px; margin-bottom: 12px; }
.hoje-nome { color: var(--text); font-size: 17px; font-weight: 700; line-height: 1.25; }
.hoje-sub { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; margin-top: 4px; }
.hoje-ponto { width: 7px; height: 7px; border-radius: 99px; flex-shrink: 0; }
.hoje-selo { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; white-space: nowrap; color: var(--violet-mid); background-color: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.3); border-radius: 6px; padding: 2px 8px; }
.hoje-datas { display: flex; gap: 6px 18px; flex-wrap: wrap; margin-top: 12px; font-size: 13px; color: var(--muted); }
.hoje-datas strong { color: var(--text); }
.hoje-receber { margin-top: 10px; padding: 8px 12px; border-radius: 10px; background-color: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); color: var(--warning); font-size: 13px; font-weight: 600; }
.hoje-notas { display: flex; gap: 6px; color: var(--muted); font-size: 13px; margin-top: 10px; line-height: 1.45; }
.hoje-acoes { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.hoje-btn-acao { flex: 1 1 160px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 16px; border-radius: 10px; border: none; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; }
.hoje-btn-acao:disabled { opacity: 0.6; cursor: not-allowed; }
.hoje-btn-wpp { display: inline-flex; align-items: center; gap: 6px; height: 42px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(37,211,102,0.4); background-color: rgba(37,211,102,0.1); color: var(--whatsapp); font-weight: 600; font-size: 14px; cursor: pointer; }
.hoje-btn-det { display: inline-flex; align-items: center; gap: 4px; height: 42px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--field-border); color: var(--muted); font-weight: 600; font-size: 14px; text-decoration: none; }
.hoje-btn-det:hover { color: var(--text); }
@media (max-width: 600px) {
  .hoje-resumo { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`
