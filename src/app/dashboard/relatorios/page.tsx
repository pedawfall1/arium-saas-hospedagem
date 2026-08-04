import { createClient } from "@/lib/supabase/server"
import { RelatoriosClient } from "./RelatoriosClient"

export const revalidate = 30

export default async function RelatoriosPage() {
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
    .order('name')

  const propertyIds = (properties || []).map(p => p.id)

  let bookings: any[] = []
  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from('bookings')
      .select('id, property_id, check_in, check_out, total_amount, deposit_amount, status, payment_status, is_courtesy, awaiting_settlement')
      .in('property_id', propertyIds)

    bookings = data || []
  }

  const [{ data: expenses }, { data: extras }, { data: categories }, { data: payments }] = await Promise.all([
    supabase.from('expenses').select('id, property_id, category_id, amount, date, description').eq('tenant_id', tenant.id),
    supabase.from('extra_revenues').select('id, booking_id, property_id, amount, date, description').eq('tenant_id', tenant.id),
    supabase.from('expense_categories').select('id, label').eq('tenant_id', tenant.id).order('position'),
    supabase.from('booking_payments').select('id, booking_id, amount, date').eq('tenant_id', tenant.id),
  ])

  return (
    <RelatoriosClient
      bookings={bookings}
      properties={properties || []}
      expenses={expenses || []}
      extras={extras || []}
      categories={categories || []}
      nomeNegocio={tenant.business_name}
      payments={payments || []}
    />
  )
}
