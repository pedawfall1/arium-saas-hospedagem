'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PlanButton from '@/components/PlanButton'

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* 1. NAVBAR */}
      {isMobile ? (
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          backgroundColor: 'rgba(8,8,15,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
          padding: '0 16px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image src="/images/logo.png" alt="Arium Logo" width={24} height={24} style={{ borderRadius: '6px' }} />
            <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '-0.5px' }}>Arium</span>
            <span style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: 'var(--accent)', borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: 600 }}>Hospedagens</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
            }}
          >
            {mobileMenuOpen ? '×' : '·'}
          </button>
          {mobileMenuOpen && (
            <div style={{
              position: 'absolute', top: '64px', left: 0, right: 0,
              backgroundColor: 'rgba(8,8,15,0.98)',
              backdropFilter: 'blur(24px)',
              borderBottom: '1px solid rgba(124,58,237,0.2)',
              padding: '20px 16px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <a href="#como-funciona" className="landing-nav-link" style={{ fontSize: '16px', padding: '8px 0' }} onClick={() => setMobileMenuOpen(false)}>Como funciona</a>
              <a href="#planos" className="landing-nav-link" style={{ fontSize: '16px', padding: '8px 0' }} onClick={() => setMobileMenuOpen(false)}>Planos</a>
              <a href="#contato" className="landing-nav-link" style={{ fontSize: '16px', padding: '8px 0' }} onClick={() => setMobileMenuOpen(false)}>Contato</a>
              <Link href="/login" style={{ backgroundColor: 'var(--purple)', color: 'white', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, textAlign: 'center', display: 'block' }}>
                Acessar painel
              </Link>
            </div>
          )}
        </nav>
      ) : (
        <nav style={{
          position: 'fixed', top: '16px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          backgroundColor: 'rgba(8,8,15,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: '999px',
          padding: '0 24px',
          height: '56px',
          display: 'flex', alignItems: 'center', gap: '40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          width: 'auto',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image src="/images/logo.png" alt="Arium Logo" width={28} height={28} style={{ borderRadius: '6px' }} />
            <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.5px' }}>Arium</span>
            <span style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: 'var(--accent)', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: 600 }}>Hospedagens</span>
          </div>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#como-funciona" className="landing-nav-link">Como funciona</a>
            <a href="#planos" className="landing-nav-link">Planos</a>
            <a href="#contato" className="landing-nav-link">Contato</a>
          </div>
          <Link href="/login" style={{ backgroundColor: 'var(--purple)', color: 'white', borderRadius: '999px', padding: '8px 20px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Acessar painel
          </Link>
        </nav>
      )}

      {/* 2. HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: isMobile ? '100px 16px 60px' : '120px 24px 80px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isMobile ? '400px' : '700px', 
          height: isMobile ? '200px' : '350px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '999px', padding: '6px 16px', fontSize: '13px', color: 'var(--accent)', marginBottom: '32px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
            Sistema de reservas para pousadas e cabanas
          </div>
          <h1 style={{ fontSize: isMobile ? 'clamp(28px, 8vw, 48px)' : 'clamp(42px, 7vw, 80px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '24px' }}>
            Seu hóspede reserva online.<br />
            <span style={{ color: 'var(--accent)' }}>Você só recebe.</span>
          </h1>
          <p style={{ fontSize: isMobile ? '16px' : '18px', color: 'var(--muted)', maxWidth: isMobile ? '100%' : '600px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            Site de reservas profissional + painel de gestão + notificações automáticas no WhatsApp. Para pousadas e cabanas em Santa Catarina.
          </p>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
            <a href="https://wa.me/5549999317620?text=Olá! Quero saber mais sobre o sistema de reservas para minha pousada." target="_blank" rel="noopener noreferrer" style={{ backgroundColor: 'var(--purple)', color: 'white', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', transition: 'background-color 0.2s' }}>
              Quero o meu sistema
            </a>
            <a href="#como-funciona" style={{ border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', transition: 'background-color 0.2s' }}>
              Ver como funciona
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? '12px' : '24px', justifyContent: 'center', marginTop: '24px' }}>
            {['Sem contrato longo', 'Ativo em 7 dias', 'Suporte via WhatsApp'].map((badge, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {i > 0 && !isMobile && <span style={{ color: 'var(--border)', fontSize: '18px' }}>|</span>}
                <span style={{ color: 'var(--muted)', fontSize: isMobile ? '12px' : '14px' }}>
                  <span style={{ color: 'var(--accent)', marginRight: '6px' }}>{'\u2713'}</span>{badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. COMO FUNCIONA */}
      <section id="como-funciona" style={{ padding: isMobile ? '60px 16px' : '100px 48px', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>Como funciona</p>
        <h2 style={{ fontSize: isMobile ? '24px' : 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: 'var(--text)', marginBottom: '60px', textAlign: 'center' }}>
          Do cadastro ao<br /><span style={{ color: 'var(--accent)' }}>primeiro hóspede.</span>
        </h2>
        <div className="landing-steps" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: isMobile ? '16px' : '24px' }}>
          {[
            { title: 'Cadastro', desc: 'Você se cadastra, a gente configura seu site personalizado em até 7 dias úteis.', icon: 'rocket' },
            { title: 'Site online', desc: 'Seu site de reservas no ar com sua identidade visual, preços e fotos da sua pousada.', icon: 'globe' },
            { title: 'Hóspede reserva', desc: 'O cliente escolhe as datas, preenche os dados e paga o sinal direto pelo site.', icon: 'credit-card' },
            { title: 'Você é avisado', desc: 'Recebe confirmação automática no WhatsApp com nome, datas e valor pago.', icon: 'phone' },
          ].map((step, i) => (
            <div key={i} className="landing-step-card">
              <span style={{ position: 'absolute', bottom: '16px', right: '20px', fontSize: '64px', fontWeight: 900, color: 'rgba(124,58,237,0.06)', lineHeight: 1, userSelect: 'none' }}>{i + 1}</span>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '16px' }}>{step.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>{step.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PLANOS */}
      <section id="planos" style={{ padding: isMobile ? '60px 16px' : '100px 48px', backgroundColor: 'rgba(124,58,237,0.03)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>Planos</p>
        <h2 style={{ fontSize: isMobile ? '24px' : 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: 'var(--text)', marginBottom: '60px', textAlign: 'center' }}>
          Para todo tipo de<br /><span style={{ color: 'var(--accent)' }}>pousada ou cabana.</span>
        </h2>
        <div className="landing-plans" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '16px' : '24px', maxWidth: '900px', margin: '0 auto' }}>
          {/* Essencial */}
          <div className="landing-plan-card" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #7c3aed', borderRadius: '16px', padding: isMobile ? '24px' : '32px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Essencial</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Até 1 cabana/quarto</p>
            <div style={{ marginBottom: '32px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: 'var(--accent)' }}>R$ 197</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mês</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
              {['Site de reservas', 'Painel de gestão', 'Notificações WhatsApp', 'Calendário de disponibilidade', 'Aceita Mercado Pago'].map((feat, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>
                  <span style={{ color: '#22c55e' }}>{'\u2713'}</span> {feat}
                </li>
              ))}
            </ul>
            <PlanButton plan="essencial" label="Quero esse plano" />
          </div>

          {/* Plus */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(249,115,0,0.4)', borderTop: '3px solid #f97b00', borderRadius: '16px', padding: isMobile ? '24px' : '32px', display: 'flex', flexDirection: 'column', position: 'relative', transform: isMobile ? 'scale(1)' : 'scale(1.05)', zIndex: 10, boxShadow: isMobile ? '0 4px 20px rgba(124,58,237,0.15)' : '0 20px 60px rgba(124,58,237,0.2)' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#f97b00', color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 16px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
              MAIS POPULAR
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Plus</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>2 ou mais cabanas/quartos</p>
            <div style={{ marginBottom: '32px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: 'var(--accent)' }}>R$ 249</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mês</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                <span style={{ color: '#22c55e' }}>{'\u2713'}</span> Tudo do plano Essencial +
              </li>
              {['Múltiplas propriedades'].map((feat, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>
                  <span style={{ color: '#22c55e' }}>{'\u2713'}</span> {feat}
                </li>
              ))}
            </ul>
            <PlanButton plan="plus" label="Quero esse plano" />
          </div>

          {/* Premium */}
          <div className="landing-plan-card" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #22c55e', borderRadius: '16px', padding: isMobile ? '24px' : '32px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Premium</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>A experiência completa</p>
            <div style={{ marginBottom: '32px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: 'var(--accent)' }}>R$ 297</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mês</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                <span style={{ color: '#22c55e' }}>{'\u2713'}</span> Tudo do plano Plus +
              </li>
              {['App de check-in para hóspede'].map((feat, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>
                  <span style={{ color: '#22c55e' }}>{'\u2713'}</span> {feat}
                </li>
              ))}
            </ul>
            <PlanButton plan="premium" label="Quero esse plano" />
          </div>
        </div>
      </section>

      {/* 5. CASO REAL */}
      <section style={{ padding: isMobile ? '60px 16px' : '100px 48px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '40px' }}>Caso de Sucesso</p>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--purple)', borderRadius: '16px', padding: isMobile ? '24px' : '40px 48px', textAlign: 'left', marginBottom: '48px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '20px', left: '28px', fontSize: '80px', color: 'rgba(124,58,237,0.15)', fontFamily: 'Georgia, serif', lineHeight: 1 }}>
          </span>
          <p style={{ fontSize: isMobile ? '18px' : '20px', color: 'var(--text)', lineHeight: 1.8, marginBottom: '24px', fontStyle: 'italic', paddingLeft: '24px' }}>
            "Antes os hóspedes ligavam pra reservar e eu perdia tempo confirmando tudo manualmente. Agora o site faz isso sozinho - o cliente paga o sinal online e eu recebo o WhatsApp confirmando. Simples assim."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #046C62, #0a9e8f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '18px' }}>C</div>
            <div>
              <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '16px', margin: 0 }}>Cabanas Doce Encanto</p>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>Salto Veloso, SC - Cliente desde 2026</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: isMobile ? '12px' : '32px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '999px', padding: '8px 20px', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>+R$ 0 em taxa de setup</div>
          <div style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '999px', padding: '8px 20px', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>7 dias para ir ao ar</div>
          <div style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '999px', padding: '8px 20px', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>100% online</div>
        </div>
      </section>

      {/* 6. CTA FINAL */}
      <section id="contato" style={{ padding: isMobile ? '60px 16px' : '100px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? '400px' : '600px', height: isMobile ? '200px' : '300px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: isMobile ? '100px' : '200px', height: isMobile ? '100px' : '200px', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: isMobile ? '80px' : '150px', height: isMobile ? '80px' : '150px', background: 'radial-gradient(circle, rgba(124,58,237,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h2 style={{ fontSize: isMobile ? '28px' : 'clamp(28px, 4vw, 52px)', fontWeight: 800, color: 'var(--text)', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
          Pronto pra receber<br /><span style={{ color: 'var(--accent)' }}>reservas online?</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: isMobile ? '16px' : '17px', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
          Fala com a gente no WhatsApp. A gente explica tudo e coloca seu sistema no ar.
        </p>
        <a href="https://wa.me/5549999317620?text=Olá! Quero saber mais sobre o sistema de reservas para minha pousada." target="_blank" rel="noopener noreferrer" className="landing-wpp-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', backgroundColor: '#25d366', color: 'white', borderRadius: '12px', padding: '16px 36px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', position: 'relative', zIndex: 1, boxShadow: '0 8px 32px rgba(37,211,102,0.3)', transition: 'all 0.2s ease' }}>
          {'\ud83d\udcac'} Falar no WhatsApp
        </a>
      </section>

      {/* 7. FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: isMobile ? '24px 16px' : '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image src="/images/logo.png" alt="Arium Logo" width={24} height={24} style={{ borderRadius: '4px' }} />
          <span style={{ fontWeight: 700, fontSize: '16px' }}>Arium</span>
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Hospedagens</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>{'\u00a9'} 2026 Arium. Todos os direitos reservados.</p>
      </footer>
    </main>
  )
}
