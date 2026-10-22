'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { MessageCircle, CheckCircle2, AlertCircle, RefreshCw, LogOut, Smartphone, QrCode, BellRing } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function WhatsappClient({ initialTenant, cabanaExemplo }: { initialTenant: any, cabanaExemplo?: any }) {
  const tenant = initialTenant
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

  const selo =
    status === 'connected' ? { texto: 'Conectado', cor: 'var(--success)', fundo: 'rgba(34,197,94,0.12)', borda: 'rgba(34,197,94,0.35)' }
      : status === 'awaiting_scan' ? { texto: 'Aguardando leitura', cor: 'var(--warning)', fundo: 'rgba(234,179,8,0.12)', borda: 'rgba(234,179,8,0.4)' }
        : { texto: 'Desconectado', cor: 'var(--muted)', fundo: 'rgba(148,163,184,0.12)', borda: 'rgba(148,163,184,0.3)' }

  return (
    <div style={{ width: '100%', maxWidth: '980px', margin: '0 auto' }}>
      <style>{CSS_WPP}</style>

      <div className="wpp-topo">
        <div>
          <h1>WhatsApp</h1>
          <p>Conecte o número da pousada para o sistema avisar o hóspede quando a reserva for confirmada.</p>
        </div>
        <span className="wpp-selo" style={{ color: selo.cor, backgroundColor: selo.fundo, borderColor: selo.borda }}>
          <span className="wpp-bolinha" style={{ backgroundColor: selo.cor }} /> {selo.texto}
        </span>
      </div>

      {error && (
        <div className="wpp-erro"><AlertCircle size={18} style={{ flexShrink: 0 }} /> {error}</div>
      )}

      <div className="wpp-grade">
        {/* Situação da conexão (com o QR na tela, ocupa a largura toda) */}
        <section className={`wpp-card${status === 'awaiting_scan' && qrCode ? ' wpp-largo' : ''}`}>
          {status === 'connected' ? (
            <div className="wpp-estado">
              <span className="wpp-icone-grande" style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25D366' }}><CheckCircle2 size={36} /></span>
              <h2>WhatsApp conectado</h2>
              <p>
                As mensagens saem do número conectado
                {tenant.whatsapp_connected_at ? <> desde <strong>{formatDate(tenant.whatsapp_connected_at)}</strong></> : null}.
              </p>
              <button onClick={handleDisconnect} disabled={loading} className="wpp-btn-secundario">
                {loading ? <RefreshCw size={16} className="wpp-girando" /> : <LogOut size={16} />}
                {loading ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          ) : status === 'awaiting_scan' && qrCode ? (
            <div className="wpp-qr">
              <div className="wpp-qr-imagem">
                <Image
                  src={qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR code para conectar o WhatsApp"
                  width={240}
                  height={240}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ marginBottom: '14px' }}>Escaneie com o celular da pousada</h2>
                <ol className="wpp-passos">
                  <li>Abra o <strong>WhatsApp</strong> no celular</li>
                  <li>Toque em <strong>⋮</strong> (Android) ou <strong>Configurações</strong> (iPhone)</li>
                  <li>Entre em <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong></li>
                  <li>Aponte a câmera para este código</li>
                </ol>
                <div className="wpp-tempo">
                  <div style={{ width: `${Math.max(0, (45 - timeSinceQr) / 45) * 100}%` }} />
                </div>
                <p className="wpp-ajuda">O código se renova sozinho em {Math.max(0, 45 - timeSinceQr)}s.</p>
                <button onClick={handleConnect} disabled={loading} className="wpp-btn-secundario" style={{ marginTop: '12px' }}>
                  <RefreshCw size={16} className={loading ? 'wpp-girando' : undefined} /> Gerar novo código
                </button>
              </div>
            </div>
          ) : (
            <div className="wpp-estado">
              <span className="wpp-icone-grande" style={{ backgroundColor: 'rgba(148,163,184,0.12)', color: 'var(--muted)' }}><MessageCircle size={36} /></span>
              <h2>Nenhum número conectado</h2>
              <p>Leva menos de um minuto: gere o código e escaneie com o WhatsApp do celular da pousada.</p>
              <button onClick={handleConnect} disabled={loading} className="wpp-btn-primario">
                {loading ? <RefreshCw size={18} className="wpp-girando" /> : <QrCode size={18} />}
                {loading ? 'Gerando código...' : 'Conectar WhatsApp'}
              </button>
            </div>
          )}
        </section>

        {/* O que é enviado */}
        <section className="wpp-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}><BellRing size={17} style={{ color: 'var(--accent)' }} /> O que o hóspede recebe</h2>
          <p className="wpp-ajuda" style={{ marginBottom: '14px' }}>
            Ao confirmar o pagamento de uma reserva pendente, você escolhe se quer avisar o hóspede. A mensagem sai assim:
          </p>
          <div className="wpp-conversa">
            <div className="wpp-balao">
              Olá, Maria! 🌿<br /><br />
              Sua reserva na <b>{cabanaExemplo?.name || 'sua cabana'}</b> está <b>confirmada</b>! ✅<br /><br />
              📅 Check-in: 23/10/2026{cabanaExemplo?.checkin_time ? ` a partir das ${String(cabanaExemplo.checkin_time).slice(0, 5)}` : ''}<br />
              📅 Check-out: 25/10/2026{cabanaExemplo?.checkout_time ? ` até as ${String(cabanaExemplo.checkout_time).slice(0, 5)}` : ''}<br />
              👥 Hóspedes: 2<br />
              💰 Valor total: R$ 1.998,00<br />
              ✅ Sinal recebido: R$ 999,00<br />
              💵 Restante no check-in: R$ 999,00<br /><br />
              Qualquer dúvida é só chamar por aqui. Até breve! 💚<br />
              <i>{tenant.business_name}</i>
            </div>
          </div>
          <p className="wpp-ajuda" style={{ marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <Smartphone size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            Os dados vêm da reserva. Se o WhatsApp estiver desconectado, a reserva é confirmada mesmo assim e o painel avisa para mandar na mão.
          </p>
        </section>
      </div>
    </div>
  )
}

const CSS_WPP = `
.wpp-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.wpp-topo h1 { color: var(--text); font-size: 28px; font-weight: 700; margin-bottom: 4px; }
.wpp-topo p { color: var(--muted); font-size: 14px; max-width: 560px; }
.wpp-selo { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 14px; border-radius: 999px; border: 1px solid; font-size: 13px; font-weight: 600; white-space: nowrap; }
.wpp-bolinha { width: 8px; height: 8px; border-radius: 99px; }
.wpp-erro { display: flex; align-items: center; gap: 8px; padding: 14px 16px; margin-bottom: 16px; border-radius: 12px; background-color: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--danger); font-size: 14px; font-weight: 500; }
.wpp-grade { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.wpp-card { background-color: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; min-width: 0; }
.wpp-card h2 { color: var(--text); font-size: 17px; font-weight: 700; }
.wpp-estado { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 12px 0; }
.wpp-estado p { color: var(--muted); font-size: 14px; line-height: 1.5; max-width: 340px; }
.wpp-icone-grande { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 22px; margin-bottom: 4px; }
.wpp-largo { grid-column: 1 / -1; }
.wpp-qr { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 32px; align-items: center; max-width: 720px; margin: 0 auto; }
.wpp-qr-imagem { padding: 12px; background-color: #fff; border-radius: 16px; line-height: 0; }
.wpp-passos { margin: 0; padding-left: 20px; color: var(--text); font-size: 14px; line-height: 1.5; display: flex; flex-direction: column; gap: 6px; }
.wpp-passos li::marker { color: var(--accent); font-weight: 700; }
.wpp-tempo { height: 4px; border-radius: 99px; background-color: rgba(148,163,184,0.15); margin-top: 16px; overflow: hidden; }
.wpp-tempo > div { height: 100%; background-color: #25D366; border-radius: 99px; transition: width 1s linear; }
.wpp-ajuda { color: var(--muted); font-size: 12px; line-height: 1.5; margin-top: 6px; }
.wpp-btn-primario { display: inline-flex; align-items: center; gap: 8px; height: 46px; padding: 0 24px; margin-top: 6px; border-radius: 12px; border: none; background-color: #1fae54; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
.wpp-btn-primario:hover:not(:disabled) { filter: brightness(1.08); }
.wpp-btn-secundario { white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--field-border); background: transparent; color: var(--text); font-size: 14px; font-weight: 500; cursor: pointer; }
.wpp-btn-secundario:hover:not(:disabled) { border-color: var(--field-border-hover); }
.wpp-btn-primario:disabled, .wpp-btn-secundario:disabled { opacity: 0.65; cursor: not-allowed; }
.wpp-conversa { border-radius: 14px; padding: 16px; background-color: rgba(37,211,102,0.05); border: 1px solid var(--border); }
.wpp-balao { max-width: 92%; margin-left: auto; padding: 12px 14px; border-radius: 14px 14px 4px 14px; background-color: rgba(37,211,102,0.16); color: var(--text); font-size: 13px; line-height: 1.5; }
@keyframes wpp-girar { to { transform: rotate(360deg); } }
.wpp-girando { animation: wpp-girar 0.9s linear infinite; }
@media (max-width: 900px) {
  .wpp-grade { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .wpp-qr { grid-template-columns: minmax(0, 1fr); justify-items: center; }
  .wpp-qr-imagem img { width: 200px !important; height: 200px !important; }
  .wpp-btn-primario { width: 100%; justify-content: center; }
  .wpp-topo h1 { font-size: 22px; }
}
`
