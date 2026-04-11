'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Visual states
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    // Check if arium admin
    console.log('admin email env:', process.env.NEXT_PUBLIC_ARIUM_ADMIN_EMAIL)
    const isAdmin = email.trim().toLowerCase() === (process.env.NEXT_PUBLIC_ARIUM_ADMIN_EMAIL ?? '').trim().toLowerCase()
    router.push(isAdmin ? '/arium/dashboard' : '/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      position: 'relative', zIndex: 1,
      backgroundColor: 'transparent',
    }}>
      <style suppressHydrationWarning>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%', maxWidth: '420px',
          backgroundColor: 'rgba(15, 15, 32, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '24px',
          padding: '48px 40px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `
            0 0 0 1px rgba(168,85,247,0.08),
            0 20px 60px rgba(0,0,0,0.6),
            0 0 100px rgba(124,58,237,0.08),
            inset 0 1px 0 rgba(255,255,255,0.06)
          `,
        }}
      >
        {/* Top light streak */}
        <div style={{
          position: 'absolute', top: 0, left: '-10%', right: '-10%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(196,132,252,0.8), rgba(255,255,255,0.4), rgba(196,132,252,0.8), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Inner top glow */}
        <div style={{
          position: 'absolute', top: '-60px', left: '50%',
          transform: 'translateX(-50%)',
          width: '280px', height: '120px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Shimmer sweep on mount */}
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '200%', opacity: [0, 0.2, 0] }}
          transition={{ duration: 1.4, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%',
            background: 'linear-gradient(105deg, transparent, rgba(168,85,247,0.1), transparent)',
            pointerEvents: 'none', zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
            style={{ textAlign: 'center', marginBottom: '32px' }}
          >
            {/* Glow ring behind logo */}
            <div style={{
              position: 'relative', display: 'inline-block', marginBottom: '16px',
            }}>
              <div style={{
                position: 'absolute', inset: '-8px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
              }} />
              <Image src="/images/logo.png" alt="Arium" width={56} height={56}
                style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }} />
            </div>
            <h1 style={{ color: '#f1f0ff', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>
              Arium
            </h1>
            <p style={{ color: 'rgba(241,240,255,0.45)', fontSize: '13px' }}>
              Painel de Hospedagens
            </p>
          </motion.div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                E-mail
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)}
                required placeholder="seu@email.com"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
                  backgroundColor: 'rgba(8,8,15,0.6)',
                  border: focusedInput === 'email' ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(168,85,247,0.15)',
                  color: '#f1f0ff', outline: 'none', transition: 'all 0.2s ease',
                  boxShadow: focusedInput === 'email' ? '0 0 0 3px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.04)'
                }}
              />
            </div>

            <div>
              <label style={{ color: 'var(--muted)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Senha
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)}
                required placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
                  backgroundColor: 'rgba(8,8,15,0.6)',
                  border: focusedInput === 'password' ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(168,85,247,0.15)',
                  color: '#f1f0ff', outline: 'none', transition: 'all 0.2s ease',
                  boxShadow: focusedInput === 'password' ? '0 0 0 3px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.04)'
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#f87171', fontSize: '13px', textAlign: 'center' }}>{error}</p>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              style={{
                width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                color: 'white', fontSize: '15px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px', letterSpacing: '0.2px',
                transition: 'all 0.2s ease',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 6px 28px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.35)'; e.currentTarget.style.transform = 'translateY(0)' } }}
            >
              {loading ? (
                <div style={{
                  width: '20px', height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : 'Entrar'}
            </button>
          </form>
          
          <p style={{ textAlign: 'center', color: 'rgba(241,240,255,0.2)', fontSize: '11px', marginTop: '28px', letterSpacing: '0.5px' }}>
            Powered by Arium
          </p>
        </div>
      </motion.div>
    </div>
  )
}
