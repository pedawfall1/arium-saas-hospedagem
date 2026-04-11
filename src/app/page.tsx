import Image from 'next/image'
import PlanButton from '@/components/PlanButton'

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
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '999px', padding: '6px 16px', fontSize: '13px', color: 'var(--accent)', marginBottom: '32px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
            Sistema de reservas para pousadas e cabanas
          </div>
          <h1 style={{ fontSize: 'clamp(38px, 7vw, 76px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '20px' }}>
            Seu hóspede reserva online.<br />
            <span style={{ color: 'var(--accent)' }}>Você só recebe.</span>
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--muted)', maxWidth: '560px', margin: '0 auto 36px', lineHeight: 1.7 }}>
            Site de reservas profissional + painel de gestão + notificações automáticas no WhatsApp. Para pousadas e cabanas em Santa Catarina.
          </p>
          <div className="landing-hero-btns">
            <a href="https://wa.me/5549999317620?text=Olá! Quero saber mais sobre o sistema de reservas para minha pousada."
              style={{ backgroundColor: 'var(--purple)', color: 'white', borderRadius: '10px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
              Quero o meu sistema
            </a>
            <a href="#como-funciona"
              style={{ backgroundColor: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 32px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
              Ver como funciona
            </a>
          </div>
          <div className="landing-trust">
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}><span style={{ color: 'var(--accent)' }}>{'\u2713'} </span>Sem contrato longo</span>
            <span className="divider" style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}><span style={{ color: 'var(--accent)' }}>{'\u2713'} </span>Ativo em 7 dias</span>
            <span className="divider" style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}><span style={{ color: 'var(--accent)' }}>{'\u2713'} </span>Suporte via WhatsApp</span>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="landing-section">
        <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Como funciona</p>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700, color: 'var(--text)', marginBottom: '0' }}>
          Do cadastro ao<br /><span style={{ color: 'var(--accent)' }}>primeiro hóspede.</span>
        </h2>
        <div className="landing-steps">
          {[
            { emoji: 'rocket', title: 'Cadastro', text: 'Você se cadastra, a gente configura seu site personalizado em até 7 dias úteis.', num: '1' },
            { emoji: 'globe', title: 'Site online', text: 'Seu site de reservas no ar com sua identidade visual, preços e fotos.', num: '2' },
            { emoji: 'credit-card', title: 'Hóspede reserva', text: 'O cliente escolhe as datas e paga o sinal direto pelo site com cartão ou Pix.', num: '3' },
            { emoji: 'phone', title: 'Você é avisado', text: 'Recebe confirmação automática no WhatsApp com nome, datas e valor pago.', num: '4' },
          ].map(({ emoji, title, text, num }) => (
            <div key={num} className="landing-step-card">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
                {emoji === 'rocket' ? '\ud83d\ude80' : emoji === 'globe' ? '\ud83c\udf10' : emoji === 'credit-card' ? '\ud83d\udcb3' : '\ud83d\udcf1'}
              </div>
              <h3 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>{text}</p>
              <span style={{ position: 'absolute', bottom: '16px', right: '20px', fontSize: '64px', fontWeight: 900, color: 'rgba(124,58,237,0.06)', lineHeight: 1, userSelect: 'none' }}>{num}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="landing-section-full" style={{ backgroundColor: 'rgba(124,58,237,0.02)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: '0' }}>
          <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Planos</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700, color: 'var(--text)' }}>
            Para todo tipo de<br /><span style={{ color: 'var(--accent)' }}>pousada ou cabana.</span>
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
            {['Site de reservas', 'Painel de gestão', 'Notificações WhatsApp', 'Calendário de disponibilidade', 'Aceita Mercado Pago'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ color: '#22c55e', fontSize: '14px', flexShrink: 0 }}>{'\u2713'}</span>
                <span style={{ color: 'var(--text)', fontSize: '14px' }}>{f}</span>
              </div>
            ))}
            <PlanButton plan="essencial" label="Quero esse plano" color="#7c3aed" />
          </div>
          {/* Plus */}
          <div className="landing-plan-card featured" style={{ borderTop: '3px solid #f97b00' }}>
            <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#f97b00', color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 16px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
              MAIS POPULAR
            </div>
            <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Plus</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>2 ou mais cabanas/quartos</p>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: '#f97b00' }}>R$ 249</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mês</span>
            </div>
            {['Tudo do plano Essencial +', 'Múltiplas propriedades'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ color: '#22c55e', fontSize: '14px', flexShrink: 0 }}>{'\u2713'}</span>
                <span style={{ color: 'var(--text)', fontSize: '14px' }}>{f}</span>
              </div>
            ))}
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
            {['Tudo do plano Plus +', 'App de check-in para hóspede'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ color: '#22c55e', fontSize: '14px', flexShrink: 0 }}>{'\u2713'}</span>
                <span style={{ color: 'var(--text)', fontSize: '14px' }}>{f}</span>
              </div>
            ))}
            <PlanButton plan="premium" label="Quero esse plano" color="#22c55e" />
          </div>
        </div>
      </section>

      {/* CASO REAL */}
      <section className="landing-section" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Caso de sucesso</p>
        <div className="landing-testimonial" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--purple)', borderRadius: '16px', padding: '36px 40px', textAlign: 'left', position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ position: 'absolute', top: '16px', left: '24px', fontSize: '72px', color: 'rgba(124,58,237,0.12)', fontFamily: 'Georgia, serif', lineHeight: 1 }}>"</span>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text)', lineHeight: 1.8, marginBottom: '24px', position: 'relative', zIndex: 1, paddingTop: '20px' }}>
            Antes os hóspedes ligavam pra reservar e eu perdia tempo confirmando tudo manualmente. Agora o site faz isso sozinho - o cliente paga o sinal online e eu recebo o WhatsApp confirmando. Simples assim.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #046C62, #0a9e8f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>C</div>
            <div>
              <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px' }}>Cabanas Doce Encanto</p>
              <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Salto Veloso, SC - Cliente desde 2026</p>
            </div>
          </div>
        </div>
        <div className="landing-stats">
          {['R$ 0 em taxa de setup', '7 dias para ir ao ar', '100% online'].map(s => (
            <span key={s} style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '999px', padding: '8px 20px', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="contato" className="landing-section-full landing-cta" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, color: 'var(--text)', marginBottom: '16px' }}>
            Pronto pra receber<br /><span style={{ color: 'var(--accent)' }}>reservas online?</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '17px', marginBottom: '40px' }}>
            Fala com a gente no WhatsApp. A gente explica tudo e coloca seu sistema no ar.
          </p>
          <a href="https://wa.me/5549999317620?text=Olá! Quero saber mais sobre o sistema de reservas para minha pousada." className="landing-wpp-btn">
            {'\ud83d\udcac'} Falar no WhatsApp
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/images/logo.png" alt="Arium" width={24} height={24} style={{ objectFit: 'contain' }} />
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '14px' }}>Arium</span>
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Hospedagens</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{'\u00a9'} 2026 Arium. Todos os direitos reservados.</p>
      </footer>

    </div>
  )
}
