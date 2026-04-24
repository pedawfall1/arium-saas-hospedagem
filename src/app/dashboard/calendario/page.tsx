import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { CalendarioClient } from "./CalendarioClient"

export const revalidate = 30

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) return null

  // Fetch properties
  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('tenant_id', tenant.id)

  const propertyIds = (properties || []).map(p => p.id)

  let bookings: any[] = []
  let blockedDates: any[] = []

  if (propertyIds.length > 0) {
    const [{ data: bookingsRes }, { data: blocksRes }] = await Promise.all([
      supabase.from('bookings').select('*').in('property_id', propertyIds),
      supabase.from('blocked_dates').select('*').in('property_id', propertyIds)
    ])

    bookings = bookingsRes || []
    blockedDates = blocksRes || []
  }

  return (
    <CalendarioClient 
      properties={properties || []} 
      bookings={bookings} 
      blockedDates={blockedDates} 
      tenantName={tenant.business_name} 
    />
  )
}
