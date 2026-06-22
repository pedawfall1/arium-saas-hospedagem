import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NovaReservaClient } from "./NovaReservaClient"

export default async function NovaReservaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) redirect('/dashboard')

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('tenant_id', tenant.id)

  const propertyIds = properties?.map(p => p.id) || []

  const [ { data: blockedDates }, { data: bookings } ] = await Promise.all([
    supabase.from('blocked_dates').select('*').in('property_id', propertyIds),
    supabase.from('bookings').select('check_in, check_out, property_id, status').in('property_id', propertyIds).in('status', ['confirmed', 'checked_in', 'completed'])
  ])

  return (
    <NovaReservaClient 
      properties={properties || []} 
      blockedDates={blockedDates || []}
      bookings={bookings || []}
    />
  )
}
