'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

export default function AriumShell({ userEmail, children }: { userEmail: string, children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>

      <aside style={{
        width: '280px', minHeight: '100vh', position: 'fixed',
        top: 0, left: 0, zIndex: 40, display: 'none',
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--border)',
      }} className="md-sidebar">
        <Sidebar
          userName="Arium Admin"
          userEmail={userEmail}
          role="arium"
        />
      </aside>

      <div className="mobile-header" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        backgroundColor: 'var(--sidebar)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        height: '56px',
        display: 'none',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/images/logo.png" alt="Arium" width={28} height={28} style={{ objectFit: 'contain' }} />
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '16px' }}>Arium</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Arium Admin</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
              color: 'var(--muted)', display: 'flex', alignItems: 'center',
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

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
              userName="Arium Admin"
              userEmail={userEmail}
              role="arium"
              onNavClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}

      <main className="dashboard-main" style={{
        flex: 1,
        marginLeft: 0,
        minHeight: '100vh',
        paddingTop: '56px',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}>
        {children}
      </main>

    </div>
  )
}
