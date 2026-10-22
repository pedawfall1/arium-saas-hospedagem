"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, CalendarDays, User, Wallet, StickyNote, AlertTriangle } from "lucide-react"
import { AriumDatePicker } from "@/components/ui/DatePicker"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { parseMoney, parseMoneyOrZero } from "@/lib/money"
import { parseISO, eachDayOfInterval, addDays, isAfter, startOfDay, parse } from "date-fns"
import { useEffect, useMemo } from "react"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function NovaReservaClient({ properties, blockedDates = [], bookings = [], holidays = [] }: { properties: any[], blockedDates?: any[], bookings?: any[], holidays?: any[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    property_id: properties[0]?.id || "",
    guest_name: "",
    guest_phone: "",
    guest_cpf: "",
    check_in: "",
    check_out: "",
    guests_count: 2,
    total_amount: "",
    deposit_amount: "",
    notes: ""
  })

  const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null)

  const [holidayWarningAccepted, setHolidayWarningAccepted] = useState(false)

  const activeHolidayWarning = useMemo(() => {
    if (!formData.check_in || !formData.check_out) return null
    const checkIn = formData.check_in
    const checkOut = formData.check_out
    
    const pid = formData.property_id
    const propertyHolidays = holidays.filter((h: any) => h.property_id === pid)

    for (const h of propertyHolidays) {
      const touches = checkIn < h.date_to && checkOut > h.date_from
      const coversFull = checkIn <= h.date_from && checkOut >= h.date_to
      
      if (touches && !coversFull) {
        return h
      }
    }
    return null
  }, [formData.check_in, formData.check_out, formData.property_id, holidays])

  const { unavailableCheckIn, unavailableCheckOut } = useMemo(() => {
    const datesIn: Date[] = []
    const datesOut: Date[] = []
    const pid = formData.property_id

    blockedDates.forEach((b: any) => {
      if (b.property_id === pid) {
        const d = parseISO(b.date)
        datesIn.push(d)
        datesOut.push(addDays(d, 1))
      }
    })

    bookings.forEach((b: any) => {
      if (b.property_id === pid) {
        const start = parseISO(b.check_in)
        const end = parseISO(b.check_out)
        if (start < end) {
          // Check-in blocked: from start up to end - 1
          const intervalIn = eachDayOfInterval({ start, end: addDays(end, -1) })
          datesIn.push(...intervalIn)

          // Check-out blocked: from start + 1 up to end
          const intervalOut = eachDayOfInterval({ start: addDays(start, 1), end })
          datesOut.push(...intervalOut)
        }
      }
    })

    return {
      unavailableCheckIn: datesIn.sort((a, b) => a.getTime() - b.getTime()),
      unavailableCheckOut: datesOut.sort((a, b) => a.getTime() - b.getTime())
    }
  }, [blockedDates, bookings, formData.property_id])

  const maxCheckOutDate = useMemo(() => {
    if (!formData.check_in) return undefined
    const checkInDate = startOfDay(parse(formData.check_in, 'yyyy-MM-dd', new Date()))
    const nextBlocked = unavailableCheckIn.find(d => isAfter(d, checkInDate))
    return nextBlocked || undefined
  }, [formData.check_in, unavailableCheckIn])

  const formatCurrency = (val: string | number) => {
    if (val === "" || val === null || val === undefined) return ""
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.name === 'guest_cpf' ? formatCpf(e.target.value) : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setToast(null)

    try {
      if (!formData.property_id || !formData.check_in || !formData.check_out) {
        throw new Error("Por favor, preencha a cabana, check-in e check-out.")
      }

      if (formData.check_in >= formData.check_out) {
        throw new Error("A data de check-out deve ser maior que a de check-in.")
      }

      const guests = Math.max(1, Number(formData.guests_count || 1))
      // parseMoneyOrZero aceita "2.000,00"; Number() devolveria NaN e gravaria 0.
      const totalAmount = parseMoneyOrZero(formData.total_amount)
      const depositAmount = parseMoneyOrZero(formData.deposit_amount)

      if (formData.total_amount.trim() !== '' && isNaN(parseMoney(formData.total_amount))) {
        throw new Error('Valor total inválido. Use por exemplo 2000 ou 2.000,00.')
      }
      if (formData.deposit_amount.trim() !== '' && isNaN(parseMoney(formData.deposit_amount))) {
        throw new Error('Valor do sinal inválido. Use por exemplo 500 ou 500,00.')
      }
      const guestPhone = formData.guest_phone || "00000000000"
      const guestName = formData.guest_name || "Hóspede (Reserva Manual)"

      const { data, error } = await supabase.from('bookings').insert([{
        property_id: formData.property_id,
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_cpf: formData.guest_cpf || null,
        check_in: formData.check_in,
        check_out: formData.check_out,
        guests_count: guests,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        notes: formData.notes || 'Reserva manual',
        status: 'confirmed',
        payment_status: 'fully_paid'
      }]).select()

      if (error) {
        throw error
      }

      let avisoBloqueio: string | null = null

      // Inserir datas bloqueadas apenas se a reserva der certo
      if (data && data.length > 0) {
        const datesToBlock = []
        const current = new Date(formData.check_in + 'T12:00:00')
        const end = new Date(formData.check_out + 'T12:00:00')
        while (current < end) {
          datesToBlock.push({
            property_id: formData.property_id,
            date: current.toISOString().split('T')[0],
            reason: 'Reserva manual: ' + guestName,
            guest_name: guestName,
            // Vincula o bloqueio à reserva para que cancelá-la libere estas datas.
            booking_id: data[0].id
          })
          current.setDate(current.getDate() + 1)
        }
        if (datesToBlock.length > 0) {
          const { error: blockError } = await supabase.from('blocked_dates').insert(datesToBlock)
          if (blockError) {
            console.error('Erro ao bloquear datas:', blockError)
            // A reserva já existe; sem os bloqueios o calendário mostra as noites
            // livres. Antes isto só ia pro console e a tela dizia "sucesso".
            avisoBloqueio = 'Reserva salva, mas as datas NÃO foram marcadas no calendário. Abra a reserva e confira, ou bloqueie as noites pelo Calendário.'
          }
        }
      }

      setSuccess(true)
      setToast({ msg: avisoBloqueio ?? "Reserva salva com sucesso!", type: avisoBloqueio ? 'error' : 'success' })
      setTimeout(() => {
        router.push('/dashboard/reservas')
      }, avisoBloqueio ? 6000 : 1500)
    } catch (err: any) {
      console.error(err)
      const msg = err.message || "Erro desconhecido ao salvar reserva."
      setErrorMsg(msg)
      setToast({ msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Preço da tabela (mesma função que o site usa) para as datas escolhidas.
  // Guardado junto com a chave das datas: se a pessoa muda algo, o valor antigo
  // simplesmente deixa de valer, sem precisar zerar estado dentro do efeito.
  const chaveTabela = formData.property_id && formData.check_in && formData.check_out && formData.check_in < formData.check_out
    ? `${formData.property_id}|${formData.check_in}|${formData.check_out}` : ''
  const [tabela, setTabela] = useState<{ chave: string, total: number | null } | null>(null)
  useEffect(() => {
    if (!chaveTabela) return
    let cancelado = false
    const [pid, ci, co] = chaveTabela.split('|')
    supabase.rpc('calculate_price', { p_property_id: pid, p_check_in: ci, p_check_out: co }).then(({ data, error }) => {
      if (cancelado) return
      const total = Number(data?.total)
      setTabela({ chave: chaveTabela, total: error || isNaN(total) ? null : total })
    })
    return () => { cancelado = true }
  }, [chaveTabela, supabase])
  const precoTabela = tabela && tabela.chave === chaveTabela ? tabela.total : undefined

  const cabanaAtual = properties.find((p: any) => p.id === formData.property_id)
  const percentualSinal = Number(cabanaAtual?.deposit_percent ?? 50)
  const noites = formData.check_in && formData.check_out && formData.check_in < formData.check_out
    ? differenceInCalendarDays(parseISO(formData.check_out), parseISO(formData.check_in)) : 0
  const totalNum = parseMoneyOrZero(formData.total_amount)
  const sinalNum = parseMoneyOrZero(formData.deposit_amount)
  const dataCurta = (iso: string) => format(parseISO(iso), "EEE, dd/MM", { locale: ptBR })
  const bloqueado = loading || success || (activeHolidayWarning !== null && !holidayWarningAccepted)

  const usarTabela = () => {
    if (precoTabela == null) return
    setFormData(prev => ({
      ...prev,
      total_amount: String(precoTabela),
      // Preenche o sinal junto se ainda estiver vazio.
      deposit_amount: prev.deposit_amount.trim() === '' ? String(Math.round(precoTabela * percentualSinal) / 100) : prev.deposit_amount,
    }))
  }

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
      <style>{CSS_NOVA}</style>
      <button type="button" onClick={() => router.push('/dashboard/reservas')} className="nova-voltar">
        <ArrowLeft size={16} /> Voltar para reservas
      </button>

      <h1 style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>Nova reserva</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
        Para reservas fechadas por fora do site (WhatsApp, telefone, Airbnb). As noites ficam bloqueadas no calendário.
      </p>

      {errorMsg && <div className="nova-aviso erro">{errorMsg}</div>}
      {success && <div className="nova-aviso ok">Reserva salva! Voltando para a lista...</div>}

      <form onSubmit={handleSubmit} className="nova-grade">
        <div style={{ minWidth: 0 }}>
          {/* Estadia */}
          <section className="nova-card">
            <h2><CalendarDays size={17} /> Estadia</h2>
            {properties.length > 1 && (
              <div style={{ marginBottom: '16px' }}>
                <span className="nova-rotulo">Cabana</span>
                <div className="nova-cabanas">
                  {properties.map((p: any) => (
                    <button
                      key={p.id} type="button"
                      className={formData.property_id === p.id ? 'ativa' : ''}
                      onClick={() => { setFormData(prev => ({ ...prev, property_id: p.id, check_in: '', check_out: '' })); setHolidayWarningAccepted(false) }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="nova-campos">
              <label>
                <span className="nova-rotulo">Check-in *</span>
                <AriumDatePicker
                  required value={formData.check_in}
                  onChange={(dateStr: string) => setFormData(prev => ({ ...prev, check_in: dateStr, check_out: prev.check_out && prev.check_out <= dateStr ? '' : prev.check_out }))}
                  placeholder="dd/mm/aaaa" excludeDates={unavailableCheckIn}
                />
              </label>
              <label>
                <span className="nova-rotulo">Check-out *</span>
                <AriumDatePicker
                  required value={formData.check_out}
                  onChange={(dateStr: string) => setFormData(prev => ({ ...prev, check_out: dateStr }))}
                  placeholder="dd/mm/aaaa" excludeDates={unavailableCheckOut}
                  minDate={formData.check_in ? addDays(parse(formData.check_in, 'yyyy-MM-dd', new Date()), 1) : undefined}
                  maxDate={maxCheckOutDate}
                />
              </label>
              <label>
                <span className="nova-rotulo">Hóspedes</span>
                <input type="number" name="guests_count" min="1" max={cabanaAtual?.max_guests || undefined} value={formData.guests_count} onChange={handleChange} style={campo} />
              </label>
            </div>
            <p className="nova-ajuda">Datas já ocupadas ficam desabilitadas no calendário.</p>

            {activeHolidayWarning && (
              <div className="nova-feriado">
                <p><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Essas datas pegam só parte do feriado <strong>{activeHolidayWarning.name}</strong> ({activeHolidayWarning.date_from.split('-').reverse().join('/')} a {activeHolidayWarning.date_to.split('-').reverse().join('/')}). No site, o hóspede precisaria pegar o período completo.</span>
                </p>
                <label>
                  <input type="checkbox" checked={holidayWarningAccepted} onChange={(e) => setHolidayWarningAccepted(e.target.checked)} />
                  Criar mesmo assim
                </label>
              </div>
            )}
          </section>

          {/* Hóspede */}
          <section className="nova-card">
            <h2><User size={17} /> Hóspede</h2>
            <div className="nova-campos">
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="nova-rotulo">Nome completo</span>
                <input type="text" name="guest_name" value={formData.guest_name} onChange={handleChange} style={campo} placeholder="Ex.: João da Silva" />
              </label>
              <label>
                <span className="nova-rotulo">WhatsApp</span>
                <input type="tel" name="guest_phone" value={formData.guest_phone} onChange={handleChange} style={campo} placeholder="(49) 99999-9999" />
              </label>
              <label>
                <span className="nova-rotulo">CPF</span>
                <input type="text" name="guest_cpf" inputMode="numeric" value={formData.guest_cpf} onChange={handleChange} style={campo} placeholder="000.000.000-00" />
              </label>
            </div>
            <p className="nova-ajuda">Tudo opcional: dá para completar depois na página da reserva.</p>
          </section>

          {/* Valores */}
          <section className="nova-card">
            <h2><Wallet size={17} /> Valores</h2>
            {chaveTabela && (
              <div className="nova-tabela">
                {precoTabela === undefined ? (
                  <span>Calculando o preço da tabela...</span>
                ) : precoTabela === null ? (
                  <span>Não foi possível calcular o preço da tabela para essas datas.</span>
                ) : (
                  <>
                    <span>Preço da tabela para {noites} {noites === 1 ? 'noite' : 'noites'}: <strong>{formatCurrency(precoTabela)}</strong></span>
                    <button type="button" onClick={usarTabela}>Usar este valor</button>
                  </>
                )}
              </div>
            )}
            <div className="nova-campos">
              <label>
                <span className="nova-rotulo">Valor total</span>
                <MoneyInput value={formData.total_amount} onChange={v => setFormData(prev => ({ ...prev, total_amount: v }))} style={campo} />
              </label>
              <label>
                <span className="nova-rotulo">Sinal recebido</span>
                <MoneyInput value={formData.deposit_amount} onChange={v => setFormData(prev => ({ ...prev, deposit_amount: v }))} style={campo} />
                {totalNum > 0 && (
                  <button type="button" className="nova-link" onClick={() => setFormData(prev => ({ ...prev, deposit_amount: String(Math.round(totalNum * percentualSinal) / 100) }))}>
                    Usar {percentualSinal}% do total ({formatCurrency(Math.round(totalNum * percentualSinal) / 100)})
                  </button>
                )}
              </label>
            </div>
          </section>

          {/* Observações */}
          <section className="nova-card">
            <h2><StickyNote size={17} /> Observações</h2>
            <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} style={{ ...campo, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} placeholder="Pacote, pedido especial, de onde veio a reserva..." />
          </section>
        </div>

        {/* Resumo */}
        <aside className="nova-resumo">
          <h2>Resumo</h2>
          <dl>
            <div><dt>Cabana</dt><dd>{cabanaAtual?.name || '—'}</dd></div>
            <div><dt>Entrada</dt><dd>{formData.check_in ? dataCurta(formData.check_in) : '—'}</dd></div>
            <div><dt>Saída</dt><dd>{formData.check_out ? dataCurta(formData.check_out) : '—'}</dd></div>
            <div><dt>Noites</dt><dd>{noites || '—'}</dd></div>
            <div><dt>Hóspedes</dt><dd>{formData.guests_count || '—'}</dd></div>
          </dl>
          <dl className="nova-resumo-valores">
            <div><dt>Total</dt><dd>{totalNum > 0 ? formatCurrency(totalNum) : '—'}</dd></div>
            <div><dt>Sinal</dt><dd>{sinalNum > 0 ? formatCurrency(sinalNum) : '—'}</dd></div>
            <div><dt>Restante</dt><dd>{totalNum > 0 ? formatCurrency(Math.max(0, totalNum - sinalNum)) : '—'}</dd></div>
          </dl>
          <button type="submit" disabled={bloqueado} className="nova-btn-primario">
            {loading ? 'Salvando...' : 'Criar reserva'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard/reservas')} className="nova-btn-secundario">Cancelar</button>
          {activeHolidayWarning && !holidayWarningAccepted && (
            <p className="nova-ajuda" style={{ textAlign: 'center', marginTop: '8px' }}>Confirme o aviso do feriado para criar.</p>
          )}
        </aside>
      </form>

      {toast && (
        <div className={`nova-toast ${toast.type}`} role="status">
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} aria-label="Fechar">✕</button>
        </div>
      )}
    </div>
  )
}

const campo: React.CSSProperties = {
  padding: '11px 14px', fontSize: '14px', width: '100%', outline: 'none', boxSizing: 'border-box', color: 'var(--text)',
}

const CSS_NOVA = `
.nova-voltar { display: inline-flex; align-items: center; gap: 8px; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 14px; font-weight: 500; margin-bottom: 20px; padding: 0; }
.nova-voltar:hover { color: var(--text); }
.nova-grade { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
.nova-card { background-color: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; }
.nova-card h2 { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.nova-card h2 svg { color: var(--accent); }
.nova-campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
.nova-campos label { display: flex; flex-direction: column; min-width: 0; }
.nova-rotulo { display: block; color: var(--muted); font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.nova-ajuda { color: var(--muted); font-size: 12px; margin-top: 10px; }
.nova-cabanas { display: flex; gap: 8px; flex-wrap: wrap; }
.nova-cabanas button { height: 38px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--field-border); background: transparent; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; }
.nova-cabanas button.ativa { background-color: var(--purple); border-color: var(--purple); color: #fff; font-weight: 600; }
.nova-feriado { margin-top: 16px; padding: 14px 16px; border-radius: 12px; background-color: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.4); }
.nova-feriado p { display: flex; gap: 10px; color: var(--warning); font-size: 13px; line-height: 1.5; margin-bottom: 10px; }
.nova-feriado label { display: inline-flex; align-items: center; gap: 8px; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; padding-left: 26px; }
.nova-feriado input { width: 16px; height: 16px; accent-color: var(--purple); }
.nova-tabela { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 14px; margin-bottom: 16px; border-radius: 12px; background-color: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.25); color: var(--text); font-size: 13px; }
.nova-tabela strong { font-size: 14px; }
.nova-tabela button { height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--purple); background: transparent; color: var(--accent); font-size: 13px; font-weight: 600; cursor: pointer; }
.nova-tabela button:hover { background-color: rgba(124,58,237,0.12); }
.nova-link { align-self: flex-start; margin-top: 6px; background: none; border: none; padding: 0; color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; }
.nova-link:hover { text-decoration: underline; }
.nova-resumo { position: sticky; top: 24px; background-color: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
.nova-resumo h2 { color: var(--text); font-size: 16px; font-weight: 700; margin-bottom: 14px; }
.nova-resumo dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 14px; }
.nova-resumo dt { color: var(--muted); }
.nova-resumo dd { color: var(--text); font-weight: 500; text-align: right; }
.nova-resumo-valores { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 8px; }
.nova-resumo-valores > div:first-child dd { font-weight: 700; font-size: 16px; }
.nova-btn-primario { width: 100%; height: 46px; margin-top: 16px; border-radius: 12px; border: none; background-color: var(--purple); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
.nova-btn-primario:disabled { opacity: 0.55; cursor: not-allowed; }
.nova-btn-secundario { width: 100%; height: 40px; margin-top: 8px; border-radius: 12px; border: 1px solid var(--field-border); background: transparent; color: var(--muted); font-size: 14px; font-weight: 500; cursor: pointer; }
.nova-aviso { border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; font-size: 14px; font-weight: 500; }
.nova-aviso.erro { background-color: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--danger); }
.nova-aviso.ok { background-color: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: var(--success); }
.nova-toast { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; align-items: center; gap: 12px; max-width: 420px; padding: 14px 18px; border-radius: 12px; color: #fff; font-size: 14px; font-weight: 500; box-shadow: 0 12px 32px rgba(0,0,0,0.35); }
.nova-toast.success { background-color: #16a34a; }
.nova-toast.error { background-color: #dc2626; }
.nova-toast button { background: none; border: none; color: #fff; cursor: pointer; font-size: 15px; }
@media (max-width: 1023px) {
  .nova-grade { grid-template-columns: minmax(0, 1fr); }
  .nova-resumo { position: static; }
}
@media (max-width: 767px) {
  .nova-card { padding: 18px 16px; }
  .nova-toast { left: 16px; right: 16px; bottom: 16px; }
}
`
