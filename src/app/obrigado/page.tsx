export default function ObrigadoPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', padding: '48px 24px',
      position: 'relative', zIndex: 1,
    }}>
      <div style={{
        backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
        borderTop: '3px solid #22c55e', borderRadius: '20px', padding: '48px',
        maxWidth: '480px', width: '100%',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{'\ud83c\udf89'}</div>
        <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
          Bem-vindo à Arium!
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.7, marginBottom: '32px' }}>
          Seu plano foi ativado com sucesso. Nossa equipe entrará em contato em até 24h para configurar seu sistema.
        </p>
        <a href="https://wa.me/5549999317620?text=Olá! Acabei de assinar o plano da Arium Hospedagens."
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#25d366', color: 'white', borderRadius: '10px',
            padding: '12px 28px', fontSize: '15px', fontWeight: 700,
            textDecoration: 'none',
          }}>
          {'\ud83d\udcac'} Falar no WhatsApp
        </a>
        <br /><br />
        <a href="/login" style={{ color: 'var(--accent)', fontSize: '14px', textDecoration: 'none' }}>
          Acessar meu painel {'\u2192'}
        </a>
      </div>
    </div>
  )
}
