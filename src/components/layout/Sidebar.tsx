'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Calendar, Tag, BarChart2, Home, Users, LogOut, MessageCircle, Wallet, Sun, Moon, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Item = { href: string, label: string, Icon: typeof Home }

const TENANT_GRUPOS: { titulo: string, itens: Item[] }[] = [
  { titulo: 'Dia a dia', itens: [
    { href: '/dashboard',            label: 'Início',     Icon: Home },
    { href: '/dashboard/hoje',       label: 'Hoje',       Icon: Sun },
    { href: '/dashboard/reservas',   label: 'Reservas',   Icon: BookOpen },
    { href: '/dashboard/calendario', label: 'Calendário', Icon: Calendar },
  ] },
  { titulo: 'Gestão', itens: [
    { href: '/dashboard/propriedades', label: 'Cabanas e preços', Icon: Tag },
    { href: '/dashboard/financeiro',   label: 'Financeiro',       Icon: Wallet },
    { href: '/dashboard/relatorios',   label: 'Relatórios',       Icon: BarChart2 },
  ] },
  { titulo: 'Comunicação', itens: [
    { href: '/dashboard/whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  ] },
]

const ARIUM_GRUPOS: { titulo: string, itens: Item[] }[] = [
  { titulo: 'Arium', itens: [
    { href: '/arium/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/arium/clientes',  label: 'Clientes',  Icon: Users },
    { href: '/arium/whatsapp',  label: 'WhatsApp',  Icon: MessageCircle },
  ] },
]

interface SidebarProps {
  userName: string
  userEmail: string
  role: 'tenant' | 'arium'
  onNavClick?: () => void
  /** Quando informado, o botão de tema aparece no rodapé. */
  theme?: 'dark' | 'light'
  onToggleTheme?: () => void
}

export default function Sidebar({ userName, userEmail, role, onNavClick, theme, onToggleTheme }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const grupos = role === 'arium' ? ARIUM_GRUPOS : TENANT_GRUPOS
  const raiz = role === 'arium' ? '/arium/dashboard' : '/dashboard'

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="sb">
      <style>{CSS_SIDEBAR}</style>

      {/* Marca */}
      <Link href={raiz} onClick={onNavClick} className="sb-marca">
        <Image src="/images/logo.png" alt="Arium" width={34} height={34} style={{ objectFit: 'contain' }} />
        <span>
          <strong>Arium</strong>
          <small>Hospedagens</small>
        </span>
      </Link>

      {/* Navegação */}
      <nav className="sb-nav" aria-label="Menu principal">
        {grupos.map(g => (
          <div key={g.titulo} className="sb-grupo">
            {grupos.length > 1 && <p className="sb-grupo-titulo">{g.titulo}</p>}
            {g.itens.map(({ href, label, Icon }) => {
              const ativo = href === raiz ? pathname === raiz : pathname.startsWith(href)
              return (
                <Link
                  key={href} href={href} prefetch onClick={onNavClick}
                  className={`sb-item${ativo ? ' ativo' : ''}`}
                  aria-current={ativo ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Conta */}
      <div className="sb-conta">
        <div className="sb-usuario">
          <span className="sb-avatar">{userName.charAt(0).toUpperCase()}</span>
          <span style={{ minWidth: 0 }}>
            <strong>{userName}</strong>
            <small>{userEmail}</small>
          </span>
        </div>
        <div className="sb-botoes">
          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme} className="sb-botao" title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            </button>
          )}
          <button type="button" onClick={handleLogout} className="sb-botao sb-sair">
            <LogOut size={15} /> Sair
          </button>
        </div>
      </div>
    </div>
  )
}

const CSS_SIDEBAR = `
.sb { display: flex; flex-direction: column; height: 100%; width: 100%; }
.sb-marca { display: flex; align-items: center; gap: 12px; padding: 22px 22px 18px; text-decoration: none; }
.sb-marca strong { display: block; color: var(--text); font-size: 17px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2; }
.sb-marca small { display: block; color: var(--muted); font-size: 11px; }
.sb-nav { flex: 1; padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }
.sb-grupo { display: flex; flex-direction: column; gap: 2px; }
.sb-grupo-titulo { padding: 0 12px 6px; color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.75; }
.sb-item { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 12px; border-radius: 10px; text-decoration: none; color: var(--muted); font-size: 14px; font-weight: 500; transition: background-color 0.15s, color 0.15s; }
.sb-item svg { flex-shrink: 0; opacity: 0.85; }
.sb-item:hover { background-color: rgba(124,58,237,0.08); color: var(--text); }
.sb-item.ativo { background-color: rgba(124,58,237,0.16); color: var(--text); font-weight: 600; }
.sb-item.ativo svg { color: var(--accent); opacity: 1; }
.sb-conta { padding: 14px 16px 18px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
.sb-usuario { display: flex; align-items: center; gap: 10px; padding: 0 4px; }
.sb-usuario strong { display: block; color: var(--text); font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-usuario small { display: block; color: var(--muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-avatar { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background-color: var(--purple); color: #fff; font-size: 14px; font-weight: 700; }
.sb-botoes { display: flex; gap: 8px; }
.sb-botao { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 10px; border-radius: 9px; border: 1px solid var(--field-border); background: transparent; color: var(--muted); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.sb-botao:hover { color: var(--text); border-color: var(--field-border-hover); }
.sb-sair:hover { color: var(--danger); border-color: rgba(248,113,113,0.4); }
`
