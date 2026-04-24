import { createClient } from "@/lib/supabase/server"
import { ReservasClient } from "./ReservasClient"

export const revalidate = 30

export default async function ReservasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) return null

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('tenant_id', tenant.id)

  const propertyIds = (properties || []).map(p => p.id)

  let bookings: any[] = []
  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from('bookings')
      .select('*, properties(*) ')
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })
      
    bookings = data || []
  }

  return <ReservasClient bookings={bookings} properties={properties || []} />
}
