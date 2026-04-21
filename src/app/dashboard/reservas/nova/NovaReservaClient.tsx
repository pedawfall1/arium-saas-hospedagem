"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"

export function NovaReservaClient({ properties }: { properties: any[] }) {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")

    try {
      if (!formData.property_id || !formData.guest_name || !formData.guest_phone || !formData.check_in || !formData.check_out || !formData.total_amount || !formData.deposit_amount) {
        throw new Error("Por favor, preencha todos os campos obrigatórios.")
      }

      const { error } = await supabase.from('bookings').insert([{
        property_id: formData.property_id,
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone,
        check_in: formData.check_in,
        check_out: formData.check_out,
        guests_count: Number(formData.guests_count || 1),
        total_amount: Number(formData.total_amount),
        deposit_amount: Number(formData.deposit_amount),
        notes: formData.notes || null,
        status: 'confirmed',
        payment_status: 'awaiting_deposit'
      }])

      if (error) {
        throw error
      }

      setSuccess(true)
      router.push('/dashboard/reservas')
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao salvar reserva.")
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
            <label style={labelStyle}>Nome completo (Hóspede) *</label>
            <input 
              required type="text" name="guest_name"
              value={formData.guest_name} onChange={handleChange}
              style={inputStyle} placeholder="Ex: João da Silva"
            />
          </div>

          <div>
            <label style={labelStyle}>WhatsApp *</label>
            <input 
              required type="text" name="guest_phone"
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

          <div style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            <label style={labelStyle}>Check-in *</label>
            <input 
              required type="date" name="check_in"
              value={formData.check_in} onChange={handleChange}
              style={{
                ...inputStyle,
                width: '100%',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            />
          </div>

          <div style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            <label style={labelStyle}>Check-out *</label>
            <input 
              required type="date" name="check_out"
              value={formData.check_out} onChange={handleChange}
              style={{
                ...inputStyle,
                width: '100%',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Valor total (R$) *</label>
            <input 
              required type="number" step="0.01" name="total_amount"
              value={formData.total_amount} onChange={handleChange}
              style={inputStyle} placeholder="Ex: 1200.00"
            />
          </div>

          <div>
            <label style={labelStyle}>Valor do sinal (R$) *</label>
            <input 
              required type="number" step="0.01" name="deposit_amount"
              value={formData.deposit_amount} onChange={handleChange}
              style={inputStyle} placeholder="Ex: 600.00"
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
    </div>
  )
}
