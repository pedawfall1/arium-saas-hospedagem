"use client"

import { useEffect, useState } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"

type Props = {
  isOpen: boolean
  booking: any
  /** Se false, o checkbox de WhatsApp aparece desabilitado com o motivo. */
  canNotify: boolean
  notifyDisabledReason?: string
  loading?: boolean
  onConfirm: (notify: boolean) => void
  onCancel: () => void
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  fontSize: "13px",
  padding: "6px 0",
}

export function ManualConfirmModal({
  isOpen,
  booking,
  canNotify,
  notifyDisabledReason,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const [isRendered, setIsRendered] = useState(false)
  const [notify, setNotify] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      setNotify(canNotify)
    } else {
      const timer = setTimeout(() => setIsRendered(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, canNotify])

  if (!isRendered || !booking) return null

  const deposit = Number(booking.deposit_amount) || 0

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        opacity: isOpen ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
      onClick={loading ? undefined : onCancel}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
          transform: isOpen ? "scale(1)" : "scale(0.95)",
          transition: "transform 0.2s ease",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: "var(--text)", fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
          Confirmar pagamento manualmente
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "18px", lineHeight: 1.5 }}>
          Use isto quando o pagamento chegou por fora do sistema (Pix direto, transferência).
          A reserva passa a segurar as datas <strong>definitivamente</strong>.
        </p>

        {/* Resumo da reserva */}
        <div
          style={{
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "18px",
          }}
        >
          <div style={rowStyle}>
            <span style={{ color: "var(--muted)" }}>Hóspede</span>
            <span style={{ color: "var(--text)", fontWeight: 600, textAlign: "right" }}>{booking.guest_name}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: "var(--muted)" }}>Cabana</span>
            <span style={{ color: "var(--text)", fontWeight: 500, textAlign: "right" }}>{booking.properties?.name}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: "var(--muted)" }}>Período</span>
            <span style={{ color: "var(--text)", fontWeight: 500, textAlign: "right" }}>
              {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: "var(--muted)" }}>Valor total</span>
            <span style={{ color: "var(--text)", fontWeight: 700, textAlign: "right" }}>
              {formatCurrency(booking.total_amount)}
            </span>
          </div>
          {deposit > 0 && (
            <div style={rowStyle}>
              <span style={{ color: "var(--muted)" }}>Sinal</span>
              <span style={{ color: "#22c55e", fontWeight: 600, textAlign: "right" }}>
                {formatCurrency(deposit)}
              </span>
            </div>
          )}
        </div>

        {/* Aviso ao hóspede */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            cursor: canNotify ? "pointer" : "not-allowed",
            marginBottom: "20px",
            opacity: canNotify ? 1 : 0.6,
          }}
        >
          <input
            type="checkbox"
            checked={notify && canNotify}
            disabled={!canNotify || loading}
            onChange={(e) => setNotify(e.target.checked)}
            style={{ width: "16px", height: "16px", marginTop: "2px", flexShrink: 0 }}
          />
          <span style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.5 }}>
            Avisar o hóspede por WhatsApp
            <span style={{ display: "block", color: "var(--muted)", fontSize: "12px", marginTop: "2px" }}>
              {canNotify
                ? "Envia a confirmação da reserva para o número do hóspede. Desmarque se você já avisou por fora."
                : notifyDisabledReason}
            </span>
          </span>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              backgroundColor: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(notify && canNotify)}
            disabled={loading}
            style={{
              backgroundColor: "#22c55e",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 12px rgba(34,197,94,0.25)",
            }}
          >
            {loading ? "Confirmando..." : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </div>
  )
}
