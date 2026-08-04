"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import { executar } from "@/lib/salvar"
import { LogIn, LogOut, BedDouble, CalendarClock, MessageCircle, ChevronRight } from "lucide-react"

/**
 * A tela que a dona abre de manhã, no celular: quem chega, quem sai, quem está
 * na cabana agora. Feita coluna única — nada de tabela que precise rolar.
 */
export function HojeClient({ properties, bookings, hoje, amanha }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [processando, setProcessando] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const nomeCabana = (id: string) => properties.find((p: any) => p.id === id)?.name ?? '—'
  const cabana = (id: string) => properties.find((p: any) => p.id === id)

  const chegamHoje = bookings.filter((b: any) => b.check_in === hoje && b.status === 'confirmed')
  const saemHoje = bookings.filter((b: any) => b.check_out === hoje)
  const hospedados = bookings.filter((b: any) =>
    b.check_in < hoje && b.check_out > hoje && b.status === 'checked_in'
  )
  const jaEntraram = bookings.filter((b: any) => b.check_in === hoje && b.status === 'checked_in')
  const chegamAmanha = bookings.filter((b: any) => b.check_in === amanha)

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

  const dataExtenso = new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const card = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '16px 18px',
    marginBottom: '12px',
  }

  const Secao = ({ titulo, icone: Icone, cor, itens, vazio, children }: any) => (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
          backgroundColor: `color-mix(in srgb, ${cor} 14%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icone size={17} color={cor} />
        </div>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700, flex: 1 }}>{titulo}</h2>
        <span style={{
          backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '999px',
          padding: '2px 11px', color: itens.length ? cor : 'var(--muted)',
          fontSize: '13px', fontWeight: 700,
        }}>
          {itens.length}
        </span>
      </div>
      {itens.length === 0
        ? <p style={{ color: 'var(--muted)', fontSize: '14px', padding: '4px 2px 0' }}>{vazio}</p>
        : children}
    </section>
  )

  const Reserva = ({ b, acao }: any) => {
    const p = cabana(b.property_id)
    const restante = Number(b.total_amount || 0) - Number(b.deposit_amount || 0)
    return (
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: 'var(--text)', fontSize: '17px', fontWeight: 700, lineHeight: 1.25 }}>
              {b.guest_name}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginTop: '3px' }}>
              {nomeCabana(b.property_id)} · {b.guests_count} pessoa{b.guests_count !== 1 ? 's' : ''}
            </p>
          </div>
          {b.is_courtesy && (
            <span style={{
              fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
              color: 'var(--violet-mid)', backgroundColor: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.3)', borderRadius: '6px', padding: '2px 8px',
            }}>
              🎁 Cortesia
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '12px', fontSize: '13px' }}>
          <span style={{ color: 'var(--muted)' }}>
            Entra <strong style={{ color: 'var(--text)' }}>{formatDate(b.check_in)}</strong>
            {p?.checkin_time && ` às ${String(p.checkin_time).slice(0, 5)}`}
          </span>
          <span style={{ color: 'var(--muted)' }}>
            Sai <strong style={{ color: 'var(--text)' }}>{formatDate(b.check_out)}</strong>
            {p?.checkout_time && ` até ${String(p.checkout_time).slice(0, 5)}`}
          </span>
        </div>

        {!b.is_courtesy && restante > 0 && (
          <p style={{
            marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
            backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
            color: 'var(--warning)', fontSize: '13px', fontWeight: 600,
          }}>
            Receber na chegada: {formatCurrency(restante)}
          </p>
        )}

        {b.notes && (
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '10px', lineHeight: 1.45 }}>
            📝 {b.notes}
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          {acao}
          {temTelefone(b.guest_phone) && (
            <button
              onClick={() => whatsapp(b.guest_phone)}
              style={{
                flex: '0 0 auto', padding: '10px 14px', borderRadius: '9px',
                border: '1px solid rgba(37,211,102,0.35)', backgroundColor: 'rgba(37,211,102,0.1)',
                color: 'var(--whatsapp)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <MessageCircle size={15} /> WhatsApp
            </button>
          )}
          <Link
            href={`/dashboard/reservas/${b.id}`}
            style={{
              flex: '0 0 auto', padding: '10px 14px', borderRadius: '9px',
              border: '1px solid var(--border)', backgroundColor: 'transparent',
              color: 'var(--muted)', fontWeight: 600, fontSize: '14px',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            Detalhes <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  const botaoAcao = (b: any, texto: string, novoStatus: string, cor: string) => (
    <button
      onClick={() => marcar(b, novoStatus)}
      disabled={processando === b.id}
      style={{
        flex: '1 1 150px', padding: '11px 16px', borderRadius: '9px', border: 'none',
        backgroundColor: cor, color: '#fff', fontWeight: 700, fontSize: '14px',
        cursor: processando === b.id ? 'not-allowed' : 'pointer',
        opacity: processando === b.id ? 0.6 : 1,
      }}
    >
      {processando === b.id ? 'Salvando...' : texto}
    </button>
  )

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>
        Hoje
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px', textTransform: 'capitalize' }}>
        {dataExtenso}
      </p>

      {erro && (
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '13px 16px', marginBottom: '18px',
        }}>
          <p style={{ color: 'var(--danger)', fontSize: '14px', margin: 0, fontWeight: 500 }}>{erro}</p>
        </div>
      )}

      <Secao
        titulo="Chegam hoje" icone={LogIn} cor="var(--success-strong)"
        itens={chegamHoje} vazio="Nenhuma chegada para hoje."
      >
        {chegamHoje.map((b: any) => (
          <Reserva key={b.id} b={b} acao={botaoAcao(b, '✅ Fazer check-in', 'checked_in', 'var(--success-strong)')} />
        ))}
      </Secao>

      <Secao
        titulo="Saem hoje" icone={LogOut} cor="var(--info-strong)"
        itens={saemHoje} vazio="Ninguém sai hoje."
      >
        {saemHoje.map((b: any) => (
          <Reserva key={b.id} b={b} acao={botaoAcao(b, '🧹 Finalizar estadia', 'completed', 'var(--info-strong)')} />
        ))}
      </Secao>

      <Secao
        titulo="Na cabana agora" icone={BedDouble} cor="var(--purple)"
        itens={[...jaEntraram, ...hospedados]} vazio="Nenhuma cabana ocupada no momento."
      >
        {[...jaEntraram, ...hospedados].map((b: any) => (
          <Reserva key={b.id} b={b} acao={null} />
        ))}
      </Secao>

      <Secao
        titulo="Chegam amanhã" icone={CalendarClock} cor="var(--warning)"
        itens={chegamAmanha} vazio="Nenhuma chegada para amanhã."
      >
        {chegamAmanha.map((b: any) => (
          <Reserva key={b.id} b={b} acao={null} />
        ))}
      </Secao>
    </div>
  )
}
