'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { MessageCircle, CheckCircle2, AlertCircle, RefreshCw, LogOut, X, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function WhatsappAdminClient({ initialTenants }: { initialTenants: any[] }) {
  const [tenants, setTenants] = useState(initialTenants)
  
  // Modal state
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [status, setStatus] = useState<string>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeSinceQr, setTimeSinceQr] = useState(0)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null)

  const openTenantModal = (tenant: any) => {
    setSelectedTenant(tenant)
    setStatus(tenant.whatsapp_status || 'disconnected')
    setQrCode(null)
    setError(null)
    setTimeSinceQr(0)
  }

  const closeModal = () => {
    setSelectedTenant(null)
    stopPolling()
    if (qrTimerRef.current) clearInterval(qrTimerRef.current)
  }

  useEffect(() => {
    if (selectedTenant && (status === 'awaiting_scan' || status === 'connected')) {
      startPolling()
    }
    return () => stopPolling()
  }, [status, selectedTenant])

  const startPolling = () => {
    stopPolling()
    if (!selectedTenant) return
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/status?tenantId=${selectedTenant.id}`)
        const data = await res.json()
        if (res.ok) {
          setStatus(data.status)
          // Update in local list
          setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, whatsapp_status: data.status, whatsapp_connected_at: data.status === 'connected' ? new Date().toISOString() : t.whatsapp_connected_at } : t))
          if (data.status === 'connected') {
            stopPolling()
            setQrCode(null)
          } else if (data.status === 'disconnected') {
            stopPolling()
          }
        }
      } catch (err) {}
    }, 3000)
  }

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  useEffect(() => {
    if (status === 'awaiting_scan' && qrCode) {
      qrTimerRef.current = setInterval(() => {
        setTimeSinceQr(t => {
          if (t >= 45) {
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
    if (!selectedTenant) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/connect', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenant.id })
      })
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
    if (!selectedTenant) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/disconnect', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenant.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao desconectar')
      
      setStatus('disconnected')
      setQrCode(null)
      // Update local list
      setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, whatsapp_status: 'disconnected' } : t))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        WhatsApp dos Clientes
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '40px' }}>
        Acompanhe o status das conexões do WhatsApp de todos os tenants.
      </p>

      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(13, 13, 26, 0.5)' }}>
              {['Tenant', 'Instância', 'Conectado em', 'Status', ''].map(col => (
                <th key={col} style={{
                  padding: '14px 24px', textAlign: 'left',
                  color: 'var(--muted)', fontSize: '11px',
                  fontWeight: 500, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)'
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((t, i) => (
              <tr key={t.id} style={{
                borderBottom: i < tenants.length - 1 ? '1px solid rgba(138,43,226,0.08)' : 'none',
              }}>
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>
                  {t.business_name}
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '13px' }}>
                  {t.whatsapp_instance_name || '—'}
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontSize: '14px' }}>
                  {t.whatsapp_connected_at ? formatDate(t.whatsapp_connected_at) : '—'}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  {t.whatsapp_status === 'connected' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#25D366', fontSize: '13px', fontWeight: 500, backgroundColor: 'rgba(37,211,102,0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                      <CheckCircle2 size={14} /> Conectado
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '13px', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px' }}>
                      <AlertCircle size={14} /> Desconectado
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <button 
                    onClick={() => openTenantModal(t)}
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      padding: '6px 12px', borderRadius: '6px',
                      color: 'var(--text)', fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Gerenciar
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Users size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Nenhum cliente cadastrado.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedTenant && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '100%', maxWidth: '480px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MessageCircle size={20} color="#25D366" />
                WhatsApp: {selectedTenant.business_name}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
              {error && (
                <div style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {status === 'connected' ? (
                <>
                  <CheckCircle2 size={48} color="#25D366" />
                  <div>
                    <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600 }}>WhatsApp Conectado</h2>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 20px', borderRadius: '8px',
                      border: '1px solid var(--border)', backgroundColor: 'transparent',
                      color: 'var(--text)', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    <LogOut size={16} />
                    {loading ? 'Desconectando...' : 'Desconectar'}
                  </button>
                </>
              ) : status === 'awaiting_scan' && qrCode ? (
                <>
                  <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Escaneie o QR Code abaixo</p>
                  <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '12px' }}>
                    <Image 
                      src={qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`} 
                      alt="WhatsApp QR Code" 
                      width={220} 
                      height={220} 
                    />
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '12px' }}>
                    Atualizando em {45 - timeSinceQr}s...
                  </p>
                </>
              ) : (
                <>
                  <MessageCircle size={48} color="var(--muted)" />
                  <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Instância não conectada.</p>
                  <button
                    onClick={handleConnect}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '12px 24px', borderRadius: '8px',
                      backgroundColor: '#25D366', color: 'white',
                      fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                    {loading ? 'Conectando...' : 'Gerar QR Code'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
