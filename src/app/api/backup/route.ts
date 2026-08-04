import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permitir, respostaLimite } from '@/lib/rateLimit'

/**
 * Backup completo dos dados da pousada.
 *
 * Roda no servidor com a sessão da própria dona, então o RLS já garante que só
 * saem os dados dela. Devolve um JSON único com tudo, para ela nunca ficar
 * refém do sistema — se um dia quiser sair, leva os dados.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Gerar backup é caro; poucas vezes por hora basta.
    if (!(await permitir(`backup:${user.id}`, 5, 3600))) return respostaLimite()

    const { data: tenant } = await supabase
      .from('saas_reserva_tenants')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { data: properties } = await supabase
      .from('properties').select('*').eq('tenant_id', tenant.id)

    const propertyIds = (properties || []).map(p => p.id)
    const vazio = { data: [] as any[] }

    const [
      { data: bookings }, { data: blockedDates }, { data: holidays },
      { data: amenities }, { data: pricingRules }, { data: propertyImages },
      { data: expenses }, { data: expenseCategories }, { data: recurringExpenses },
      { data: extraRevenues }, { data: bookingPayments }, { data: extras }, { data: pacotes },
    ] = await Promise.all([
      propertyIds.length ? supabase.from('bookings').select('*').in('property_id', propertyIds) : vazio,
      propertyIds.length ? supabase.from('blocked_dates').select('*').in('property_id', propertyIds) : vazio,
      propertyIds.length ? supabase.from('holidays').select('*').in('property_id', propertyIds) : vazio,
      propertyIds.length ? supabase.from('amenities').select('*').in('property_id', propertyIds) : vazio,
      propertyIds.length ? supabase.from('pricing_rules').select('*').in('property_id', propertyIds) : vazio,
      propertyIds.length ? supabase.from('property_images').select('*').in('property_id', propertyIds) : vazio,
      supabase.from('expenses').select('*').eq('tenant_id', tenant.id),
      supabase.from('expense_categories').select('*').eq('tenant_id', tenant.id),
      supabase.from('recurring_expenses').select('*').eq('tenant_id', tenant.id),
      supabase.from('extra_revenues').select('*').eq('tenant_id', tenant.id),
      supabase.from('booking_payments').select('*').eq('tenant_id', tenant.id),
      supabase.from('extras').select('*').eq('tenant_id', tenant.id),
      supabase.from('romantic_packages').select('*').eq('tenant_id', tenant.id),
    ])

    // Nada de chaves e tokens dentro do arquivo que a dona guarda no computador.
    const { whatsapp_instance_token, ...tenantSeguro } = tenant as any

    const backup = {
      gerado_em: new Date().toISOString(),
      versao: 1,
      pousada: tenantSeguro,
      cabanas: properties || [],
      reservas: bookings || [],
      recebimentos: bookingPayments || [],
      datas_bloqueadas: blockedDates || [],
      feriados: holidays || [],
      comodidades: amenities || [],
      regras_de_preco: pricingRules || [],
      imagens: propertyImages || [],
      gastos: expenses || [],
      categorias_de_gasto: expenseCategories || [],
      despesas_fixas: recurringExpenses || [],
      receitas_extras: extraRevenues || [],
      itens_extras: extras || [],
      pacotes: pacotes || [],
    }

    const totais = Object.fromEntries(
      Object.entries(backup)
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => [k, (v as any[]).length])
    )

    const nome = String(tenant.business_name || 'pousada')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
    const arquivo = `backup_${nome}_${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify({ ...backup, _totais: totais }, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${arquivo}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar backup:', error)
    return NextResponse.json({ error: 'Não foi possível gerar o backup agora.' }, { status: 500 })
  }
}
