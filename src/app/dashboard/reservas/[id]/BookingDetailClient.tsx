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

export function BookingDetailClient({ booking, tenantName }: any) {
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
    if (!(await confirm('Excluir Reserva', 'Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.'))) return
    setLoading(true)
    await supabase.from('bookings').delete().eq('id', booking.id)
    router.push('/dashboard/reservas')
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

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    confirmed: '#22c55e',
    checked_in: '#3b82f6',
    completed: '#6b7280',
    cancelled: '#ef4444',
  }

  const paymentStatusColors: Record<string, string> = {
    pending: '#f59e0b',
    deposit_paid: '#22c55e',
    fully_paid: '#3b82f6',
    overdue: '#ef4444',
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <ConfirmModal />
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

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Left card - Guest details */}
        <div style={cardStyle}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            Detalhes do Hóspede
          </h2>
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
          {booking.guest_email && (
            <div style={booking.guest_city ? { marginBottom: '12px' } : {}}>
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
                <p style={{ color: '#f87171', fontSize: '13px', margin: 0, fontWeight: 500 }}>{errorMsg}</p>
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
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Valores
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Total</span>
          <span style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600 }}>
            {formatCurrency(booking.total_amount)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Sinal</span>
          <span style={{ color: '#22c55e', fontSize: '15px', fontWeight: 600 }}>
            {formatCurrency(booking.deposit_amount)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Restante no check-in</span>
          <span style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {formatCurrency(booking.total_amount - booking.deposit_amount)}
          </span>
        </div>
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
            backgroundColor: `${statusColors[status]}20`,
            color: statusColors[status],
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            {status === 'pending' ? 'Pendente' : status === 'confirmed' ? 'Confirmada' : status === 'checked_in' ? 'Check-in realizado' : status === 'completed' ? 'Concluída' : 'Cancelada'}
          </div>
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: `${paymentStatusColors[paymentStatus]}20`,
            color: paymentStatusColors[paymentStatus],
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            {paymentStatus === 'pending' ? 'Pendente' : paymentStatus === 'deposit_paid' ? 'Sinal pago' : paymentStatus === 'fully_paid' ? 'Pago integralmente' : 'Atrasado'}
          </div>
        </div>
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

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px',
          color: '#f87171',
          fontWeight: 600,
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '12px',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Excluindo...' : '🗑️ Excluir reserva'}
      </button>
    </div>
  )
}
