import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * O limite que vale de verdade vive no Postgres (função consume_rate_limit),
 * porque o middleware roda em várias instâncias e elas morrem sozinhas: um
 * contador em memória, como o que existia aqui, quase nunca atingia o teto e
 * ainda acumulava IPs até o processo reiniciar.
 *
 * O que sobra aqui é uma barreira de rajada por instância, para cortar excesso
 * óbvio sem pagar uma ida ao banco.
 */
const rajada = new Map<string, { count: number; resetTime: number }>()
const JANELA_MS = 10_000
const MAX_POR_JANELA = 40

/** Impede o Map de crescer sem fim quando muitos IPs passam por aqui. */
function limpar(agora: number) {
  if (rajada.size < 500) return
  for (const [ip, r] of rajada) {
    if (agora > r.resetTime) rajada.delete(ip)
  }
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next()

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'
  const agora = Date.now()
  limpar(agora)

  const registro = rajada.get(ip)
  if (!registro || agora > registro.resetTime) {
    rajada.set(ip, { count: 1, resetTime: agora + JANELA_MS })
    return NextResponse.next()
  }

  if (registro.count >= MAX_POR_JANELA) {
    return NextResponse.json(
      { error: 'Muitas requisições em pouco tempo. Aguarde alguns segundos.' },
      { status: 429, headers: { 'Retry-After': '10' } }
    )
  }

  registro.count++
  return NextResponse.next()
}

export const config = { matcher: '/api/:path*' }
