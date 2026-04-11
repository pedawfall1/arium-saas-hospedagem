import { createClient } from "@/lib/supabase/server"
import { PropriedadesClient } from "./PropriedadesClient"

export default async function PropriedadesPage() {
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
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at')

  const propertyIds = (properties || []).map(p => p.id)

  let rules: any[] = []
  let blocks: any[] = []

  if (propertyIds.length > 0) {
    const { data: rulesData } = await supabase
      .from('pricing_rules')
      .select('*')
      .in('property_id', propertyIds)
    rules = rulesData || []

    const { data: blocksData } = await supabase
      .from('blocked_dates')
      .select('*')
      .in('property_id', propertyIds)
    blocks = blocksData || []
  }

  return (
    <PropriedadesClient 
      initialProperties={properties || []}
      tenantName={tenant.business_name}
      initialRules={rules}
      initialBlocks={blocks}
    />
  )
}
