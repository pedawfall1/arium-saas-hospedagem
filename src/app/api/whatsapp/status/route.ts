import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://api.arium-ia.cloud'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const requestedTenantId = searchParams.get('tenantId')

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
      .select('id, whatsapp_instance_name, whatsapp_status')
      .eq('id', targetTenantId)
      .single()

    if (!tenant || !tenant.whatsapp_instance_name) {
      return NextResponse.json({ status: 'disconnected', message: 'No instance' })
    }

    // Check status in Evolution API
    const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${tenant.whatsapp_instance_name}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY as string
      }
    })

    if (!statusRes.ok) {
      const errorText = await statusRes.text()
      console.error('Failed to get status from Evolution API:', errorText)
      return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
    }

    const statusData = await statusRes.json()
    // Evolution v2 status usually returns { instance: { state: "open" } } or { state: "open" }
    const state = statusData?.instance?.state || statusData?.state || 'close'
    const newStatus = (state === 'open' || state === 'connected') ? 'connected' : 'disconnected'

    // Update DB if changed
    if (tenant.whatsapp_status !== newStatus) {
      const updateData: any = { whatsapp_status: newStatus }
      if (newStatus === 'connected') {
        updateData.whatsapp_connected_at = new Date().toISOString()
      }
      await supabase
        .from('saas_reserva_tenants')
        .update(updateData)
        .eq('id', targetTenantId)
    }

    return NextResponse.json({ status: newStatus, rawState: state })
  } catch (error: any) {
    console.error('WhatsApp status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
