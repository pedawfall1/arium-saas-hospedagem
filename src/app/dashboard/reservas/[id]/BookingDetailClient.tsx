"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toZonedTime, format as formatTz } from "date-fns-tz"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useConfirm } from "@/components/ConfirmModal"
import { ManualConfirmModal } from "@/components/ManualConfirmModal"
import { HoldNotice } from "@/components/ui/HoldCountdown"
import { HOLD_HOURS } from "@/lib/hold"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { parseMoney } from "@/lib/money"
import { executar } from "@/lib/salvar"
import { BOOKING_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS, bookingStatusLabel, paymentStatusLabel } from "@/lib/statuses"

const cardStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '20px 24px',
  marginBottom: '16px',
}

const labelStyle = {
  color: 'var(--muted)',
  fontSize: '13px',
  marginBottom: '4px',
}

const valueStyle = {
  color: 'var(--text)',
  fontSize: '15px',
  fontWeight: 500,
}

const editInputStyle = {
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: 'var(--text)',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

export function BookingDetailClient({ booking, tenantName, userEmail, whatsappConnected, tenantId, payments = [] }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(booking.notes || "")
  const [notesSaving, setNotesSaving] = useState(false)
  const [status, setStatus] = useState(booking.status)
  const [paymentStatus, setPaymentStatus] = useState(booking.payment_status)
  const { ConfirmModal, confirm } = useConfirm()

  const [isEditingDates, setIsEditingDates] = useState(false)
  const [newCheckIn, setNewCheckIn] = useState(booking.check_in)
  const [newCheckOut, setNewCheckOut] = useState(booking.check_out)
  const [newTotalAmount, setNewTotalAmount] = useState(booking.total_amount)
  const [loadingDates, setLoadingDates] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    setNewCheckIn(booking.check_in)
    setNewCheckOut(booking.check_out)
    setNewTotalAmount(booking.total_amount)
  }, [booking.check_in, booking.check_out, booking.total_amount])

  // Depois de um router.refresh() o servidor manda os valores atuais; sem
  // ressincronizar, a tela continuava exibindo o que foi carregado na abertura.
  useEffect(() => {
    setStatus(booking.status)
    setPaymentStatus(booking.payment_status)
  }, [booking.status, booking.payment_status])

  useEffect(() => {
    setNotes(booking.notes || "")
  }, [booking.notes])

  const [isTotalFocused, setIsTotalFocused] = useState(false)

  const formatCurrencyLocal = (val: string | number) => {
    if (val === "" || val === null || val === undefined) return ""
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  const [isEditingValues, setIsEditingValues] = useState(false)
  const [editTotal, setEditTotal] = useState(String(booking.total_amount ?? 0))
  const [editDeposit, setEditDeposit] = useState(String(booking.deposit_amount ?? 0))

  // Sem isto os campos ficam com o valor do primeiro carregamento e um "Salvar"
  // posterior gravaria de volta um número velho por cima do atual.
  useEffect(() => {
    setEditTotal(String(booking.total_amount ?? 0))
    setEditDeposit(String(booking.deposit_amount ?? 0))
  }, [booking.total_amount, booking.deposit_amount])

  const formatCpf = (val: string) => {
    const digits = String(val || '').replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const [isEditingGuest, setIsEditingGuest] = useState(false)
  const [editGuest, setEditGuest] = useState({
    guest_name: booking.guest_name || "",
    guest_phone: booking.guest_phone || "",
    guest_cpf: booking.guest_cpf || "",
    guest_email: booking.guest_email || "",
    guest_city: booking.guest_city || "",
    guests_count: booking.guests_count || 1,
  })

  const handleUpdateGuest = async () => {
    setLoading(true)
    try {
      if (!editGuest.guest_name.trim()) {
        throw new Error("O nome do hóspede é obrigatório.")
      }
      const { error } = await supabase
        .from('bookings')
        .update({
          guest_name: editGuest.guest_name.trim(),
          guest_phone: editGuest.guest_phone.trim(),
          guest_cpf: editGuest.guest_cpf.trim() || null,
          guest_email: editGuest.guest_email.trim() || null,
          guest_city: editGuest.guest_city.trim() || null,
          guests_count: Math.max(1, Number(editGuest.guests_count) || 1),
        })
        .eq('id', booking.id)

      if (error) throw error

      setIsEditingGuest(false)
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar dados do hóspede.")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateValues = async () => {
    setActionMsg(null)
    // Valida antes de gravar: sem isto um campo ilegível virava 0 silenciosamente.
    const total = parseMoney(editTotal)
    const sinal = parseMoney(editDeposit)
    if (isNaN(total) || total < 0) {
      setActionMsg({ text: 'Valor total inválido. Use por exemplo 2000 ou 2.000,00.', type: 'err' })
      return
    }
    if (isNaN(sinal) || sinal < 0) {
      setActionMsg({ text: 'Valor do sinal inválido. Use por exemplo 500 ou 500,00.', type: 'err' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ total_amount: total, deposit_amount: sinal })
        .eq('id', booking.id)

      if (error) throw error

      setIsEditingValues(false)
      setActionMsg({ text: `Valores atualizados: total ${formatCurrency(total)}.`, type: 'ok' })
      router.refresh()
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Erro ao atualizar valores.', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  // --- Confirmação manual de pagamento (Pix direto, transferência etc.) ---
  const [showManualConfirm, setShowManualConfirm] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ text: string, type: 'ok' | 'warn' | 'err' } | null>(null)

  const guestPhoneDigits = String(booking.guest_phone || '').replace(/\D/g, '')
  const hasUsablePhone = guestPhoneDigits.length >= 10 && guestPhoneDigits !== '00000000000'
  const canNotify = hasUsablePhone && whatsappConnected

  const notifyDisabledReason = !hasUsablePhone
    ? 'Esta reserva não tem um telefone válido cadastrado.'
    : 'O WhatsApp não está conectado no painel (menu WhatsApp).'

  const handleManualConfirm = async (notify: boolean) => {
    setManualLoading(true)
    setActionMsg(null)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'deposit_paid',
          confirmed_by: userEmail || null,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', booking.id)

      if (error) throw error

      setStatus('confirmed')
      setPaymentStatus('deposit_paid')

      // A reserva já está confirmada no banco. Se o aviso falhar, isso não
      // desfaz a confirmação — apenas avisamos a dona para mandar na mão.
      if (notify) {
        try {
          const res = await fetch('/api/whatsapp/notify-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: booking.id }),
          })
          const payload = await res.json().catch(() => ({}))
          if (!res.ok) {
            setActionMsg({
              text: `Reserva confirmada, mas o WhatsApp não foi enviado: ${payload.error || 'erro desconhecido'}. Avise o hóspede manualmente.`,
              type: 'warn',
            })
          } else {
            setActionMsg({ text: 'Reserva confirmada e hóspede avisado no WhatsApp.', type: 'ok' })
          }
        } catch (err: any) {
          setActionMsg({
            text: `Reserva confirmada, mas o WhatsApp não foi enviado: ${err.message}. Avise o hóspede manualmente.`,
            type: 'warn',
          })
        }
      } else {
        setActionMsg({ text: 'Reserva confirmada. As datas agora estão bloqueadas definitivamente.', type: 'ok' })
      }

      setShowManualConfirm(false)
      router.refresh()
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Erro ao confirmar a reserva.', type: 'err' })
    } finally {
      setManualLoading(false)
    }
  }

  const handleExtendHold = async () => {
    if (!(await confirm(
      `Estender por mais ${HOLD_HOURS}h`,
      'A reserva vai continuar segurando as datas por mais 24 horas a partir de agora.'
    ))) return

    setLoading(true)
    setActionMsg(null)
    try {
      const newExpiry = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000).toISOString()
      const { error } = await supabase
        .from('bookings')
        .update({ hold_expires_at: newExpiry })
        .eq('id', booking.id)

      if (error) throw error
      setActionMsg({ text: 'Prazo estendido por mais 24 horas.', type: 'ok' })
      router.refresh()
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Erro ao estender o prazo.', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  // --- Recebimentos, cortesia e "ainda não recebido" ---
  const [isCourtesy, setIsCourtesy] = useState(!!booking.is_courtesy)
  const [awaiting, setAwaiting] = useState(!!booking.awaiting_settlement)
  const [novoPg, setNovoPg] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'Pix', note: '' })
  const [pgFocused, setPgFocused] = useState(false)

  const totalRecebido = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const saldoAberto = Math.max(0, Number(booking.total_amount || 0) - totalRecebido)

  const marcarFlag = async (campo: 'is_courtesy' | 'awaiting_settlement', valor: boolean) => {
    setLoading(true)
    setActionMsg(null)
    const anterior = campo === 'is_courtesy' ? isCourtesy : awaiting
    if (campo === 'is_courtesy') setIsCourtesy(valor)
    else setAwaiting(valor)

    const { error } = await supabase.from('bookings').update({ [campo]: valor }).eq('id', booking.id)
    setLoading(false)
    if (error) {
      // Reverte o botão se o banco recusou, para a tela não mentir.
      if (campo === 'is_courtesy') setIsCourtesy(anterior)
      else setAwaiting(anterior)
      setActionMsg({ text: error.message, type: 'err' })
      return
    }
    router.refresh()
  }

  const adicionarRecebimento = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseMoney(novoPg.amount)
    if (isNaN(valor) || valor <= 0) {
      setActionMsg({ text: 'Informe um valor maior que zero (ex: 2000 ou 2.000,00).', type: 'err' })
      return
    }
    setLoading(true)
    const { error } = await supabase.from('booking_payments').insert([{
      tenant_id: tenantId,
      booking_id: booking.id,
      amount: valor,
      date: novoPg.date,
      method: novoPg.method || null,
      note: novoPg.note.trim() || null,
    }])
    setLoading(false)
    if (error) { setActionMsg({ text: error.message, type: 'err' }); return }

    // Registrou dinheiro entrando: a reserva deixa de estar "não recebida".
    if (awaiting) {
      await supabase.from('bookings').update({ awaiting_settlement: false }).eq('id', booking.id)
      setAwaiting(false)
    }
    setNovoPg({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'Pix', note: '' })
    setActionMsg({ text: 'Recebimento registrado.', type: 'ok' })
    router.refresh()
  }

  /** Alinha o valor da reserva ao que foi de fato recebido. */
  const ajustarTotalPeloRecebido = async () => {
    setLoading(true)
    setActionMsg(null)
    const { error } = await supabase
      .from('bookings')
      .update({ total_amount: totalRecebido, deposit_amount: totalRecebido })
      .eq('id', booking.id)
    setLoading(false)
    if (error) { setActionMsg({ text: error.message, type: 'err' }); return }
    setActionMsg({ text: `Valor total corrigido para ${formatCurrency(totalRecebido)}.`, type: 'ok' })
    router.refresh()
  }

  const apagarRecebimento = async (p: any) => {
    if (!(await confirm('Apagar recebimento?', `${formatCurrency(Number(p.amount))} de ${formatDate(p.date)}.`))) return
    setLoading(true)
    const r = await executar(supabase.from('booking_payments').delete().eq('id', p.id))
    setLoading(false)
    if (!r.ok) { setActionMsg({ text: r.erro, type: 'err' }); return }
    router.refresh()
  }

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingDates(true)
    setErrorMsg("")

    try {
      if (!newCheckIn || !newCheckOut) {
        throw new Error("Por favor, preencha as datas de check-in e check-out.")
      }

      if (new Date(newCheckIn) >= new Date(newCheckOut)) {
        throw new Error("A data de check-out deve ser posterior à data de check-in.")
      }

      const total = parseMoney(newTotalAmount)
      if (isNaN(total) || total < 0) {
        throw new Error("Preço total inválido. Use por exemplo 2000 ou 2.000,00.")
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          check_in: newCheckIn,
          check_out: newCheckOut,
          total_amount: total
        })
        .eq('id', booking.id)

      if (error) throw error

      setIsEditingDates(false)
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao transferir reserva.")
    } finally {
      setLoadingDates(false)
    }
  }

  const handleDelete = async () => {
    if (!(await confirm(
      'Cancelar esta reserva?',
      'A reserva vai para a aba de Excluídas e as datas ficam livres no site imediatamente. Os dados de contato são mantidos.'
    ))) return
    setLoading(true)
    setActionMsg(null)
    const r = await executar(supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id))
    if (!r.ok) {
      setLoading(false)
      setActionMsg({ text: r.erro, type: 'err' })
      return
    }
    // Reservas manuais também gravam bloqueios em blocked_dates: sem remover
    // estes, as datas continuariam presas mesmo com a reserva cancelada.
    const rb = await executar(supabase.from('blocked_dates').delete().eq('booking_id', booking.id))
    if (!rb.ok) {
      setLoading(false)
      setActionMsg({
        text: `Reserva cancelada, mas as datas não foram liberadas: ${rb.erro} Libere pelo Calendário.`,
        type: 'warn',
      })
      return
    }
    router.push('/dashboard/reservas')
  }

  const handleRestore = async () => {
    if (!(await confirm('Restaurar Reserva', 'Deseja restaurar esta reserva?'))) return
    setLoading(true)
    const isPaid = booking.payment_status === 'deposit_paid' || booking.payment_status === 'fully_paid'
    const newStatus = isPaid ? 'confirmed' : 'pending'
    
    const r = await executar(supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id))
    setLoading(false)
    if (!r.ok) { setActionMsg({ text: r.erro, type: 'err' }); return }
    setStatus(newStatus)
    router.refresh()
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    setActionMsg(null)
    const r = await executar(supabase.from('bookings').update({ notes }).eq('id', booking.id))
    setNotesSaving(false)
    if (!r.ok) { setActionMsg({ text: r.erro, type: 'err' }); return }
    setActionMsg({ text: 'Observações salvas.', type: 'ok' })
    router.refresh()
  }

  const updateStatus = async (newStatus: string) => {
    const anterior = status
    setLoading(true)
    setActionMsg(null)
    setStatus(newStatus)

    const r = await executar(supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id))
    setLoading(false)
    if (!r.ok) {
      // Volta o seletor: sem isto a tela mostrava um status que o banco recusou.
      setStatus(anterior)
      setActionMsg({ text: r.erro, type: 'err' })
      return
    }
    router.refresh()
  }

  const updatePaymentStatus = async (newStatus: string) => {
    const anterior = paymentStatus
    setLoading(true)
    setActionMsg(null)
    setPaymentStatus(newStatus)

    const r = await executar(supabase.from('bookings').update({ payment_status: newStatus }).eq('id', booking.id))
    setLoading(false)
    if (!r.ok) {
      setPaymentStatus(anterior)
      setActionMsg({ text: r.erro, type: 'err' })
      return
    }
    router.refresh()
  }

  const handleWhatsApp = () => {
    const phone = booking.guest_phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  // Estadia encerrada => o restante já foi recebido (mesma regra dos relatórios).
  const estadiaTerminou =
    booking.check_out <= new Date().toISOString().slice(0, 10) &&
    ['confirmed', 'checked_in', 'completed'].includes(status)

  const checkIn = new Date(booking.check_in)
  const checkOut = new Date(booking.check_out)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  // Texto via variável de tema (escurece no tema claro); fundo como rgba fixo,
  // porque o truque `${hex}20` de opacidade não funciona com var().
  const statusColors: Record<string, { fg: string, bg: string }> = {
    pending:    { fg: 'var(--warning)',        bg: 'rgba(245,158,11,0.13)' },
    confirmed:  { fg: 'var(--success-strong)', bg: 'rgba(34,197,94,0.13)' },
    checked_in: { fg: 'var(--info-strong)',    bg: 'rgba(59,130,246,0.13)' },
    completed:  { fg: 'var(--neutral-soft)',   bg: 'rgba(107,114,128,0.13)' },
    cancelled:  { fg: 'var(--danger-strong)',  bg: 'rgba(239,68,68,0.13)' },
  }

  const paymentStatusColors: Record<string, { fg: string, bg: string }> = {
    awaiting_deposit: { fg: 'var(--warning)',        bg: 'rgba(245,158,11,0.13)' },
    deposit_paid:     { fg: 'var(--success-strong)', bg: 'rgba(34,197,94,0.13)' },
    fully_paid:       { fg: 'var(--info-strong)',    bg: 'rgba(59,130,246,0.13)' },
    refunded:         { fg: 'var(--neutral-soft)',   bg: 'rgba(148,163,184,0.13)' },
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <ConfirmModal />
      <ManualConfirmModal
        isOpen={showManualConfirm}
        booking={booking}
        canNotify={canNotify}
        notifyDisabledReason={notifyDisabledReason}
        loading={manualLoading}
        onConfirm={handleManualConfirm}
        onCancel={() => setShowManualConfirm(false)}
      />
      {/* Back link */}
      <Link
        href="/dashboard/reservas"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--muted)',
          fontSize: '14px',
          textDecoration: 'none',
          marginBottom: '24px',
        }}
      >
        <ArrowLeft size={16} /> Voltar para Reservas
      </Link>

      {/* Header card */}
      <div style={cardStyle}>
        <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
          {booking.guest_name}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {booking.properties?.name} · {formatDate(booking.check_in)} → {formatDate(booking.check_out)} · {nights} noites
        </p>
      </div>

      {/* Aviso da trava de 24h (só reservas pendentes) */}
      <HoldNotice booking={{ ...booking, status }} />

      {/* Resultado da última ação */}
      {actionMsg && (
        <div style={{
          backgroundColor: actionMsg.type === 'ok' ? 'rgba(34,197,94,0.1)' : actionMsg.type === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${actionMsg.type === 'ok' ? 'rgba(34,197,94,0.3)' : actionMsg.type === 'warn' ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <p style={{
            color: actionMsg.type === 'ok' ? 'var(--success)' : actionMsg.type === 'warn' ? 'var(--warning)' : 'var(--danger)',
            fontSize: '14px', margin: 0, fontWeight: 500, lineHeight: 1.5, flex: 1,
          }}>
            {actionMsg.text}
          </p>
          <button
            onClick={() => setActionMsg(null)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Ações da reserva pendente */}
      {status === 'pending' && (
        <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowManualConfirm(true)}
            disabled={loading || manualLoading}
            style={{
              flex: '1 1 240px',
              padding: '12px 16px',
              backgroundColor: '#22c55e',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: (loading || manualLoading) ? 'not-allowed' : 'pointer',
              opacity: (loading || manualLoading) ? 0.7 : 1,
            }}
          >
            ✅ Confirmar pagamento manualmente
          </button>
          <button
            onClick={handleExtendHold}
            disabled={loading || manualLoading}
            style={{
              flex: '1 1 160px',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: (loading || manualLoading) ? 'not-allowed' : 'pointer',
              opacity: (loading || manualLoading) ? 0.7 : 1,
            }}
          >
            ⏱️ Estender +{HOLD_HOURS}h
          </button>
        </div>
      )}

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Left card - Guest details */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
              Detalhes do Hóspede
            </h2>
            {!isEditingGuest ? (
              <button
                onClick={() => {
                  setEditGuest({
                    guest_name: booking.guest_name || "",
                    guest_phone: booking.guest_phone || "",
                    guest_cpf: booking.guest_cpf || "",
                    guest_email: booking.guest_email || "",
                    guest_city: booking.guest_city || "",
                    guests_count: booking.guests_count || 1,
                  })
                  setIsEditingGuest(true)
                }}
                style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                ✏️ Editar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setIsEditingGuest(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleUpdateGuest} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>

          {isEditingGuest ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  type="text"
                  value={editGuest.guest_name}
                  onChange={(e) => setEditGuest({ ...editGuest, guest_name: e.target.value })}
                  style={editInputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={editGuest.guest_phone}
                  onChange={(e) => setEditGuest({ ...editGuest, guest_phone: e.target.value })}
                  style={editInputStyle}
                  placeholder="(XX) XXXXX-XXXX"
                />
              </div>
              <div>
                <label style={labelStyle}>CPF</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editGuest.guest_cpf}
                  onChange={(e) => setEditGuest({ ...editGuest, guest_cpf: formatCpf(e.target.value) })}
                  style={editInputStyle}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  value={editGuest.guest_email}
                  onChange={(e) => setEditGuest({ ...editGuest, guest_email: e.target.value })}
                  style={editInputStyle}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Cidade</label>
                <input
                  type="text"
                  value={editGuest.guest_city}
                  onChange={(e) => setEditGuest({ ...editGuest, guest_city: e.target.value })}
                  style={editInputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Número de hóspedes</label>
                <input
                  type="number"
                  min="1"
                  value={editGuest.guests_count}
                  onChange={(e) => setEditGuest({ ...editGuest, guests_count: Number(e.target.value) })}
                  style={editInputStyle}
                />
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '12px' }}>
                <p style={labelStyle}>Nome</p>
                <p style={valueStyle}>{booking.guest_name}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={labelStyle}>Telefone</p>
                <a
                  href="#"
                  onClick={handleWhatsApp}
                  style={{ color: 'var(--purple)', fontSize: '15px', fontWeight: 500, textDecoration: 'none' }}
                >
                  {booking.guest_phone}
                </a>
              </div>
              {booking.guest_cpf && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={labelStyle}>CPF</p>
                  <p style={valueStyle}>{booking.guest_cpf}</p>
                </div>
              )}
              {booking.guest_email && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={labelStyle}>E-mail</p>
                  <p style={valueStyle}>{booking.guest_email}</p>
                </div>
              )}
              {booking.guest_city && (
                <div>
                  <p style={labelStyle}>Cidade</p>
                  <p style={valueStyle}>{booking.guest_city}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right card - Stay details */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
              Detalhes da Estadia
            </h2>
            {!isEditingDates && (
              <button
                onClick={() => {
                  setNewCheckIn(booking.check_in)
                  setNewCheckOut(booking.check_out)
                  setNewTotalAmount(booking.total_amount)
                  setIsEditingDates(true)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--purple)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                🔄 Transferir datas
              </button>
            )}
          </div>

          {isEditingDates ? (
            <form onSubmit={handleReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Novo Check-in</label>
                <input
                  type="date"
                  required
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Novo Check-out</label>
                <input
                  type="date"
                  required
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Novo Preço Total (R$)</label>
                <MoneyInput
                  value={String(newTotalAmount ?? '')}
                  onChange={setNewTotalAmount}
                  style={editInputStyle}
                />
              </div>
              {errorMsg && (
                <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0, fontWeight: 500 }}>{errorMsg}</p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={loadingDates}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    backgroundColor: 'var(--purple)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: loadingDates ? 0.7 : 1,
                  }}
                >
                  {loadingDates ? 'Salvando...' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingDates(false)
                    setErrorMsg("")
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ marginBottom: '12px' }}>
                <p style={labelStyle}>Check-in</p>
                <p style={valueStyle}>{formatDate(booking.check_in)}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={labelStyle}>Check-out</p>
                <p style={valueStyle}>{formatDate(booking.check_out)}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={labelStyle}>Data da Reserva</p>
                <p style={valueStyle}>{formatTz(toZonedTime(new Date(booking.created_at), 'America/Sao_Paulo'), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR, timeZone: 'America/Sao_Paulo' })}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={labelStyle}>Hóspedes</p>
                <p style={valueStyle}>{booking.guests_count} pessoa{booking.guests_count !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p style={labelStyle}>Cabana</p>
                <p style={valueStyle}>{booking.properties?.name}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Values card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>
            Valores
          </h2>
          {!isEditingValues ? (
            <button
              onClick={() => setIsEditingValues(true)}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              Editar valores
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setIsEditingValues(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleUpdateValues} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {!isEditingValues ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Total</span>
              <span style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>
                {formatCurrency(booking.total_amount)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Sinal</span>
              <span style={{ color: 'var(--success-strong)', fontSize: '15px', fontWeight: 600 }}>
                {formatCurrency(booking.deposit_amount)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>
                {estadiaTerminou ? 'Recebido na saída' : 'Restante no check-in'}
              </span>
              <span style={{ color: estadiaTerminou ? 'var(--success)' : 'var(--muted)', fontSize: '15px', fontWeight: estadiaTerminou ? 600 : 400 }}>
                {formatCurrency(booking.total_amount - booking.deposit_amount)}
              </span>
            </div>

            {/* Espelha o card Recebimentos, senão os dois blocos se contradizem */}
            {payments.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)', fontSize: '14px' }}>
                  Recebido de fato ({payments.length} lançamento{payments.length !== 1 ? 's' : ''})
                </span>
                <span style={{ color: 'var(--success)', fontSize: '15px', fontWeight: 700 }}>
                  {formatCurrency(totalRecebido)}
                </span>
              </div>
            )}

            {/* Recebeu mais do que o valor cadastrado: quase sempre o total está desatualizado */}
            {totalRecebido > Number(booking.total_amount || 0) && (
              <div style={{
                marginTop: '14px', padding: '12px 14px', borderRadius: '10px',
                backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
              }}>
                <p style={{ color: 'var(--warning)', fontSize: '13px', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                  Você já recebeu {formatCurrency(totalRecebido)}, mas o valor total desta reserva está
                  em {formatCurrency(Number(booking.total_amount || 0))}.
                </p>
                <button
                  onClick={ajustarTotalPeloRecebido}
                  disabled={loading}
                  style={{
                    marginTop: '10px', padding: '8px 14px', borderRadius: '8px',
                    border: '1px solid rgba(245,158,11,0.5)', backgroundColor: 'transparent',
                    color: 'var(--warning)', fontWeight: 600, fontSize: '13px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Corrigir total para {formatCurrency(totalRecebido)}
                </button>
              </div>
            )}

            {estadiaTerminou && payments.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '10px', lineHeight: 1.5 }}>
                A estadia terminou em {formatDate(booking.check_out)}, então o valor cheio de{' '}
                <strong>{formatCurrency(booking.total_amount)}</strong> já conta como faturamento nos relatórios.
              </p>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Valor Total (R$)</label>
              <MoneyInput value={editTotal} onChange={setEditTotal} disabled={loading} style={editInputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valor do Sinal (R$)</label>
              <MoneyInput value={editDeposit} onChange={setEditDeposit} disabled={loading} style={editInputStyle} />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>
              Pode digitar do jeito que preferir: 2000, 2.000 ou 2.000,00.
            </p>
          </div>
        )}
      </div>

      {/* Recebimentos */}
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
          Recebimentos
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.5 }}>
          Registre aqui o dinheiro que realmente entrou. Enquanto houver lançamento, o relatório usa
          estes valores em vez de deduzir pela data.
        </p>

        {/* Marcadores */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <button
            onClick={() => marcarFlag('is_courtesy', !isCourtesy)}
            disabled={loading}
            title="Diária cedida para influencer ou permuta — não entra no faturamento nem no ticket médio"
            style={{
              padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${isCourtesy ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`,
              backgroundColor: isCourtesy ? 'rgba(168,85,247,0.12)' : 'transparent',
              color: isCourtesy ? 'var(--violet-mid)' : 'var(--muted)',
            }}
          >
            🎁 Cortesia / permuta {isCourtesy ? '✓' : ''}
          </button>
          <button
            onClick={() => marcarFlag('awaiting_settlement', !awaiting)}
            disabled={loading || isCourtesy}
            title="A estadia aconteceu mas o dinheiro ainda não entrou — segura o valor em 'A receber'"
            style={{
              padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
              cursor: isCourtesy ? 'not-allowed' : 'pointer',
              border: `1px solid ${awaiting ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
              backgroundColor: awaiting ? 'rgba(245,158,11,0.12)' : 'transparent',
              color: awaiting ? 'var(--warning)' : 'var(--muted)',
              opacity: isCourtesy ? 0.4 : 1,
            }}
          >
            ⏳ Ainda não recebi {awaiting ? '✓' : ''}
          </button>
        </div>

        {isCourtesy ? (
          <p style={{ color: 'var(--violet-mid)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            Esta é uma diária cedida. Ela não entra no faturamento nem puxa o ticket médio para baixo,
            e aparece no relatório como cortesia.
          </p>
        ) : (
          <>
            {/* Saldo */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: '1 1 150px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>Já recebido</p>
                <p style={{ color: 'var(--success)', fontSize: '18px', fontWeight: 700 }}>{formatCurrency(totalRecebido)}</p>
              </div>
              <div style={{ flex: '1 1 150px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>Em aberto</p>
                <p style={{ color: saldoAberto > 0 ? 'var(--warning)' : 'var(--muted)', fontSize: '18px', fontWeight: 700 }}>
                  {formatCurrency(saldoAberto)}
                </p>
              </div>
            </div>

            {/* Lista */}
            {payments.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {payments.map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '15px', minWidth: '100px' }}>
                      {formatCurrency(Number(p.amount))}
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{formatDate(p.date)}</span>
                    {p.method && <span style={{ color: 'var(--muted)', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 7px' }}>{p.method}</span>}
                    {p.note && <span style={{ color: 'var(--muted)', fontSize: '12px', flex: 1 }}>{p.note}</span>}
                    <button onClick={() => apagarRecebimento(p)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}>
                      remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Novo recebimento */}
            <form onSubmit={adicionarRecebimento} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Valor</label>
                <MoneyInput
                  value={novoPg.amount}
                  onChange={v => setNovoPg({ ...novoPg, amount: v })}
                  style={editInputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Data</label>
                <input type="date" value={novoPg.date} onChange={e => setNovoPg({ ...novoPg, date: e.target.value })} style={editInputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Forma</label>
                <select value={novoPg.method} onChange={e => setNovoPg({ ...novoPg, method: e.target.value })} style={editInputStyle}>
                  {['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Mercado Pago', 'Outro'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Observação</label>
                <input type="text" value={novoPg.note} onChange={e => setNovoPg({ ...novoPg, note: e.target.value })} placeholder="opcional" style={editInputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{
                padding: '10px 16px', backgroundColor: 'var(--purple)', border: 'none', borderRadius: '8px',
                color: '#fff', fontWeight: 600, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>
                + Registrar
              </button>
            </form>
          </>
        )}
      </div>

      {/* Status card */}
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Status
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={labelStyle}>Status Geral</p>
            <select
              value={status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              {BOOKING_STATUS_OPTIONS.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <p style={labelStyle}>Pagamento</p>
            <select
              value={paymentStatus}
              onChange={(e) => updatePaymentStatus(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              {PAYMENT_STATUS_OPTIONS.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: statusColors[status]?.bg,
            color: statusColors[status]?.fg,
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            {bookingStatusLabel(status)}
          </div>
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: paymentStatusColors[paymentStatus]?.bg,
            color: paymentStatusColors[paymentStatus]?.fg,
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            {paymentStatusLabel(paymentStatus)}
          </div>
        </div>

        {booking.confirmed_at && (
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '14px', lineHeight: 1.5 }}>
            ✍️ Pagamento confirmado manualmente por <strong>{booking.confirmed_by || 'usuário desconhecido'}</strong>{' '}
            em {formatTz(toZonedTime(new Date(booking.confirmed_at), 'America/Sao_Paulo'), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR, timeZone: 'America/Sao_Paulo' })}.
          </p>
        )}
      </div>

      {/* Notes card */}
      <div style={cardStyle}>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Observações
        </h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Adicione observações internas sobre a reserva..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '14px',
            resize: 'vertical',
            marginBottom: '12px',
          }}
        />
        <button
          onClick={saveNotes}
          disabled={notesSaving}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--purple)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
            cursor: notesSaving ? 'not-allowed' : 'pointer',
            opacity: notesSaving ? 0.6 : 1,
          }}
        >
          {notesSaving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {/* Actions */}
      {status !== 'cancelled' ? (
        <button
          onClick={handleDelete}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            color: 'var(--danger)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '12px',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Processando...' : '🗑️ Mover para Excluídas'}
        </button>
      ) : (
        <button
          onClick={handleRestore}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--text)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '12px',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Restaurando...' : '↩️ Restaurar Reserva'}
        </button>
      )}
    </div>
  )
}
