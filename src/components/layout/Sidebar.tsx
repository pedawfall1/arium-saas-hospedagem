'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Calendar, Settings2, BarChart2, LayoutDashboard, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TENANT_LINKS = [
  { href: '/dashboard',             label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/dashboard/reservas',     label: 'Reservas',     Icon: BookOpen },
  { href: '/dashboard/calendario',   label: 'Calendário',   Icon: Calendar },
  { href: '/dashboard/propriedades', label: 'Propriedades', Icon: Settings2 },
  { href: '/dashboard/relatorios',   label: 'Relatórios',   Icon: BarChart2 },
]

const ARIUM_LINKS = [
  { href: '/arium/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/arium/clientes',  label: 'Clientes',  Icon: Users },
]

interface SidebarProps {
  userName: string
  userEmail: string
  role: 'tenant' | 'arium'
  onNavClick?: () => void
}

export default function Sidebar({ userName, userEmail, role, onNavClick }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const links = role === 'arium' ? ARIUM_LINKS : TENANT_LINKS
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '20px 20px', borderBottom: '1px solid var(--border)',
        position: 'relative',
      }}>
        {/* Glow behind logo */}
        <div style={{
          position: 'absolute', left: '14px', top: '50%',
          transform: 'translateY(-50%)',
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <Image src="/images/logo.png" alt="Arium" width={36} height={36}
          style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'var(--text)', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>Arium</p>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '1px' }}>Hospedagens</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {links.map(({ href, label, Icon }) => {
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)
          
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onClick={onNavClick}
              onMouseEnter={() => setHoveredLink(href)}
              onMouseLeave={() => setHoveredLink(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '10px',
                textDecoration: 'none', transition: 'all 0.2s ease',
                backgroundColor: isActive
                  ? 'rgba(124,58,237,0.18)'
                  : hoveredLink === href
                    ? 'rgba(124,58,237,0.08)'
                    : 'transparent',
                color: isActive ? '#c084fc' : hoveredLink === href ? '#a78bfa' : 'var(--muted)',
                borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '15px',
                transform: hoveredLink === href && !isActive ? 'translateX(4px)' : 'translateX(0)',
                boxShadow: isActive ? '0 0 20px rgba(124,58,237,0.08)' : 'none',
              }}
            >
              {/* Icon with glow on active */}
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(124,58,237,0.2)' : 'transparent',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}>
                <Icon size={17} />
              </span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div style={{
        padding: '16px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Avatar with glow */}
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
            boxShadow: '0 0 12px rgba(124,58,237,0.4)',
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '11px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--muted)', fontSize: '12px', background: 'none',
          border: '1px solid var(--border)', borderRadius: '8px',
          padding: '7px 12px', cursor: 'pointer', transition: 'all 0.15s', width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <LogOut size={13} />
          Sair da conta
        </button>
      </div>

    </div>
  )
}
