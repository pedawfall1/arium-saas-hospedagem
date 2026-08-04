import { createClient } from "@/lib/supabase/server"
import { HojeClient } from "./HojeClient"

export const revalidate = 0

export default async function HojePage() {
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
    .select('id, name, checkin_time, checkout_time')
    .eq('tenant_id', tenant.id)
    .order('name')

  const propertyIds = (properties || []).map(p => p.id)

  // Janela curta: ontem até depois de amanhã cobre tudo que a tela mostra.
  const hoje = new Date()
  const dia = (offset: number) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }

  let bookings: any[] = []
  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from('bookings')
      .select('id, property_id, guest_name, guest_phone, check_in, check_out, guests_count, status, payment_status, total_amount, deposit_amount, notes, is_courtesy')
      .in('property_id', propertyIds)
      .in('status', ['confirmed', 'checked_in'])
      .lte('check_in', dia(2))
      .gte('check_out', dia(-1))
      .order('check_in')
    bookings = data || []
  }

  return (
    <HojeClient
      properties={properties || []}
      bookings={bookings}
      hoje={dia(0)}
      amanha={dia(1)}
    />
  )
}
