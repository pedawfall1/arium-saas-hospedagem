'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

export default function DashboardShell({ tenant, children }: { tenant: any, children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>

      {/* Sidebar — desktop only */}
      <aside style={{
        width: '280px', minHeight: '100vh', position: 'fixed',
        top: 0, left: 0, zIndex: 40, display: 'none',
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--border)',
      }} className="md-sidebar">
        <Sidebar
          userName={tenant.business_name}
          userEmail={tenant.email}
          role="tenant"
        />
      </aside>

      {/* Mobile header — only on small screens */}
      <div className="mobile-header" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        backgroundColor: 'var(--sidebar)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        height: '56px',
        display: 'none', // Overridden by media query
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <Image src="/images/logo.png" alt="Arium" width={32} height={32} style={{ objectFit: 'contain' }} />
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '18px' }}>Arium</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{tenant.business_name}</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px 10px', cursor: 'pointer',
              color: 'var(--muted)', display: 'flex', alignItems: 'center',
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 70,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '280px', zIndex: 80,
            backgroundColor: 'var(--sidebar)',
            borderRight: '1px solid var(--border)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
            overflowY: 'auto',
          }}>
            <Sidebar
              userName={tenant.business_name}
              userEmail={tenant.email}
              role="tenant"
              onNavClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main */}
      <main className="dashboard-main" style={{
        flex: 1,
        marginLeft: 0, // mobile: no left margin natively, md overrides
        minHeight: '100vh',
        paddingTop: '56px', // space for mobile header
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}>
        {children}
      </main>

    </div>
  )
}
