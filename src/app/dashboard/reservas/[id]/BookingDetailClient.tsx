"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/Badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Modal } from "@/components/ui/Modal"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function BookingDetailClient({ booking, tenantName }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [modalType, setModalType] = useState<string | null>(null)
  const [notes, setNotes] = useState(booking.notes || "")
  const [notesSaving, setNotesSaving] = useState(false)

  const updateStatus = async (status: string) => {
    setLoading(true)
    await supabase.from('bookings').update({ status }).eq('id', booking.id)
    setModalType(null)
    setLoading(false)
    router.refresh()
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    await supabase.from('bookings').update({ notes }).eq('id', booking.id)
    setNotesSaving(false)
    router.refresh()
  }

  const handleWhatsApp = () => {
    const phone = booking.guest_phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const isActive = booking.status !== 'cancelled' && booking.status !== 'completed'

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        Reserva: {booking.guest_name}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '40px' }}>
        Detalhes completos da estadia
      </p>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard/reservas" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '14px', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Voltar para Reservas
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border p-6 space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Detalhes do Hóspede</h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Nome: <span className="font-medium" style={{ color: 'var(--text)' }}>{booking.guest_name}</span></p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Telefone: <span className="font-medium" style={{ color: 'var(--text)' }}>{booking.guest_phone}</span></p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>E-mail: <span className="font-medium" style={{ color: 'var(--text)' }}>{booking.guest_email || '-'}</span></p>
              </div>
              <Button onClick={handleWhatsApp} variant="outline" className="gap-2">
                WhatsApp
              </Button>
            </div>

            <hr style={{ borderColor: 'var(--border)' }} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Check-in</p>
                <p className="font-medium text-lg" style={{ color: 'var(--text)' }}>{formatDate(booking.check_in)}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Check-out</p>
                <p className="font-medium text-lg" style={{ color: 'var(--text)' }}>{formatDate(booking.check_out)}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Cabana</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{booking.properties?.name}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Hóspedes</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{booking.guests_count} pessoas</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Observações</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Adicione observações internas sobre a reserva..."
              className="flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <div className="flex justify-end">
              <Button onClick={saveNotes} disabled={notesSaving} size="sm">
                {notesSaving ? "Salvando..." : "Salvar Observação"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border p-6 space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Status da Reserva</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Status Geral:</span>
                <StatusBadge status={booking.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Pagamento:</span>
                <StatusBadge status={booking.payment_status} />
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border)' }} />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Total:</span>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Sinal:</span>
                <span className="text-green-400 font-medium">{formatCurrency(booking.deposit_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2">
                <span style={{ color: 'var(--muted)' }}>Restante no check-in:</span>
                <span style={{ color: 'var(--muted)' }}>{formatCurrency(booking.total_amount - booking.deposit_amount)}</span>
              </div>
            </div>

            {isActive && (
              <div className="space-y-3 pt-4">
                {booking.status !== 'checked_in' && (
                  <Button onClick={() => setModalType('check_in')} className="w-full bg-blue-600 hover:bg-blue-700 hover:text-white text-white">
                    Marcar Check-in
                  </Button>
                )}
                <Button onClick={() => setModalType('completed')} className="w-full bg-green-600 hover:bg-green-700 hover:text-white text-white">
                  Marcar Concluído
                </Button>
                <Button onClick={() => setModalType('cancelled')} variant="danger" className="w-full">
                  Cancelar Reserva
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={!!modalType} onClose={() => setModalType(null)} title="Confirmar Ação">
        <div className="py-4" style={{ color: 'var(--text)' }}>
          Você tem certeza que deseja {modalType === 'cancelled' ? 'cancelar' : modalType === 'check_in' ? 'marcar o check-in' : 'marcar como concluída'} esta reserva?
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" onClick={() => setModalType(null)}>Voltar</Button>
          <Button 
            variant={modalType === 'cancelled' ? 'danger' : 'default'} 
            onClick={() => updateStatus(modalType === 'cancelled' ? 'cancelled' : modalType === 'check_in' ? 'checked_in' : 'completed')}
            disabled={loading}
          >
            {loading ? "Processando..." : "Confirmar"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
