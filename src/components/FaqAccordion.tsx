'use client'
import { useState } from 'react'

const faqs = [
  {
    q: 'Preciso saber mexer com tecnologia?',
    a: 'Não. Você se cadastra, a gente configura tudo — site, preços, fotos, calendário. Em até 14 dias seu sistema já está no ar. Você só precisa saber usar o WhatsApp.',
  },
  {
    q: 'Como o hóspede paga?',
    a: 'Direto pelo site, com cartão de crédito ou Pix. O valor cai na sua conta via Mercado Pago. Sem intermediário, sem taxa escondida.',
  },
  {
    q: 'E se eu quiser cancelar?',
    a: 'Sem contrato longo. Você cancela quando quiser, sem multa. A gente acredita que você fica porque o resultado aparece — não porque está preso.',
  },
  {
    q: 'Funciona pra qualquer tipo de hospedagem?',
    a: 'Sim. Cabanas, pousadas, chalés, suítes. Se você aluga hospedagem por diária, o sistema funciona pra você.',
  },
  {
    q: 'E se o hóspede tiver dúvida na hora de reservar?',
    a: 'O site já responde as principais dúvidas automaticamente. Se precisar de mais, o botão de WhatsApp está sempre disponível pra você ou sua equipe atender.',
  },
  {
    q: 'Quanto tempo leva pra ir ao ar?',
    a: 'Até 14 dias úteis após o cadastro. A gente cuida de tudo — você só aprova como ficou.',
  },
]

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {faqs.map(({ q, a }, i) => (
        <div
          key={i}
          style={{
            borderBottom: '1px solid var(--border)',
            borderTop: i === 0 ? '1px solid var(--border)' : 'none',
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '24px 0', background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px',
            }}
          >
            <span style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, lineHeight: 1.4 }}>
              {q}
            </span>
            <span style={{
              color: 'var(--accent)', fontSize: '20px', fontWeight: 300,
              flexShrink: 0, transition: 'transform 0.2s ease',
              transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
              display: 'inline-block', lineHeight: 1,
            }}>
              +
            </span>
          </button>
          {open === i && (
            <div style={{ paddingBottom: '24px' }}>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
                {a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
