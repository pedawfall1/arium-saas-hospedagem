"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"
import { AriumDatePicker } from "@/components/ui/DatePicker"
import { parseISO, eachDayOfInterval, addDays, isAfter, startOfDay, parse } from "date-fns"
import { useMemo } from "react"

export function NovaReservaClient({ properties, blockedDates = [], bookings = [] }: { properties: any[], blockedDates?: any[], bookings?: any[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    property_id: properties[0]?.id || "",
    guest_name: "",
    guest_phone: "",
    check_in: "",
    check_out: "",
    guests_count: 2,
    total_amount: "",
    deposit_amount: "",
    notes: ""
  })

  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null)

  const [isFocused, setIsFocused] = useState({ total_amount: false, deposit_amount: false })

  const unavailableDates = useMemo(() => {
    const dates: Date[] = []
    const pid = formData.property_id

    blockedDates.forEach((b: any) => {
      if (b.property_id === pid) {
        dates.push(parseISO(b.date))
      }
    })

    bookings.forEach((b: any) => {
      if (b.property_id === pid) {
        const start = parseISO(b.check_in)
        const end = parseISO(b.check_out)
        if (start < end) {
          const interval = eachDayOfInterval({ start, end: addDays(end, -1) })
          dates.push(...interval)
        }
      }
    })

    return dates.sort((a, b) => a.getTime() - b.getTime())
  }, [blockedDates, bookings, formData.property_id])

  const maxCheckOutDate = useMemo(() => {
    if (!formData.check_in) return undefined
    const checkInDate = startOfDay(parse(formData.check_in, 'yyyy-MM-dd', new Date()))
    const nextBlocked = unavailableDates.find(d => isAfter(d, checkInDate))
    return nextBlocked || undefined
  }, [formData.check_in, unavailableDates])

  const formatCurrency = (val: string | number) => {
    if (val === "" || val === null || val === undefined) return ""
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setToast(null)

    try {
      if (!formData.property_id || !formData.check_in || !formData.check_out) {
        throw new Error("Por favor, preencha a cabana, check-in e check-out.")
      }

      if (formData.check_in >= formData.check_out) {
        throw new Error("A data de check-out deve ser maior que a de check-in.")
      }

      const guests = Math.max(1, Number(formData.guests_count || 1))
      const totalAmount = formData.total_amount ? Number(formData.total_amount) : 0
      const depositAmount = formData.deposit_amount ? Number(formData.deposit_amount) : 0
      const guestPhone = formData.guest_phone || "00000000000"
      const guestName = formData.guest_name || "Hóspede (Reserva Manual)"

      const { data, error } = await supabase.from('bookings').insert([{
        property_id: formData.property_id,
        guest_name: guestName,
        guest_phone: guestPhone,
        check_in: formData.check_in,
        check_out: formData.check_out,
        guests_count: guests,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        notes: formData.notes || 'Reserva manual',
        status: 'confirmed',
        payment_status: 'fully_paid'
      }]).select()

      console.log('Insert em bookings: ', { data, error })

      if (error) {
        throw error
      }

      // Inserir datas bloqueadas apenas se a reserva der certo
      if (data && data.length > 0) {
        const datesToBlock = []
        let current = new Date(formData.check_in + 'T12:00:00')
        const end = new Date(formData.check_out + 'T12:00:00')
        while (current < end) {
          datesToBlock.push({
            property_id: formData.property_id,
            date: current.toISOString().split('T')[0],
            reason: 'Reserva manual: ' + guestName,
            guest_name: guestName
          })
          current.setDate(current.getDate() + 1)
        }
        if (datesToBlock.length > 0) {
          const { error: blockError } = await supabase.from('blocked_dates').insert(datesToBlock)
          if (blockError) {
            console.error('Erro ao bloquear datas:', blockError)
          }
        }
      }

      setSuccess(true)
      setToast({ msg: "Reserva salva com sucesso!", type: 'success' })
      setTimeout(() => {
        router.push('/dashboard/reservas')
      }, 1500)
    } catch (err: any) {
      console.error(err)
      const msg = err.message || "Erro desconhecido ao salvar reserva."
      setErrorMsg(msg)
      setToast({ msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: 'var(--text)',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.15s ease'
  }

  const labelStyle = {
    display: 'block',
    color: 'var(--muted)',
    fontSize: '13px',
    marginBottom: '8px',
    fontWeight: 500
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => router.push('/dashboard/reservas')}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'none', border: 'none', 
          color: 'var(--muted)', cursor: 'pointer', 
          fontSize: '14px', fontWeight: 500, marginBottom: '24px', padding: 0 
        }}
      >
        <ArrowLeft size={16} /> Voltar para reservas
      </button>

      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        Nova Reserva Manual
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
        Crie uma nova reserva diretamente pelo painel administrativo.
      </p>

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#f87171', fontSize: '14px', margin: 0, fontWeight: 500 }}>{errorMsg}</p>
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#4ade80', fontSize: '14px', margin: 0, fontWeight: 500 }}>Reserva salva com sucesso! Redirecionando...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ 
        backgroundColor: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: '16px', 
        padding: '32px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Cabana *</label>
            <select 
              required
              name="property_id"
              value={formData.property_id}
              onChange={handleChange}
              style={inputStyle}
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Nome completo (Hóspede)</label>
            <input 
              type="text" name="guest_name"
              value={formData.guest_name} onChange={handleChange}
              style={inputStyle} placeholder="Ex: João da Silva"
            />
          </div>

          <div>
            <label style={labelStyle}>WhatsApp</label>
            <input 
              type="text" name="guest_phone"
              value={formData.guest_phone} onChange={handleChange}
              style={inputStyle} placeholder="(XX) XXXXX-XXXX"
            />
          </div>

          <div>
            <label style={labelStyle}>Número de hóspedes</label>
            <input 
              type="number" name="guests_count" min="1"
              value={formData.guests_count} onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label style={labelStyle}>Check-in *</label>
            <AriumDatePicker 
              required
              value={formData.check_in}
              onChange={(dateStr: string) => setFormData(prev => ({...prev, check_in: dateStr}))}
              placeholder="dd/mm/aaaa"
              excludeDates={unavailableDates}
            />
          </div>

          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label style={labelStyle}>Check-out *</label>
            <AriumDatePicker 
              required
              value={formData.check_out}
              onChange={(dateStr: string) => setFormData(prev => ({...prev, check_out: dateStr}))}
              placeholder="dd/mm/aaaa"
              excludeDates={unavailableDates}
              minDate={formData.check_in ? parse(formData.check_in, 'yyyy-MM-dd', new Date()) : undefined}
              maxDate={maxCheckOutDate}
            />
          </div>

          <div>
            <label style={labelStyle}>Valor total (R$)</label>
            <input 
              type={isFocused.total_amount ? "number" : "text"} 
              step={isFocused.total_amount ? "0.01" : undefined}
              name="total_amount"
              value={isFocused.total_amount ? formData.total_amount : formatCurrency(formData.total_amount)} 
              onChange={handleChange}
              onFocus={() => setIsFocused(prev => ({...prev, total_amount: true}))}
              onBlur={() => setIsFocused(prev => ({...prev, total_amount: false}))}
              style={inputStyle} placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label style={labelStyle}>Valor do sinal (R$)</label>
            <input 
              type={isFocused.deposit_amount ? "number" : "text"} 
              step={isFocused.deposit_amount ? "0.01" : undefined}
              name="deposit_amount"
              value={isFocused.deposit_amount ? formData.deposit_amount : formatCurrency(formData.deposit_amount)} 
              onChange={handleChange}
              onFocus={() => setIsFocused(prev => ({...prev, deposit_amount: true}))}
              onBlur={() => setIsFocused(prev => ({...prev, deposit_amount: false}))}
              style={inputStyle} placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={labelStyle}>Observações</label>
          <textarea 
            name="notes" rows={4}
            value={formData.notes} onChange={handleChange}
            style={{ ...inputStyle, resize: 'vertical' }} placeholder="Alguma observação importante sobre a reserva?"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button 
            type="button" 
            onClick={() => router.push('/dashboard/reservas')}
            style={{ 
              backgroundColor: 'transparent', border: '1px solid var(--border)', 
              color: 'var(--text)', borderRadius: '8px', padding: '12px 24px', 
              fontSize: '14px', fontWeight: 600, cursor: 'pointer' 
            }}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              backgroundColor: 'var(--purple)', border: 'none', 
              color: 'white', borderRadius: '8px', padding: '12px 32px', 
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Salvando...' : 'Criar Reserva'}
          </button>
        </div>
      </form>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#22c55e',
          color: 'white', padding: '16px 24px', borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex', alignItems: 'center', gap: '12px',
          maxWidth: '400px'
        }}>
          <span style={{ fontWeight: 600 }}>{toast.type === 'error' ? 'Erro:' : 'Sucesso!'}</span>
          <span style={{ fontSize: '14px' }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: 'auto', fontSize: '16px', fontWeight: 600 }}>✕</button>
        </div>
      )}
    </div>
  )
}
