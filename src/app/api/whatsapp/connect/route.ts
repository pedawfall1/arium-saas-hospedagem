import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://api.arium-ia.cloud'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function POST(req: NextRequest) {
  try {
    const maskedKey = EVOLUTION_API_KEY 
      ? `${EVOLUTION_API_KEY.slice(0, 4)}...${EVOLUTION_API_KEY.slice(-4)}` 
      : 'UNDEFINED';
    console.log('EVOLUTION_API_KEY mascarada:', maskedKey);

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

    // Get tenant data
    const { data: tenant } = await supabase
      .from('saas_reserva_tenants')
      .select('id, whatsapp_instance_name, whatsapp_instance_token')
      .eq('id', targetTenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    let instanceName = tenant.whatsapp_instance_name

    // If instance doesn't exist in DB, create it
    if (!instanceName) {
      instanceName = `tenant-${tenant.id}`
      const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY as string
        },
        body: JSON.stringify({
          instanceName,
          qrcode: false,
        })
      })

      if (!createRes.ok) {
        const errorText = await createRes.text()
        console.error('Failed to create instance in Evolution API:', errorText)
        return NextResponse.json({ error: 'Failed to create instance' }, { status: 500 })
      }

      const createData = await createRes.json()
      const generatedToken = createData?.hash?.apikey || createData?.instance?.token || createData?.token || 'unknown_token'

      // Save to Supabase
      await supabase
        .from('saas_reserva_tenants')
        .update({
          whatsapp_instance_name: instanceName,
          whatsapp_instance_token: generatedToken
        })
        .eq('id', targetTenantId)
    }

    // Fetch/Renew QR code
    const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY as string
      }
    })

    if (!connectRes.ok) {
      const errorText = await connectRes.text()
      console.error('Failed to fetch QR code from Evolution API:', errorText)
      return NextResponse.json({ error: 'Failed to fetch QR code' }, { status: 500 })
    }

    const connectData = await connectRes.json()
    const base64Qr = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode

    return NextResponse.json({ qrCode: base64Qr, status: 'awaiting_scan' })
  } catch (error: any) {
    console.error('WhatsApp connect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
