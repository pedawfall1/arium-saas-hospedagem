import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BookOpen, Calendar, Settings2, BarChart2, ChevronRight, TrendingUp } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { RecentBookingsTable } from "@/components/dashboard/RecentBookingsTable"

export const revalidate = 30

export default async function TenantDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name')
    .eq('auth_user_id', user.id)
    .single()
  if (!tenant) redirect("/login")

  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('tenant_id', tenant.id)

  const propertyIds = (properties || []).map(p => p.id)

  let bookings: any[] = []
  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from('bookings')
      .select('*, properties(name)')
      .in('property_id', propertyIds)
      .order('check_in', { ascending: false })
    bookings = data || []
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const pendingBookings = bookings.filter(b => b.status === 'pending').length

  const revenueThisMonth = bookings.filter(b => {
    if (b.payment_status !== 'deposit_paid' && b.payment_status !== 'fully_paid') return false
    const d = new Date(b.created_at)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).reduce((acc, b) => acc + (Number(b.deposit_amount) || 0), 0)

  // next checkin
  const futureBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in')
    .map(b => ({ ...b, check_in_dt: new Date(b.check_in + "T00:00:00") }))
    .filter(b => b.check_in_dt.getTime() >= new Date().setHours(0,0,0,0))
    .sort((a, b) => a.check_in_dt.getTime() - b.check_in_dt.getTime())
    
  const nextCheckin = futureBookings.length > 0 
    ? formatDate(futureBookings[0].check_in)
    : "Nenhum"

  const recentBookings = bookings.slice(0, 5)

  return (
    <>
      {/* Ambient orbs — behind content */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-100px', right: '10%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '20%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>

      <style>{`
        .stat-card {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .stat-total:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          transform: translateY(-2px);
        }
        .stat-confirmed:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          transform: translateY(-2px);
        }
        .stat-revenue:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          transform: translateY(-2px);
        }
        .stat-checkin:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          transform: translateY(-2px);
        }

        .qa-card {
          transition: all 0.18s ease;
        }
        .qa-card:hover {
          border: 1px solid var(--purple) !important;
          background-color: var(--purple-dim) !important;
          box-shadow: 0 4px 20px rgba(124,58,237,0.12) !important;
          transform: translateX(4px);
        }
        .qa-card:hover .qa-icon-container {
          box-shadow: 0 0 12px rgba(124,58,237,0.3) !important;
        }
      `}</style>

      {/* Header section */}
      <div style={{ marginBottom: '40px' }}>
        <h1 className="dash-title" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
          Bem-vindo, <span style={{ color: 'var(--accent)' }}>{tenant.business_name}</span>
        </h1>
        <p className="dash-subtitle" style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Aqui está um resumo da sua operação hoje — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="dash-stats">
        <Link href="/dashboard/reservas?status=pending" style={{ textDecoration: 'none' }} className="stat-card stat-pending">
          <div className="stat-card-inner" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', borderTop: '3px solid #ef4444', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Aguardando ação</p>
                <p className="stat-number" style={{ fontSize: 'clamp(24px, 6vw, 40px)', fontWeight: 800, lineHeight: 1, marginTop: '12px', color: '#ef4444' }}>{pendingBookings}</p>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(239,68,68,0.2)' }}>
                <BookOpen size={20} color="#f87171" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/relatorios" style={{ textDecoration: 'none' }} className="stat-card stat-revenue">
          <div className="stat-card-inner" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', borderTop: '3px solid #f97b00', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Receita este mês</p>
                <p className="stat-number" style={{ fontSize: 'clamp(22px, 5vw, 40px)', fontWeight: 800, lineHeight: 1, marginTop: '12px', color: '#f97b00', whiteSpace: 'nowrap' }}>{formatCurrency(revenueThisMonth)}</p>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(249,123,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(249,123,0,0.2)' }}>
                <TrendingUp size={20} color="#fb923c" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/calendario" style={{ textDecoration: 'none' }} className="stat-card stat-checkin">
          <div className="stat-card-inner" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', borderTop: '3px solid #3b82f6', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Check-in</p>
                <p className="stat-number" style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, lineHeight: 1, marginTop: '12px', color: '#3b82f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextCheckin}</p>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(59,130,246,0.2)', flexShrink: 0 }}>
                <Calendar size={20} color="#60a5fa" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Two column layout */}
      <div className="dash-main-grid">
        
        {/* Left column */}
        <div style={{ minWidth: 0, maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Reservas recentes
            </h2>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <Link href="/dashboard/reservas" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 500 }}>
              Ver todas &rarr;
            </Link>
          </div>
          
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--purple)', borderRadius: '12px', overflow: 'hidden' }}>
            <RecentBookingsTable bookings={recentBookings} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ minWidth: 0, maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Ações rápidas
            </h2>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/dashboard/propriedades" className="qa-card quick-action-card" style={{
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
              display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textDecoration: 'none'
            }}>
              <div className="qa-icon-container" style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s ease' }}>
                <Settings2 size={20} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>Bloquear datas</p>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>Gerencie disponibilidade</p>
              </div>
              <ChevronRight size={16} color="var(--muted)" />
            </Link>
            
            <Link href="/dashboard/calendario" className="qa-card quick-action-card" style={{
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
              display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textDecoration: 'none'
            }}>
              <div className="qa-icon-container" style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s ease' }}>
                <Calendar size={20} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>Ver calendário</p>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>Visão mensal de ocupação</p>
              </div>
              <ChevronRight size={16} color="var(--muted)" />
            </Link>

            <Link href="/dashboard/relatorios" className="qa-card quick-action-card" style={{
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
              display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textDecoration: 'none'
            }}>
              <div className="qa-icon-container" style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s ease' }}>
                <BarChart2 size={20} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>Relatórios</p>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>Receita e estatísticas</p>
              </div>
              <ChevronRight size={16} color="var(--muted)" />
            </Link>
          </div>
        </div>

      </div>
    </div>
    </>
  )
}
