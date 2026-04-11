"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Users, CheckCircle, TrendingUp, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { StatusBadge, PlanBadge } from "@/components/ui/Badge"

function StatCard({
  label, value, sub, icon: Icon
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
}) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '28px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{label}</p>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          backgroundColor: 'var(--purple-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={16} style={{ color: 'var(--accent)' }} />
        </div>
      </div>
      <p style={{ color: 'var(--accent)', fontSize: '36px', fontWeight: 700, lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '8px' }}>{sub}</p>
      )}
    </div>
  )
}

export default function AriumDashboardPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('saas_reserva_tenants')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setTenants(data)
      setLoading(false)
    }
    load()
  }, [])

  const activeClients = tenants.filter(t => t.status === 'active').length
  const totalClients = tenants.length
  const mrr = tenants.filter(t => t.status === 'active').reduce((acc, t) => acc + (t.monthly_amount || 0), 0)
  
  const thisMonthStr = new Date().toISOString().substring(0, 7)
  const newThisMonth = tenants.filter(t => t.created_at.startsWith(thisMonthStr)).length

  if (loading) return null

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '40px' }}>
        Visão geral da plataforma Arium
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <StatCard label="Total de clientes" value={String(totalClients)} icon={Users} />
        <StatCard label="Clientes ativos" value={String(activeClients)} icon={CheckCircle} />
        <StatCard label="MRR" value={formatCurrency(mrr)} sub="Receita mensal recorrente" icon={TrendingUp} />
        <StatCard label="Novos este mês" value={String(newThisMonth)} icon={UserPlus} />
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>
          Clientes Recentes
        </h2>
        <a href="/arium/clientes" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>
          Ver todos →
        </a>
      </div>

      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(13, 13, 26, 0.5)' }}>
              {['Negócio', 'Plano', 'Mensalidade', 'Status'].map(col => (
                <th key={col} style={{
                  padding: '14px 24px', textAlign: 'left',
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
            {(tenants || []).slice(0, 5).map((tenant, i) => (
              <tr key={tenant.id} style={{
                borderBottom: i < Math.min(tenants.length, 5) - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--purple-dim)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              onClick={() => router.push(`/arium/clientes/${tenant.id}`)}
              >
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>
                  {tenant.business_name}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <PlanBadge plan={tenant.plan} />
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>
                  {tenant.monthly_amount ? formatCurrency(tenant.monthly_amount) : '—'}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <StatusBadge status={tenant.status} />
                </td>
              </tr>
            ))}
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td colSpan={4} style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Users size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhum cliente cadastrado.</p>
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
