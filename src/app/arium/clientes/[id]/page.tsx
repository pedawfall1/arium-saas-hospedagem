import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StatusBadge, PlanBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const resolvedParams = await params

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!tenant) notFound()

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('tenant_id', resolvedParams.id)
    .order('created_at')

  const propertyIds = (properties ?? []).map(p => p.id)

  const { data: bookings } = propertyIds.length > 0
    ? await supabase
        .from('bookings')
        .select('*, properties(name)')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const totalRevenue = (bookings ?? [])
    .filter(b => ['deposit_paid','fully_paid'].includes(b.payment_status))
    .reduce((sum, b) => sum + Number(b.deposit_amount), 0)

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Back link */}
      <a href="/arium/clientes" style={{
        color: 'var(--muted)', fontSize: '13px', textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px'
      }}>
        ← Todos os clientes
      </a>

      {/* Tenant header card */}
      <div style={{
        backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '28px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 700 }}>
              {tenant.business_name}
            </h1>
            <PlanBadge plan={tenant.plan} />
            <StatusBadge status={tenant.status} />
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{tenant.owner_name}</p>
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{tenant.email}</p>
          {tenant.phone && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{tenant.phone}</p>}
          {tenant.site_domain && (
            <a href={`https://${tenant.site_domain}`} target="_blank" style={{
              color: 'var(--accent)', fontSize: '13px', marginTop: '4px', display: 'block'
            }}>
              {tenant.site_domain} ↗
            </a>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>Mensalidade</p>
          <p style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: 700 }}>
            {tenant.monthly_amount ? formatCurrency(tenant.monthly_amount) : '—'}
          </p>
          {tenant.next_payment_at && (
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>
              Próximo venc.: {formatDate(tenant.next_payment_at)}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px', marginBottom: '24px'
      }}>
        {[
          { label: 'Propriedades', value: String(properties?.length ?? 0) },
          { label: 'Reservas totais', value: String(bookings?.length ?? 0) },
          { label: 'Receita gerada', value: formatCurrency(totalRevenue) },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '20px'
          }}>
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px' }}>{stat.label}</p>
            <p style={{ color: 'var(--accent)', fontSize: '24px', fontWeight: 700 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Properties */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Propriedades
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(properties ?? []).map(p => (
            <div key={p.id} style={{
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>{p.name}</p>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>
                  {p.slug} · até {p.max_guests} hóspedes
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }}>
                  {formatCurrency(p.base_price_weekday)}/noite
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  Fds: {formatCurrency(p.base_price_weekend)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings */}
      <div>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Reservas recentes
        </h2>
        <div style={{
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(13,13,26,0.5)' }}>
                {['Hóspede', 'Cabana', 'Check-in', 'Check-out', 'Total', 'Status'].map(col => (
                  <th key={col} style={{
                    padding: '14px 24px', textAlign: 'left',
                    color: 'var(--muted)', fontSize: '11px', fontWeight: 500,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)'
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bookings ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                    Nenhuma reserva encontrada.
                  </td>
                </tr>
              ) : (bookings ?? []).map((b, i) => (
                <tr key={b.id} style={{
                  borderBottom: i < (bookings?.length ?? 0) - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none'
                }}>
                  <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>{b.guest_name}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '14px' }}>{b.properties?.name}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '14px' }}>{formatDate(b.check_in)}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '14px' }}>{formatDate(b.check_out)}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }}>
                    {formatCurrency(b.total_amount)}
                  </td>
                  <td style={{ padding: '16px 24px' }}><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
