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
    .select('id, name, slug, base_price_weekday, base_price_weekend, base_price_sunday, single_night_weekday_price, low_season_weekday, low_season_weekend, low_season_from_month, low_season_to_month, min_nights_weekday, min_nights_weekend')
    .eq('tenant_id', tenant.id)

  const propertyIds = (properties || []).map(p => p.id)

  let bookings: any[] = []
  let allBookings: any[] = []
  let blockedDates: any[] = []
  let holidays: any[] = []
  let dailyRates: any[] = []
  let pricingRules: any[] = []

  if (propertyIds.length > 0) {
    // O calendário navega mês a mês; carregar o histórico inteiro só para
    // desenhar um mês fica caro conforme a base cresce. Uma janela de 1 ano
    // para trás e 2 anos para frente cobre qualquer navegação real.
    const hoje = new Date()
    const de = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1).toISOString().slice(0, 10)
    const ate = new Date(hoje.getFullYear() + 2, hoje.getMonth(), 1).toISOString().slice(0, 10)

    // Uma consulta só. Antes a tabela de reservas era lida DUAS vezes na mesma
    // tela: uma filtrada por status e outra completa. Agora filtramos aqui.
    const [{ data: allBookingsRes }, { data: blocksRes }, { data: holidaysRes }, { data: dailyRes }, { data: rulesRes }] = await Promise.all([
      supabase.from('bookings').select('*')
        .in('property_id', propertyIds)
        .gte('check_out', de)
        .lte('check_in', ate),
      supabase.from('blocked_dates').select('*')
        .in('property_id', propertyIds)
        .gte('date', de)
        .lte('date', ate),
      supabase.from('holidays').select('*').in('property_id', propertyIds).order('date_from'),
      // Preço exibido por dia precisa das mesmas fontes que calculate_price usa.
      supabase.from('daily_rates').select('property_id, date, price, min_nights')
        .in('property_id', propertyIds)
        .gte('date', de)
        .lte('date', ate),
      supabase.from('pricing_rules').select('property_id, valid_from, valid_until, price')
        .in('property_id', propertyIds)
        .gte('valid_until', de)
        .lte('valid_from', ate),
    ])

    allBookings = allBookingsRes || []
    bookings = allBookings.filter(b => ['confirmed', 'checked_in', 'completed'].includes(b.status))
    blockedDates = blocksRes || []
    holidays = holidaysRes || []
    dailyRates = dailyRes || []
    pricingRules = rulesRes || []
  }

  return (
    <CalendarioClient
      properties={properties || []}
      bookings={bookings}
      allBookings={allBookings}
      blockedDates={blockedDates}
      holidays={holidays}
      dailyRates={dailyRates}
      pricingRules={pricingRules}
      tenantName={tenant.business_name}
    />
  )
}
