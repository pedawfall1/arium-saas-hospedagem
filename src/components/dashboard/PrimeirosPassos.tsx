"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronRight, X } from "lucide-react"

type Passo = {
  titulo: string
  descricao: string
  href: string
  pronto: boolean
}

/**
 * Checklist de configuração para quem acabou de entrar.
 *
 * Some sozinho quando tudo está pronto — nada de ocupar o painel de quem já
 * está rodando. Também pode ser dispensado a qualquer momento.
 */
export function PrimeirosPassos({
  temCabana,
  temPreco,
  temWhatsapp,
  temReserva,
}: {
  temCabana: boolean
  temPreco: boolean
  temWhatsapp: boolean
  temReserva: boolean
}) {
  const [dispensado, setDispensado] = useState(false)

  const passos: Passo[] = [
    {
      titulo: 'Cadastre sua cabana',
      descricao: 'Nome, fotos e comodidades — é o que o hóspede vê no site.',
      href: '/dashboard/propriedades',
      pronto: temCabana,
    },
    {
      titulo: 'Defina os preços',
      descricao: 'Diária de semana, de fim de semana e mínimo de noites.',
      href: '/dashboard/propriedades',
      pronto: temPreco,
    },
    {
      titulo: 'Conecte o WhatsApp',
      descricao: 'Para avisar o hóspede sozinho quando a reserva é confirmada.',
      href: '/dashboard/whatsapp',
      pronto: temWhatsapp,
    },
    {
      titulo: 'Registre a primeira reserva',
      descricao: 'Pode lançar uma que você já tem na agenda, para começar a usar.',
      href: '/dashboard/reservas/nova',
      pronto: temReserva,
    },
  ]

  const feitos = passos.filter(p => p.pronto).length
  const total = passos.length

  // Configuração completa: o painel volta ao normal.
  if (feitos === total || dispensado) return null

  const proximo = passos.find(p => !p.pronto)

  return (
    <section
      aria-label="Primeiros passos"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--purple)',
        borderRadius: '14px',
        padding: '22px 24px',
        marginBottom: '32px',
        position: 'relative',
      }}
    >
      <button
        onClick={() => setDispensado(true)}
        aria-label="Dispensar primeiros passos"
        style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', padding: '4px', lineHeight: 1,
        }}
      >
        <X size={16} />
      </button>

      <p style={{
        color: 'var(--accent)', fontSize: '12px', fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
      }}>
        Primeiros passos
      </p>
      <h2 style={{ color: 'var(--text)', fontSize: '19px', fontWeight: 700, marginBottom: '4px', paddingRight: '28px' }}>
        Falta pouco para começar a receber reservas
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
        {feitos} de {total} concluídos
        {proximo && <> · o próximo é <strong style={{ color: 'var(--text)' }}>{proximo.titulo.toLowerCase()}</strong></>}
      </p>

      {/* Progresso */}
      <div style={{
        backgroundColor: 'var(--bg)', borderRadius: '999px', height: '7px',
        overflow: 'hidden', marginBottom: '20px',
      }}>
        <div style={{
          backgroundColor: 'var(--purple)', height: '100%',
          width: `${(feitos / total) * 100}%`,
          borderRadius: '999px', transition: 'width .5s ease',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {passos.map((p, i) => (
          <Link
            key={i}
            href={p.href}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '13px 15px', borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: p.pronto ? 'transparent' : 'var(--bg)',
              textDecoration: 'none',
              opacity: p.pronto ? 0.6 : 1,
            }}
          >
            <span style={{
              width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: p.pronto ? 'var(--success-strong)' : 'transparent',
              border: p.pronto ? 'none' : '2px solid var(--border)',
              color: '#fff', fontSize: '12px', fontWeight: 700,
            }}>
              {p.pronto ? <Check size={14} /> : i + 1}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', color: 'var(--text)', fontSize: '15px', fontWeight: 600,
                textDecoration: p.pronto ? 'line-through' : 'none',
              }}>
                {p.titulo}
              </span>
              {!p.pronto && (
                <span style={{ display: 'block', color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>
                  {p.descricao}
                </span>
              )}
            </span>

            {!p.pronto && <ChevronRight size={17} color="var(--accent)" style={{ flexShrink: 0 }} />}
          </Link>
        ))}
      </div>
    </section>
  )
}
