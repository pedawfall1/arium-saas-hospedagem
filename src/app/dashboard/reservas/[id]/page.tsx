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

  return <BookingDetailClient booking={booking} tenantName={tenant.business_name} />
}
