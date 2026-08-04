"use client"

import { useState } from "react"
import { HardDriveDownload } from "lucide-react"

/** Baixa uma cópia de todos os dados da pousada num arquivo só. */
export function BotaoBackup() {
  const [baixando, setBaixando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string, tipo: 'ok' | 'err' } | null>(null)

  const baixar = async () => {
    setBaixando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Não foi possível gerar o backup.')
      }

      const blob = await res.blob()
      const nome = res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1]
        ?? `backup_${new Date().toISOString().slice(0, 10)}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      setMsg({ texto: `Backup salvo como ${nome}`, tipo: 'ok' })
    } catch (e: any) {
      setMsg({ texto: e.message, tipo: 'err' })
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div style={{
      backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '22px 24px',
    }}>
      <h3 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
        Backup dos seus dados
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.55, maxWidth: '60ch' }}>
        Baixa um arquivo com tudo: cabanas, reservas, recebimentos, gastos e configurações.
        Os dados são seus — guarde uma cópia de vez em quando.
      </p>

      <button
        onClick={baixar}
        disabled={baixando}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '9px',
          padding: '11px 20px', borderRadius: '9px',
          border: '1px solid var(--border)', backgroundColor: 'var(--bg)',
          color: 'var(--text)', fontWeight: 600, fontSize: '14px',
          cursor: baixando ? 'not-allowed' : 'pointer', opacity: baixando ? 0.65 : 1,
        }}
      >
        <HardDriveDownload size={16} />
        {baixando ? 'Preparando arquivo...' : 'Baixar meus dados'}
      </button>

      {msg && (
        <p style={{
          marginTop: '14px', fontSize: '13.5px', fontWeight: 500, lineHeight: 1.5,
          color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
        }}>
          {msg.texto}
        </p>
      )}
    </div>
  )
}
