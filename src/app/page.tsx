import Image from 'next/image'
import Link from 'next/link'
import PlanButton from '@/components/PlanButton'
import FaqAccordion from '@/components/FaqAccordion'

export default function HomePage() {
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* NAVBAR */}
      <nav className="landing-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <Image src="/images/logo.png" alt="Arium" width={28} height={28} style={{ objectFit: 'contain' }} />
          <span style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 700 }}>Arium</span>
          <span style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: 'var(--accent)', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: 600 }}>Hospedagens</span>
        </div>
        <div className="landing-nav-links">
          <a href="#como-funciona" className="landing-nav-link">Como funciona</a>
          <a href="#planos" className="landing-nav-link">Planos</a>
          <a href="#contato" className="landing-nav-link">Contato</a>
        </div>
        <a href="/login" style={{ backgroundColor: 'var(--purple)', color: 'white', borderRadius: '999px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
          Acessar painel
        </a>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(124,58,237,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '999px', padding: '6px 16px', fontSize: '13px', color: '#d8b4fe', marginBottom: '32px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
            Sistema de reservas para pousadas e cabanas
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 68px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '20px', textShadow: '0 0 120px rgba(124,58,237,0.6), 0 0 40px rgba(124,58,237,0.3), 0 2px 4px rgba(0,0,0,0.9)' }}>
            Seu hóspede reserva online.<br />
            <span className="gradient-purple">Você só recebe.</span>
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--muted)', maxWidth: '500px', margin: '0 auto 36px', lineHeight: 1.7 }}>
            Para pousadas e cabanas que querem parar de perder reserva.
          </p>
          <div className="landing-hero-btns">
            <a href="https://wa.me/5549999317620?text=Olá! Quero saber mais sobre o sistema de reservas para minha pousada."
              style={{ backgroundColor: 'var(--purple)', color: 'white', borderRadius: '10px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
              Quero receber reservas online
            </a>
            <a href="#como-funciona"
              style={{ backgroundColor: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 32px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
              Ver como funciona
            </a>
          </div>
          <div className="landing-trust">
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}><span style={{ color: 'var(--accent)' }}>{'\u2713'} </span>Sem contrato longo</span>
            <span className="divider" style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}><span style={{ color: 'var(--accent)' }}>{'\u2713'} </span>Ativo em 14 dias</span>
            <span className="divider" style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}><span style={{ color: 'var(--accent)' }}>{'\u2713'} </span>Suporte via WhatsApp</span>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE DOR */}
      <section className="landing-section-centered">
        <p style={{ color: '#f87171', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>O problema</p>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
          Ainda gerencia reservas<br /><span className="gradient-red">manualmente?</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.7, maxWidth: '600px', marginBottom: '48px' }}>
          Se você ainda confirma reserva por WhatsApp, anota disponibilidade no papel ou perde hóspede porque estava dormindo — esse sistema foi feito pra você.
        </p>

        {/* Two columns — sem vs com */}
        <div className="landing-dor-grid">
          {/* SEM */}
          <div style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <span style={{ fontSize: '20px' }}>❌</span>
              <p style={{ color: '#f87171', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sem o sistema</p>
            </div>
            {[
              'Reserva chega por WhatsApp a qualquer hora',
              'Você confirma manualmente, um por um',
              'Calendário desatualizado, dupla reserva acontece',
              'Perde hóspede porque demorou pra responder',
              'Sem controle de quanto está entrando',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
                <span style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }}>✕</span>
                <span style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
          {/* COM */}
          <div style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <span style={{ fontSize: '20px' }}>✅</span>
              <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Com o sistema</p>
            </div>
            {[
              'Hóspede escolhe data e paga sozinho, 24h por dia',
              'Confirmação automática via WhatsApp pra você e pro hóspede',
              'Calendário atualizado em tempo real, zero conflito',
              'Reserva fechada mesmo enquanto você dorme',
              'Painel com todas as reservas e valores em um lugar',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
                <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }}>✓</span>
                <span style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <h3 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: 'var(--text)', margin: '56px 0 24px', textAlign: 'center' }}>
          O que muda na prática.
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="landing-compare-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}></th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#f87171', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>Sem o sistema</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#22c55e', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>Com o sistema</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Reservas', 'WhatsApp manual', 'Online 24h automático'],
                ['Confirmação', 'Você faz na mão', 'Automática via WhatsApp'],
                ['Pagamento', 'Transferência / Pix manual', 'Cartão ou Pix direto no site'],
                ['Disponibilidade', 'Você controla no braço', 'Calendário atualizado em tempo real'],
                ['E se estiver dormindo?', 'Perde a reserva', 'Sistema fecha por você'],
              ].map(([label, sem, com], i) => (
                <tr key={label} style={{ backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                  <td style={{ padding: '14px 16px', color: 'var(--text)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{label}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#f87171', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{sem}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#22c55e', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{com}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile comparison cards */}
        <div className="landing-compare-mobile">
          {[
            ['Reservas', 'WhatsApp manual', 'Online 24h automático'],
            ['Confirmação', 'Você faz na mão', 'Automática via WhatsApp'],
            ['Pagamento', 'Transferência / Pix manual', 'Cartão ou Pix direto no site'],
            ['Disponibilidade', 'Você controla no braço', 'Calendário atualizado em tempo real'],
            ['E se estiver dormindo?', 'Perde a reserva', 'Sistema fecha por você'],
          ].map(([label, sem, com], i) => (
            <div key={label} className="landing-compare-mobile-card">
              <div className="label">{label}</div>
              <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#f87171', fontSize: '12px' }}>Sem: {sem}</div>
                <div style={{ color: '#22c55e', fontSize: '12px' }}>Com: {com}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="landing-section-centered">
        <div style={{ maxWidth: '600px' }}>
          <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Como funciona</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'var(--text)', marginBottom: '40px' }}>
            Do cadastro ao<br /><span className="gradient-purple">primeiro hóspede.</span>
          </h2>
        </div>
        <div className="landing-steps">
          {[
            { emoji: '🚀', title: 'Cadastro', text: 'Você se cadastra, a gente configura seu site personalizado em até 14 dias úteis.', num: '1' },
            { emoji: '🌐', title: 'Site online', text: 'Seu site de reservas no ar com sua identidade visual, preços e fotos.', num: '2' },
            { emoji: '💳', title: 'Hóspede reserva', text: 'O cliente escolhe as datas e paga o sinal direto pelo site com cartão ou Pix.', num: '3' },
            { emoji: '📱', title: 'Você é avisado', text: 'Recebe confirmação automática no WhatsApp com nome, datas e valor pago.', num: '4' },
          ].map(({ emoji, title, text, num }) => (
            <div key={num} className="landing-step-card">
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{emoji}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#a855f7', flexShrink: 0 }}>{num}</span>
                <h3 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700 }}>{title}</h3>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.7 }}>{text}</p>
              <span style={{ position: 'absolute', bottom: '12px', right: '16px', fontSize: '64px', fontWeight: 900, color: 'rgba(124,58,237,0.04)', lineHeight: 1, userSelect: 'none' }}>{num}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="landing-section-full" style={{ backgroundColor: 'rgba(124,58,237,0.02)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: '0' }}>
          <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Planos</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700, color: 'var(--text)' }}>
            Para todo tipo de<br /><span className="gradient-purple">pousada ou cabana.</span>
          </h2>
        </div>
        <div className="landing-plans">
          {/* Essencial */}
          <div className="landing-plan-card" style={{ borderTop: '3px solid #7c3aed' }}>
            <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Essencial</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>Até 1 cabana/quarto</p>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: '#7c3aed' }}>R$ 197</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mês</span>
            </div>
            <div className="landing-plan-features">
              {['Site de reservas', 'Painel de gestão', 'Notificações WhatsApp', 'Calendário de disponibilidade', 'Aceita Mercado Pago'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ color: '#22c55e', fontSize: '14px', flexShrink: 0 }}>{'\u2713'}</span>
                  <span style={{ color: 'var(--text)', fontSize: '14px' }}>{f}</span>
                </div>
              ))}
            </div>
            <PlanButton plan="essencial" label="Quero esse plano" color="#7c3aed" />
          </div>
          {/* Plus */}
          <div className="landing-plan-card featured" style={{ borderTop: '4px solid #f97b00', transform: 'scale(1.05)', zIndex: 10, boxShadow: '0 0 40px rgba(249,123,0,0.15), 0 0 0 1px rgba(249,123,0,0.2)' }}>
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#f97b00', color: 'white', fontSize: '12px', fontWeight: 700, padding: '6px 20px', borderRadius: '999px', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(249,123,0,0.4)' }}>
              MAIS POPULAR
            </div>
            <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700, marginBottom: '4px', marginTop: '12px' }}>Plus</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>2 ou mais cabanas/quartos</p>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: '#f97b00' }}>R$ 249</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mês</span>
            </div>
            <div className="landing-plan-features">
              {['Tudo do plano Essencial +', 'Múltiplas propriedades'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ color: '#22c55e', fontSize: '14px', flexShrink: 0 }}>{'\u2713'}</span>
                  <span style={{ color: 'var(--text)', fontSize: '14px' }}>{f}</span>
                </div>
              ))}
            </div>
            <PlanButton plan="plus" label="Quero esse plano" color="#f97b00" />
          </div>
          {/* Premium */}
          <div className="landing-plan-card" style={{ borderTop: '3px solid #22c55e' }}>
            <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Premium</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>A experiência completa</p>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: '#22c55e' }}>R$ 297</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mês</span>
            </div>
            <div className="landing-plan-features">
              {['Tudo do plano Plus +', 'App de check-in para hóspede'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ color: '#22c55e', fontSize: '14px', flexShrink: 0 }}>{'\u2713'}</span>
                  <span style={{ color: 'var(--text)', fontSize: '14px' }}>{f}</span>
                </div>
              ))}
            </div>
            <PlanButton plan="premium" label="Quero esse plano" color="#22c55e" />
          </div>
        </div>
      </section>

      {/* CASO REAL */}
      <section className="landing-section" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Caso de sucesso</p>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 800, color: 'var(--text)', marginBottom: '40px' }}>
          Quem já usa <span className="gradient-purple">não volta atrás.</span>
        </h2>
        <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, var(--surface) 60%)', borderTop: '1px solid rgba(124,58,237,0.25)', borderRight: '1px solid rgba(124,58,237,0.25)', borderBottom: '1px solid rgba(124,58,237,0.25)', borderLeft: '4px solid var(--purple)', borderRadius: '20px', padding: '48px 48px 40px', textAlign: 'left', boxShadow: '0 0 80px rgba(124,58,237,0.08)' }}>
          <span style={{ position: 'absolute', top: '16px', left: '28px', fontSize: '120px', color: 'rgba(124,58,237,0.08)', fontFamily: 'Georgia, serif', lineHeight: 1 }}>&ldquo;</span>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text)', lineHeight: 1.9, marginBottom: '32px', position: 'relative', zIndex: 1, paddingTop: '24px' }}>
            Antes os hóspedes ligavam pra reservar e eu perdia tempo confirmando tudo manualmente. Agora o site faz isso sozinho — o cliente paga o sinal online e eu recebo o WhatsApp confirmando. Simples assim.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #046C62, #0a9e8f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>C</div>
              <div>
                <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '15px' }}>Cabanas Doce Encanto</p>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>Salto Veloso, SC · cliente desde 2025</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#f97b00', fontSize: '20px' }}>★</span>)}
            </div>
          </div>
        </div>
        <div className="landing-stats" style={{ marginTop: '40px' }}>
          {['R$ 0 em taxa de setup', '14 dias para ir ao ar', '100% online'].map(s => (
            <span key={s} style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '999px', padding: '10px 24px', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section-centered">
        <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>FAQ</p>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'var(--text)', marginBottom: '40px' }}>
          Dúvidas <span className="gradient-purple">frequentes.</span>
        </h2>
        <FaqAccordion />
      </section>

      {/* CTA FINAL */}
      <section id="contato" className="landing-section-full landing-cta" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, color: 'var(--text)', marginBottom: '16px' }}>
            Nos próximos 14 dias seu site de reservas<br />
            <span className="gradient-purple">já pode estar no ar.</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '17px', marginBottom: '8px' }}>
            Sem taxa de setup. Sem contrato longo. Sem precisar entender de tecnologia.
          </p>
          <a href="https://wa.me/5549999317620?text=Olá! Quero saber mais sobre o sistema de reservas para minha pousada." className="landing-wpp-btn" style={{ marginTop: '32px' }}>
            {'\ud83d\udcac'} Quero receber reservas online
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '48px 24px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Image src="/images/logo.png" alt="Arium" width={24} height={24} style={{ objectFit: 'contain' }} />
              <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '15px' }}>Arium Hospedagens</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7 }}>Sistema de reservas online para pousadas e cabanas. Sem complicação.</p>
          </div>
          <div className="landing-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '48px' }} data-grid-responsive="true">
            <div>
              <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px', marginBottom: '14px' }}>Navegação</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[['Como funciona', '#como-funciona'], ['Planos', '#planos'], ['Contato', '#contato'], ['Acessar painel', '/login']].map(([label, href]) => (
                  <a key={label} href={href} style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none' }}>{label}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px', marginBottom: '14px' }}>Contato</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="https://wa.me/5549999317620" style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none' }}>📱 WhatsApp</a>
                <a href="https://www.instagram.com/arium_performance/" style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none' }}>📸 Instagram</a>
                <a href="mailto:contato@arium-ia.cloud" style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none' }}>✉️ contato@arium-ia.cloud</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: 'var(--muted)', fontSize: '12px' }}>© 2026 Arium. Todos os direitos reservados.</p>
            <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Feito com 🤍 em Videira, SC</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
