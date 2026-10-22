import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WhatsappClient from './WhatsappClient'

export default async function WhatsappPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name, whatsapp_instance_name, whatsapp_status, whatsapp_connected_at')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) redirect('/login')

  // Só para a prévia da mensagem usar o nome de uma cabana de verdade.
  const { data: cabana } = await supabase
    .from('properties')
    .select('name, checkin_time, checkout_time')
    .eq('tenant_id', tenant.id)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  return <WhatsappClient initialTenant={tenant} cabanaExemplo={cabana} />
}
