'use client'
import { useState } from 'react'

export default function PlanButton({ plan, label, color = 'var(--purple)' }: { plan: string, label: string, color?: string }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      console.log('Iniciando checkout para plano:', plan)
      
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Erro na resposta da API:', res.status, errorText)
        alert('Erro ao processar pagamento. Tente novamente.')
        return
      }
      
      const data = await res.json()
      console.log('Resposta da API:', data)
      
      if (data.url) {
        console.log('Redirecionando para:', data.url)
        window.location.href = data.url
      } else if (data.error) {
        console.error('Erro da API:', data.error)
        alert('Erro ao processar pagamento: ' + data.error)
      } else {
        console.error('Resposta inválida da API:', data)
        alert('Erro ao processar pagamento. Tente novamente.')
      }
    } catch (err) {
      console.error('Erro no checkout:', err)
      alert('Erro ao processar pagamento. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} style={{
      width: '100%', padding: '12px', borderRadius: '10px', marginTop: '24px',
      border: `1px solid ${color}22`,
      backgroundColor: loading ? `${color}22` : 'transparent',
      color: loading ? 'var(--muted)' : color,
      fontSize: '14px', fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
    }}>
      {loading ? 'Redirecionando...' : label}
    </button>
  )
}
