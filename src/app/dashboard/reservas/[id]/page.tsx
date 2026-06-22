import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { BookingDetailClient } from "./BookingDetailClient"

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const resolvedParams = await params
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) return null

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, properties!inner(tenant_id, name)')
    .eq('id', resolvedParams.id)
    .eq('properties.tenant_id', tenant.id)
    .single()

  if (!booking) notFound()

  const [ { data: blockedDates }, { data: bookings } ] = await Promise.all([
    supabase.from('blocked_dates').select('*').eq('property_id', booking.property_id),
    supabase.from('bookings').select('id, check_in, check_out, property_id, status').eq('property_id', booking.property_id).in('status', ['confirmed', 'checked_in', 'completed'])
  ])

  return (
    <BookingDetailClient 
      booking={booking} 
      tenantName={tenant.business_name} 
      blockedDates={blockedDates || []}
      bookings={bookings || []}
    />
  )
}
