import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permitir, respostaLimite } from '@/lib/rateLimit'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://api.arium-ia.cloud'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

/** Placeholder gravado pela reserva manual quando a dona não informa o telefone. */
const PLACEHOLDER_PHONE = '00000000000'

/** Normaliza para o formato que a Evolution espera: DDI + DDD + número, só dígitos. */
function toWhatsAppNumber(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits || digits === PLACEHOLDER_PHONE) return null
  if (digits.startsWith('55')) return digits.length >= 12 && digits.length <= 13 ? digits : null
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return null
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function buildMessage(booking: any, businessName: string): string {
  const property = booking.properties
  const lines: string[] = []

  lines.push(`Olá, ${booking.guest_name}! 🌿`)
  lines.push('')
  lines.push(`Sua reserva na *${property?.name ?? 'cabana'}* está *confirmada*! ✅`)
  lines.push('')
  lines.push(`📅 Check-in: ${formatDateBR(booking.check_in)}${property?.checkin_time ? ` a partir das ${String(property.checkin_time).slice(0, 5)}` : ''}`)
  lines.push(`📅 Check-out: ${formatDateBR(booking.check_out)}${property?.checkout_time ? ` até as ${String(property.checkout_time).slice(0, 5)}` : ''}`)
  lines.push(`👥 Hóspedes: ${booking.guests_count}`)
  lines.push(`💰 Valor total: ${formatBRL(Number(booking.total_amount))}`)

  const deposit = Number(booking.deposit_amount) || 0
  const remaining = Number(booking.total_amount) - deposit
  if (deposit > 0) {
    lines.push(`✅ Sinal recebido: ${formatBRL(deposit)}`)
    if (remaining > 0) {
      lines.push(`💵 Restante no check-in: ${formatBRL(remaining)}`)
    }
  }

  lines.push('')
  lines.push(`Qualquer dúvida é só chamar por aqui. Até breve! 💚`)
  lines.push(`_${businessName}_`)

  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Envio de WhatsApp custa e vai para fora: limite por usuário, não por IP.
    if (!(await permitir(`whatsapp:${user.id}`, 20, 60))) return respostaLimite()

    const body = await req.json().catch(() => ({}))
    const bookingId = body.bookingId

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId é obrigatório' }, { status: 400 })
    }

    const { data: tenant } = await supabase
      .from('saas_reserva_tenants')
      .select('id, business_name, whatsapp_instance_name, whatsapp_status')
      .eq('auth_user_id', user.id)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // A reserva precisa ser de uma propriedade deste tenant (o !inner + filtro garante isso).
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, properties!inner(name, tenant_id, checkin_time, checkout_time)')
      .eq('id', bookingId)
      .eq('properties.tenant_id', tenant.id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })

    const number = toWhatsAppNumber(booking.guest_phone)
    if (!number) {
      return NextResponse.json(
        { error: 'Esta reserva não tem um telefone válido para envio.', code: 'invalid_phone' },
        { status: 422 }
      )
    }

    if (!tenant.whatsapp_instance_name) {
      return NextResponse.json(
        { error: 'WhatsApp não está conectado no painel.', code: 'not_connected' },
        { status: 409 }
      )
    }

    const sendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${tenant.whatsapp_instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY as string,
      },
      body: JSON.stringify({
        number,
        text: buildMessage(booking, tenant.business_name),
      }),
    })

    if (!sendRes.ok) {
      const errorText = await sendRes.text()
      console.error('Falha ao enviar WhatsApp pela Evolution API:', sendRes.status, errorText)
      return NextResponse.json(
        { error: 'Não foi possível enviar a mensagem pelo WhatsApp.', code: 'send_failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({ sent: true, number })
  } catch (error: any) {
    console.error('WhatsApp notify-confirmation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
