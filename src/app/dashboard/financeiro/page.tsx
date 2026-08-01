import { createClient } from "@/lib/supabase/server"
import { FinanceiroClient } from "./FinanceiroClient"

export const revalidate = 0

/**
 * Materializa as despesas fixas do mês corrente como lançamentos reais.
 *
 * Só gera para meses que já começaram (nunca para o futuro) e o índice único
 * (recurring_id, competencia) garante que rodar de novo não duplica nada.
 */
async function lancarDespesasFixas(supabase: any, tenantId: string) {
  const hoje = new Date()
  const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

  const { data: fixas } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  if (!fixas?.length) return

  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()

  const linhas = fixas
    .filter((f: any) => f.start_month <= competencia && (!f.end_month || f.end_month >= competencia))
    .map((f: any) => {
      const dia = Math.min(f.day_of_month || 1, ultimoDia)
      return {
        tenant_id: tenantId,
        property_id: f.property_id,
        category_id: f.category_id,
        description: f.description,
        amount: f.amount,
        date: `${competencia.slice(0, 8)}${String(dia).padStart(2, '0')}`,
        recurring_id: f.id,
        competencia,
      }
    })

  if (linhas.length) {
    await supabase.from('expenses').upsert(linhas, {
      onConflict: 'recurring_id,competencia',
      ignoreDuplicates: true,
    })
  }
}

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tenant } = await supabase
    .from('saas_reserva_tenants')
    .select('id, business_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!tenant) return null

  await lancarDespesasFixas(supabase, tenant.id)

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .order('name')

  const propertyIds = (properties || []).map(p => p.id)

  const [
    { data: categories },
    { data: expenses },
    { data: recurring },
    { data: extras },
  ] = await Promise.all([
    supabase.from('expense_categories').select('*').eq('tenant_id', tenant.id).order('position'),
    supabase.from('expenses').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false }).limit(500),
    supabase.from('recurring_expenses').select('*').eq('tenant_id', tenant.id).order('description'),
    supabase.from('extra_revenues').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false }).limit(500),
  ])

  const { data: payments } = await supabase
    .from('booking_payments')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('date', { ascending: false })
    .limit(500)

  // Reservas para vincular as receitas extras (extras sempre nascem de uma reserva)
  let bookings: any[] = []
  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from('bookings')
      .select('id, guest_name, check_in, check_out, property_id, status')
      .in('property_id', propertyIds)
      .neq('status', 'cancelled')
      .order('check_in', { ascending: false })
      .limit(300)
    bookings = data || []
  }

  return (
    <FinanceiroClient
      tenantId={tenant.id}
      properties={properties || []}
      categories={categories || []}
      expenses={expenses || []}
      recurring={recurring || []}
      extras={extras || []}
      bookings={bookings}
      payments={payments || []}
    />
  )
}
