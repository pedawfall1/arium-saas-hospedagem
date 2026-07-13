import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://api.arium-ia.cloud'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const requestedTenantId = body.tenantId

    let targetTenantId: string

    if (requestedTenantId) {
      // Must be admin
      const isAdmin = user.email?.trim().toLowerCase() === (process.env.ARIUM_ADMIN_EMAIL ?? '').trim().toLowerCase()
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      targetTenantId = requestedTenantId
    } else {
      // Get user's own tenant
      const { data: tenantRow } = await supabase
        .from('saas_reserva_tenants')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (!tenantRow) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      targetTenantId = tenantRow.id
    }

    const { data: tenant } = await supabase
      .from('saas_reserva_tenants')
      .select('id, whatsapp_instance_name')
      .eq('id', targetTenantId)
      .single()

    if (!tenant || !tenant.whatsapp_instance_name) {
      return NextResponse.json({ error: 'No instance to disconnect' }, { status: 400 })
    }

    // Call logout in Evolution API
    const logoutRes = await fetch(`${EVOLUTION_API_URL}/instance/logout/${tenant.whatsapp_instance_name}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY as string
      }
    })

    if (!logoutRes.ok) {
      const errorText = await logoutRes.text()
      console.error('Failed to logout instance in Evolution API:', errorText)
      // Even if Evolution fails (e.g. already disconnected), we update our DB status to be safe
    }

    // Update DB
    await supabase
      .from('saas_reserva_tenants')
      .update({ whatsapp_status: 'disconnected' })
      .eq('id', targetTenantId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('WhatsApp disconnect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
