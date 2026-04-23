import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

const PRICE_MAP: Record<string, string> = {
  essencial: process.env.STRIPE_PRICE_ESSENCIAL!,
  plus: process.env.STRIPE_PRICE_PLUS!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
}

const checkoutSchema = z.object({
  plan: z.enum(['essencial', 'plus', 'premium']),
})

export async function POST(req: NextRequest) {
  try {
    console.log('Stripe API: Iniciando checkout')

    const body = await req.json()
    const validation = checkoutSchema.safeParse(body)

    if (!validation.success) {
      console.error('Stripe API: Validação falhou:', validation.error)
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    const { plan } = validation.data
    console.log('Stripe API: Plano solicitado:', plan)

    const checkoutUrl = PRICE_MAP[plan]
    console.log('Stripe API: URL do checkout:', checkoutUrl)

    if (!checkoutUrl) {
      console.error('Stripe API: Plano inválido:', plan)
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    // Para links de checkout diretos, apenas retornamos a URL
    console.log('Stripe API: Redirecionando para checkout:', checkoutUrl)
    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    console.error('Stripe API error:', err)
    return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 })
  }
}
