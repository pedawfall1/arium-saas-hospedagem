"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { StatusBadge, PlanBadge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"

export function TenantDetailClient({ initialTenant, properties, bookings, revenueData }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [tenant, setTenant] = useState(initialTenant)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { data, error } = await supabase
      .from('saas_reserva_tenants')
      .update({
        business_name: tenant.business_name,
        plan: tenant.plan,
        status: tenant.status,
        monthly_amount: tenant.monthly_amount,
        site_domain: tenant.site_domain,
        auth_user_id: tenant.auth_user_id,
        notes: tenant.notes
      })
      .eq('id', tenant.id)
      .select()
      .single()
      
    setSaving(false)
    if (data) {
      setTenant(data)
      setIsEditing(false)
      router.refresh()
    }
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
        Cliente: {tenant.business_name}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
        Gerencie as configurações deste assinante.
      </p>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/arium/clientes" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '14px', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Voltar para Clientes
        </Link>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border p-6 text-sm mb-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Informações do Cliente</h2>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-1">
            <span style={{ color: 'var(--muted)' }}>Data de Criação</span>
            <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDate(tenant.created_at)}</p>
          </div>
          <div className="space-y-1">
            <span style={{ color: 'var(--muted)' }}>Auth User ID (Supabase Auth)</span>
            {isEditing ? (
              <Input value={tenant.auth_user_id || ''} onChange={e => setTenant({...tenant, auth_user_id: e.target.value})} placeholder="Copie do Supabase" />
            ) : (
              <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{tenant.auth_user_id || 'Não vinculado'}</p>
            )}
          </div>
          <div className="space-y-1">
            <span style={{ color: 'var(--muted)' }}>Status</span>
            {isEditing ? (
              <select 
                className="flex h-10 w-full rounded-md border px-3 py-2"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                value={tenant.status} 
                onChange={e => setTenant({...tenant, status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="trial">Trial</option>
                <option value="cancelled">Cancelled</option>
              </select>
            ) : (
              <div><StatusBadge status={tenant.status} /></div>
            )}
          </div>
          <div className="space-y-1">
            <span style={{ color: 'var(--muted)' }}>Nome do Negócio</span>
            {isEditing ? (
              <Input value={tenant.business_name} onChange={e => setTenant({...tenant, business_name: e.target.value})} />
            ) : (
              <p className="font-medium" style={{ color: 'var(--text)' }}>{tenant.business_name}</p>
            )}
          </div>
          <div className="space-y-1">
            <span style={{ color: 'var(--muted)' }}>Plano</span>
            {isEditing ? (
              <select 
                className="flex h-10 w-full rounded-md border px-3 py-2"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                value={tenant.plan} 
                onChange={e => setTenant({...tenant, plan: e.target.value})}
              >
                <option value="essencial">Essencial</option>
                <option value="plus">Plus</option>
                <option value="premium">Premium</option>
              </select>
            ) : (
              <PlanBadge plan={tenant.plan} />
            )}
          </div>
          <div className="space-y-1">
            <span style={{ color: 'var(--muted)' }}>Mensalidade</span>
            {isEditing ? (
              <Input type="number" value={tenant.monthly_amount} onChange={e => setTenant({...tenant, monthly_amount: Number(e.target.value)})} />
            ) : (
              <p className="font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(tenant.monthly_amount)}</p>
            )}
          </div>
          <div className="space-y-1">
            <span style={{ color: 'var(--muted)' }}>Domínio</span>
            {isEditing ? (
              <Input value={tenant.site_domain || ''} onChange={e => setTenant({...tenant, site_domain: e.target.value})} />
            ) : (
              <p className="font-medium" style={{ color: 'var(--text)' }}>{tenant.site_domain || '-'}</p>
            )}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <span style={{ color: 'var(--muted)' }}>Anotações</span>
            {isEditing ? (
              <Input value={tenant.notes || ''} onChange={e => setTenant({...tenant, notes: e.target.value})} />
            ) : (
              <p className="font-medium whitespace-pre-line" style={{ color: 'var(--text)' }}>{tenant.notes || '-'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Properties */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(138, 43, 226, 0.05)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Propriedades ({properties.length})</h2>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {properties.map((p: any) => (
              <li key={p.id} className="p-4 flex items-center justify-between hover:bg-[var(--purple-dim)]">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{p.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Dias úteis: {formatCurrency(p.base_price_weekday)} | Fds: {formatCurrency(p.base_price_weekend)}</p>
                </div>
                <StatusBadge status={p.active ? 'active' : 'inactive'} />
              </li>
            ))}
          </ul>
        </div>

        {/* Revenue Snapshot */}
        <div className="rounded-xl border p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Receita no Mês (Sinais)</h2>
          <div className="flex justify-between items-center border p-4 rounded-lg" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>Coletado (Confirmadas)</span>
            <span className="text-xl font-bold text-green-400">{formatCurrency(revenueData.collected)}</span>
          </div>
          <div className="flex justify-between items-center border p-4 rounded-lg" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>Pendente (Aguardando Sinal)</span>
            <span className="text-xl font-bold text-orange-400">{formatCurrency(revenueData.pending)}</span>
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ marginBottom: '0px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(138, 43, 226, 0.05)', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>
            Últimas 10 Reservas
          </h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(13, 13, 26, 0.5)' }}>
              {['Hóspede', 'Cabana', 'Check-in', 'Out', 'Total', 'Status'].map(col => (
                <th key={col} style={{
                  padding: '12px 20px', textAlign: 'left',
                  color: 'var(--muted)', fontSize: '11px',
                  fontWeight: 500, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)'
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b: any, i: number) => (
              <tr key={b.id} style={{
                borderBottom: i < bookings.length - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--purple-dim)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ padding: '14px 20px', color: 'var(--text)', fontSize: '14px' }}>{b.guest_name}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text)', fontSize: '14px' }}>{b.properties?.name}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text)', fontSize: '14px' }}>{formatDate(b.check_in)}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text)', fontSize: '14px' }}>{formatDate(b.check_out)}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>{formatCurrency(b.total_amount)}</td>
                <td style={{ padding: '14px 20px' }}>
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <BookOpen size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhuma reserva encontrada.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
