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

export function BookingDetailClient({ booking, tenantName, userEmail, whatsappConnected }: any) {
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

  const [isTotalFocused, setIsTotalFocused] = useState(false)

  const formatCurrencyLocal = (val: string | number) => {
    if (val === "" || val === null || val === undefined) return ""
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  const [isEditingValues, setIsEditingValues] = useState(false)
  const [editTotal, setEditTotal] = useState(booking.total_amount || 0)
  const [editDeposit, setEditDeposit] = useState(booking.deposit_amount || 0)
  const [isEditTotalFocused, setIsEditTotalFocused] = useState(false)
  const [isEditDepositFocused, setIsEditDepositFocused] = useState(false)

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
    setLoading(true)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          total_amount: Number(editTotal),
          deposit_amount: Number(editDeposit)
        })
        .eq('id', booking.id)

      if (error) throw error

      setIsEditingValues(false)
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar valores.")
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

      const { error } = await supabase
        .from('bookings')
        .update({
          check_in: newCheckIn,
          check_out: newCheckOut,
          total_amount: Number(newTotalAmount)
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
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
    // Reservas manuais também gravam bloqueios em blocked_dates: sem remover
    // estes, as datas continuariam presas mesmo com a reserva cancelada.
    await supabase.from('blocked_dates').delete().eq('booking_id', booking.id)
    router.push('/dashboard/reservas')
  }

  const handleRestore = async () => {
    if (!(await confirm('Restaurar Reserva', 'Deseja restaurar esta reserva?'))) return
    setLoading(true)
    const isPaid = booking.payment_status === 'deposit_paid' || booking.payment_status === 'fully_paid'
    const newStatus = isPaid ? 'confirmed' : 'pending'
    
    await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)
    setStatus(newStatus)
    setLoading(false)
    router.refresh()
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    await supabase.from('bookings').update({ notes }).eq('id', booking.id)
    setNotesSaving(false)
    router.refresh()
  }

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)
    setStatus(newStatus)
    setLoading(false)
    router.refresh()
  }

  const updatePaymentStatus = async (newStatus: string) => {
    setLoading(true)
    await supabase.from('bookings').update({ payment_status: newStatus }).eq('id', booking.id)
    setPaymentStatus(newStatus)
    setLoading(false)
    router.refresh()
  }

  const handleWhatsApp = () => {
    const phone = booking.guest_phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

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
    pending:      { fg: 'var(--warning)',        bg: 'rgba(245,158,11,0.13)' },
    deposit_paid: { fg: 'var(--success-strong)', bg: 'rgba(34,197,94,0.13)' },
    fully_paid:   { fg: 'var(--info-strong)',    bg: 'rgba(59,130,246,0.13)' },
    overdue:      { fg: 'var(--danger-strong)',  bg: 'rgba(239,68,68,0.13)' },
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
                <input
                  type={isTotalFocused ? "number" : "text"}
                  step={isTotalFocused ? "0.01" : undefined}
                  required
                  value={isTotalFocused ? newTotalAmount : formatCurrencyLocal(newTotalAmount)}
                  onChange={(e) => setNewTotalAmount(e.target.value)}
                  onFocus={() => setIsTotalFocused(true)}
                  onBlur={() => setIsTotalFocused(false)}
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
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Restante no check-in</span>
              <span style={{ color: 'var(--muted)', fontSize: '15px' }}>
                {formatCurrency(booking.total_amount - booking.deposit_amount)}
              </span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Valor Total (R$)</label>
              <input
                type={isEditTotalFocused ? "number" : "text"}
                value={isEditTotalFocused ? editTotal : formatCurrencyLocal(editTotal)}
                onChange={e => setEditTotal(e.target.value)}
                onFocus={() => setIsEditTotalFocused(true)}
                onBlur={() => setIsEditTotalFocused(false)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Valor do Sinal (R$)</label>
              <input
                type={isEditDepositFocused ? "number" : "text"}
                value={isEditDepositFocused ? editDeposit : formatCurrencyLocal(editDeposit)}
                onChange={e => setEditDeposit(e.target.value)}
                onFocus={() => setIsEditDepositFocused(true)}
                onBlur={() => setIsEditDepositFocused(false)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
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
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmada</option>
              <option value="checked_in">Check-in realizado</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
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
              <option value="pending">Pendente</option>
              <option value="deposit_paid">Sinal pago</option>
              <option value="fully_paid">Pago integralmente</option>
              <option value="overdue">Atrasado</option>
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
            {status === 'pending' ? 'Pendente' : status === 'confirmed' ? 'Confirmada' : status === 'checked_in' ? 'Check-in realizado' : status === 'completed' ? 'Concluída' : 'Cancelada'}
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
            {paymentStatus === 'pending' ? 'Pendente' : paymentStatus === 'deposit_paid' ? 'Sinal pago' : paymentStatus === 'fully_paid' ? 'Pago integralmente' : 'Atrasado'}
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
