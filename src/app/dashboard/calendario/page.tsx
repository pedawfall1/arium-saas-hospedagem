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
    .select('id, name, slug, base_price_weekday, base_price_weekend, single_night_weekday_price, min_nights_weekday, min_nights_weekend')
    .eq('tenant_id', tenant.id)

  const propertyIds = (properties || []).map(p => p.id)

  let bookings: any[] = []
  let blockedDates: any[] = []
  let holidays: any[] = []

  if (propertyIds.length > 0) {
    const [{ data: bookingsRes }, { data: blocksRes }, { data: holidaysRes }] = await Promise.all([
      supabase.from('bookings').select('*').in('property_id', propertyIds),
      supabase.from('blocked_dates').select('*').in('property_id', propertyIds),
      supabase.from('holidays').select('*').in('property_id', propertyIds).order('date_from')
    ])

    bookings = bookingsRes || []
    blockedDates = blocksRes || []
    holidays = holidaysRes || []
  }

  return (
    <CalendarioClient
      properties={properties || []}
      bookings={bookings}
      blockedDates={blockedDates}
      holidays={holidays}
      tenantName={tenant.business_name}
    />
  )
}
