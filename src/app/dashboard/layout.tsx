import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name, email, plan, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) redirect('/login')

  return (
    <DashboardShell tenant={tenant}>
      {children}
    </DashboardShell>
  )
}
