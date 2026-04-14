"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusBadge, PlanBadge } from "@/components/ui/Badge"
import { Users } from "lucide-react"

export default function ClientesPage() {
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

  if (loading) return null

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        Gestão de Clientes
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '40px' }}>
        Gerencie as assinaturas e acessos dos seus clientes.
      </p>

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>
          Todos os Clientes
        </h2>
        <a href="/arium/clientes/novo" style={{ background: 'var(--purple)', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
          + Novo Cliente
        </a>
      </div>

      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(13, 13, 26, 0.5)' }}>
              {['Negócio', 'Domínio', 'Plano', 'Criado em', 'Mensalidade', 'Status'].map(col => (
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
            {(tenants || []).map((tenant, i) => (
              <tr key={tenant.id} style={{
                borderBottom: i < tenants.length - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--purple-dim)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              onClick={() => router.push(`/arium/clientes/${tenant.id}`)}
              >
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {tenant.business_name}
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>
                  {tenant.site_domain || <span style={{ color: 'var(--muted)' }}>Sem domínio</span>}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <PlanBadge plan={tenant.plan} />
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>
                  {formatDate(tenant.created_at)}
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
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Users size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhum cliente cadastrado ainda.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
