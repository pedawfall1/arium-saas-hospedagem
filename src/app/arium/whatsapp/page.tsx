import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WhatsappAdminClient from './WhatsappAdminClient'

export default async function WhatsappAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.email?.trim().toLowerCase() !== (process.env.ARIUM_ADMIN_EMAIL ?? '').trim().toLowerCase()) {
    redirect('/dashboard')
  }

  const { data: tenants } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name, whatsapp_status, whatsapp_connected_at, whatsapp_instance_name')
    .order('created_at', { ascending: false })

  return <WhatsappAdminClient initialTenants={tenants || []} />
}
