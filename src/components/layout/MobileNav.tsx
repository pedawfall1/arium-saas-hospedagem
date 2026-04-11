"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, BookOpen, Calendar, Settings2, BarChart2 } from "lucide-react"

const ARIUM_LINKS = [
  { href: '/arium/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/arium/clientes', label: 'Clientes', icon: Users },
]

const TENANT_LINKS = [
  { href: '/dashboard/reservas', label: 'Reservas', icon: BookOpen },
  { href: '/dashboard/calendario', label: 'Calendário', icon: Calendar },
  { href: '/dashboard/propriedades', label: 'Propriedades', icon: Settings2 },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart2 },
]

export function MobileNav({ role }: { role: "arium" | "tenant" }) {
  const pathname = usePathname()
  const links = role === 'arium' ? ARIUM_LINKS : TENANT_LINKS

  return (
    <div 
      className="md:hidden fixed bottom-0 left-0 z-50 flex h-16 w-full"
      style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
    >
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
            style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }}
          >
            <link.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
