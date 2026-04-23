import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anonymous'
    const now = Date.now()
    const windowMs = 60 * 1000
    const maxRequests = 60 // SaaS pode ter mais requests legítimos
    const record = rateLimit.get(ip)
    if (!record || now > record.resetTime) {
      rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
    } else if (record.count >= maxRequests) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    } else {
      record.count++
    }
  }
  return NextResponse.next()
}

export const config = { matcher: '/api/:path*' }
