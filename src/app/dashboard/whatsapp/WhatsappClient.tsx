'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { MessageCircle, CheckCircle2, AlertCircle, RefreshCw, LogOut } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function WhatsappClient({ initialTenant }: { initialTenant: any }) {
  const [tenant, setTenant] = useState(initialTenant)
  const [status, setStatus] = useState<string>(initialTenant.whatsapp_status || 'disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeSinceQr, setTimeSinceQr] = useState(0)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Poll status while awaiting scan or generally to keep UI synced if we have an instance
  useEffect(() => {
    if (status === 'awaiting_scan' || status === 'connected') {
      startPolling()
    }
    return () => stopPolling()
  }, [status])

  const startPolling = () => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/status')
        const data = await res.json()
        if (res.ok) {
          if (data.status === 'connected') {
            setStatus('connected')
            stopPolling()
            setQrCode(null)
          } else if (data.status === 'disconnected') {
            setStatus(prev => {
              if (prev === 'awaiting_scan') return prev // Não mata o QR code
              stopPolling()
              return 'disconnected'
            })
          }
        }
      } catch (err) {}
    }, 3000)
  }

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  // Handle QR expiry auto-renew
  useEffect(() => {
    if (status === 'awaiting_scan' && qrCode) {
      qrTimerRef.current = setInterval(() => {
        setTimeSinceQr(t => {
          if (t >= 45) {
            // Auto renew
            handleConnect()
            return 0
          }
          return t + 1
        })
      }, 1000)
    } else {
      setTimeSinceQr(0)
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    }

    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    }
  }, [status, qrCode])

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao conectar')
      
      setQrCode(data.qrCode)
      setStatus(data.status || 'awaiting_scan')
      setTimeSinceQr(0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao desconectar')
      
      setStatus('disconnected')
      setQrCode(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MessageCircle size={28} style={{ color: '#25D366' }} />
          Integração WhatsApp
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px', marginTop: '8px' }}>
          Conecte seu WhatsApp para enviar notificações automáticas.
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '24px'
      }}>
        {error && (
          <div style={{ width: '100%', padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {status === 'connected' ? (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={40} color="#25D366" />
            </div>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 600 }}>WhatsApp Conectado ✅</h2>
              {tenant.whatsapp_connected_at && (
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
                  Conectado desde: {formatDate(tenant.whatsapp_connected_at)}
                </p>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', borderRadius: '8px',
                border: '1px solid var(--border)', backgroundColor: 'transparent',
                color: 'var(--text)', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <LogOut size={18} />
              {loading ? 'Desconectando...' : 'Desconectar'}
            </button>
          </>
        ) : status === 'awaiting_scan' && qrCode ? (
          <>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 600 }}>Escaneie o QR Code</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px', maxWidth: '400px' }}>
                Abra o WhatsApp no celular {'>'} Aparelhos conectados {'>'} Conectar um aparelho {'>'} Escanear QR code.
              </p>
            </div>
            
            <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '12px', display: 'inline-block' }}>
              <Image 
                src={qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`} 
                alt="WhatsApp QR Code" 
                width={250} 
                height={250} 
              />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
              Atualizando em {45 - timeSinceQr}s...
            </p>
          </>
        ) : (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={40} color="var(--muted)" />
            </div>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 600 }}>Não conectado</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
                Clique no botão abaixo para gerar o QR code.
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 32px', borderRadius: '8px',
                backgroundColor: '#25D366', color: 'white',
                fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, fontSize: '15px'
              }}
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <MessageCircle size={18} />}
              {loading ? 'Conectando...' : 'Conectar WhatsApp'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
