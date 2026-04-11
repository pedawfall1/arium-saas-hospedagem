'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PLANS = [
  { value: 'essencial', label: 'Essencial — R$ 200/mês (1 cabana)' },
  { value: 'plus',      label: 'Plus — R$ 250/mês (2+ cabanas)' },
  { value: 'premium',   label: 'Premium — R$ 300/mês (+ app check-in)' },
]

const PLAN_PRICES: Record<string, number> = {
  essencial: 200, plus: 250, premium: 300
}

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    business_name: '', owner_name: '', email: '', phone: '',
    plan: 'essencial', site_domain: '', notes: '',
    monthly_amount: 200,
  })

  const set = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('saas_reserva_tenants').insert({
      ...form,
      status: 'active',
      site_color: '#046C62',
    })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/arium/clientes')
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '14px', outline: 'none',
  }
  const labelStyle = { color: 'var(--muted)', fontSize: '13px', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ maxWidth: '640px' }}>
      <a href="/arium/clientes" style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '24px', display: 'inline-block' }}>
        ← Voltar
      </a>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        Novo cliente
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '40px' }}>
        Adicione um novo cliente ao SaaS Arium Hospedagens.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '28px', display: 'flex',
          flexDirection: 'column', gap: '20px'
        }}>
          {[
            { key: 'business_name', label: 'Nome do negócio *', placeholder: 'Ex: Cabanas Serra Verde' },
            { key: 'owner_name',    label: 'Nome do proprietário *', placeholder: 'Ex: João Silva' },
            { key: 'email',         label: 'E-mail *', placeholder: 'contato@exemplo.com.br', type: 'email' },
            { key: 'phone',         label: 'WhatsApp', placeholder: '5549999999999' },
            { key: 'site_domain',   label: 'Domínio do site', placeholder: 'cabanasserraverde.com.br' },
          ].map(field => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type={field.type ?? 'text'}
                value={(form as any)[field.key]}
                onChange={e => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.label.includes('*')}
                style={inputStyle}
              />
            </div>
          ))}

          <div>
            <label style={labelStyle}>Plano *</label>
            <select
              value={form.plan}
              onChange={e => { set('plan', e.target.value); set('monthly_amount', PLAN_PRICES[e.target.value]) }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Valor mensal (R$)</label>
            <input
              type="number" value={form.monthly_amount}
              onChange={e => set('monthly_amount', Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Observações internas</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Notas sobre o cliente, contexto da venda..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {error && <p style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <a href="/arium/clientes" style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '14px',
              border: '1px solid var(--border)', color: 'var(--muted)',
              textDecoration: 'none', cursor: 'pointer'
            }}>
              Cancelar
            </a>
            <button type="submit" disabled={loading} style={{
              padding: '10px 24px', borderRadius: '8px', fontSize: '14px',
              fontWeight: 600, border: 'none', cursor: 'pointer',
              backgroundColor: loading ? 'rgba(124,58,237,0.5)' : 'var(--purple)',
              color: 'white'
            }}>
              {loading ? 'Salvando...' : 'Criar cliente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
