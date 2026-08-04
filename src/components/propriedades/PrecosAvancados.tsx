"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { Campo } from "@/components/ui/Campo"
import { parseMoney } from "@/lib/money"
import { executar } from "@/lib/salvar"

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const input = {
  backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '11px 14px', color: 'var(--text)', fontSize: '15px', width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
}

const secao = {
  paddingTop: '22px', marginTop: '22px', borderTop: '1px solid var(--border)',
}

const tituloSecao = {
  color: 'var(--text)', fontSize: '14px', fontWeight: 700, marginBottom: '4px',
}

const ajuda = {
  color: 'var(--muted)', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5,
}

const grade = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px',
}

/**
 * Tudo que influencia o preço e que antes só existia no banco.
 *
 * Preço de domingo, baixa temporada e pacote de 2 noites já eram usados pelo
 * cálculo do site, mas não tinham tela: a cliente do Chalé não conseguia mudar
 * o próprio preço de domingo sem pedir para alguém mexer no banco.
 */
export function PrecosAvancados({ property }: { property: any }) {
  const supabase = createClient()
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string, tipo: 'ok' | 'err' } | null>(null)

  const inicial = () => ({
    base_price_sunday: property.base_price_sunday == null ? '' : String(property.base_price_sunday),
    low_season_weekday: property.low_season_weekday == null ? '' : String(property.low_season_weekday),
    low_season_weekend: property.low_season_weekend == null ? '' : String(property.low_season_weekend),
    low_season_from_month: String(property.low_season_from_month ?? 1),
    low_season_to_month: String(property.low_season_to_month ?? 8),
    pkg2_weekday_low: property.pkg2_weekday_low == null ? '' : String(property.pkg2_weekday_low),
    pkg2_weekday_high: property.pkg2_weekday_high == null ? '' : String(property.pkg2_weekday_high),
    pkg2_weekend_low: property.pkg2_weekend_low == null ? '' : String(property.pkg2_weekend_low),
    pkg2_weekend_high: property.pkg2_weekend_high == null ? '' : String(property.pkg2_weekend_high),
    cleaning_fee: String(property.cleaning_fee ?? 0),
    pet_fee: String(property.pet_fee ?? 0),
    pet_fee_per_night: !!property.pet_fee_per_night,
    included_guests: String(property.included_guests ?? 2),
    free_guest_age: String(property.free_guest_age ?? 2),
    child_max_age: String(property.child_max_age ?? 12),
    extra_child_fee: String(property.extra_child_fee ?? 0),
    extra_adult_fee: String(property.extra_adult_fee ?? 0),
    deposit_percent: String(property.deposit_percent ?? 50),
    weekly_discount_percent: String(property.weekly_discount_percent ?? 0),
    monthly_discount_percent: String(property.monthly_discount_percent ?? 0),
    max_guests: String(property.max_guests ?? 2),
  })

  const [f, setF] = useState(inicial)
  // Trocar de cabana precisa recarregar o formulário, senão mostra a anterior.
  useEffect(() => { setF(inicial()); setMsg(null) }, [property.id])

  const set = (k: string, v: any) => { setF(p => ({ ...p, [k]: v })); setMsg(null) }

  /** Converte campo de dinheiro opcional: vazio vira NULL (usa o padrão). */
  const opcional = (v: string, rotulo: string): number | null => {
    if (v.trim() === '') return null
    const n = parseMoney(v)
    if (isNaN(n) || n < 0) throw new Error(`Valor inválido em "${rotulo}". Use por exemplo 800 ou 800,50.`)
    return n
  }
  const obrigatorio = (v: string, rotulo: string): number => {
    const n = parseMoney(v)
    if (isNaN(n) || n < 0) throw new Error(`Valor inválido em "${rotulo}".`)
    return n
  }
  const pct = (v: string, rotulo: string): number => {
    const n = parseMoney(v)
    if (isNaN(n) || n < 0 || n > 100) throw new Error(`"${rotulo}" precisa ser entre 0 e 100.`)
    return n
  }

  const salvar = async () => {
    setMsg(null)
    let payload: any
    try {
      payload = {
        base_price_sunday: opcional(f.base_price_sunday, 'Domingo'),
        low_season_weekday: opcional(f.low_season_weekday, 'Baixa temporada — dias úteis'),
        low_season_weekend: opcional(f.low_season_weekend, 'Baixa temporada — fim de semana'),
        low_season_from_month: Number(f.low_season_from_month),
        low_season_to_month: Number(f.low_season_to_month),
        pkg2_weekday_low: opcional(f.pkg2_weekday_low, 'Pacote semana (baixa)'),
        pkg2_weekday_high: opcional(f.pkg2_weekday_high, 'Pacote semana (alta)'),
        pkg2_weekend_low: opcional(f.pkg2_weekend_low, 'Pacote fim de semana (baixa)'),
        pkg2_weekend_high: opcional(f.pkg2_weekend_high, 'Pacote fim de semana (alta)'),
        cleaning_fee: obrigatorio(f.cleaning_fee, 'Taxa de limpeza'),
        pet_fee: obrigatorio(f.pet_fee, 'Taxa de pet'),
        pet_fee_per_night: f.pet_fee_per_night,
        included_guests: Math.max(1, Number(f.included_guests) || 1),
        free_guest_age: Math.min(17, Math.max(0, Number(f.free_guest_age) || 0)),
        child_max_age: Math.min(17, Math.max(0, Number(f.child_max_age) || 0)),
        extra_child_fee: obrigatorio(f.extra_child_fee, 'Criança adicional'),
        extra_adult_fee: obrigatorio(f.extra_adult_fee, 'Adulto adicional'),
        deposit_percent: pct(f.deposit_percent, 'Sinal'),
        weekly_discount_percent: pct(f.weekly_discount_percent, 'Desconto semanal'),
        monthly_discount_percent: pct(f.monthly_discount_percent, 'Desconto mensal'),
        max_guests: Math.max(1, Number(f.max_guests) || 1),
      }
    } catch (e: any) {
      setMsg({ texto: e.message, tipo: 'err' })
      return
    }

    setSalvando(true)
    const r = await executar(supabase.from('properties').update(payload).eq('id', property.id))
    setSalvando(false)
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    setMsg({ texto: 'Configurações salvas.', tipo: 'ok' })
    router.refresh()
  }

  return (
    <div style={{
      backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '28px', marginTop: '24px',
    }}>
      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          backgroundColor: 'var(--purple-dim)', color: 'var(--accent)', borderRadius: '6px',
          padding: '3px 12px', fontSize: '13px', fontWeight: 600,
        }}>04</span>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Preços avançados e taxas</h2>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '4px' }}>
        Deixe em branco o que não usar — o sistema aplica o preço padrão.
      </p>

      {/* Domingo */}
      <div style={secao}>
        <h3 style={tituloSecao}>Domingo</h3>
        <p style={ajuda}>Sem valor aqui, domingo é cobrado como fim de semana.</p>
        <div style={grade}>
          <Campo label="Preço de domingo (R$)">
            {id => <MoneyInput id={id} value={f.base_price_sunday} onChange={v => set('base_price_sunday', v)} style={input} />}
          </Campo>
          <Campo label="Capacidade máxima" hint="Número de hóspedes que a cabana comporta.">
            {id => (
              <input id={id} type="number" min="1" value={f.max_guests}
                onChange={e => set('max_guests', e.target.value)} style={input} />
            )}
          </Campo>
        </div>
      </div>

      {/* Baixa temporada */}
      <div style={secao}>
        <h3 style={tituloSecao}>Baixa temporada</h3>
        <p style={ajuda}>
          Preços reduzidos nos meses mais fracos. O período pode virar o ano (ex.: novembro a março).
        </p>
        <div style={grade}>
          <Campo label="De">
            {id => (
              <select id={id} value={f.low_season_from_month} onChange={e => set('low_season_from_month', e.target.value)} style={input}>
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            )}
          </Campo>
          <Campo label="Até">
            {id => (
              <select id={id} value={f.low_season_to_month} onChange={e => set('low_season_to_month', e.target.value)} style={input}>
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            )}
          </Campo>
          <Campo label="Dias úteis na baixa (R$)">
            {id => <MoneyInput id={id} value={f.low_season_weekday} onChange={v => set('low_season_weekday', v)} style={input} />}
          </Campo>
          <Campo label="Fim de semana na baixa (R$)">
            {id => <MoneyInput id={id} value={f.low_season_weekend} onChange={v => set('low_season_weekend', v)} style={input} />}
          </Campo>
        </div>
      </div>

      {/* Pacote 2 noites */}
      <div style={secao}>
        <h3 style={tituloSecao}>Pacote de 2 noites</h3>
        <p style={ajuda}>
          Valor fechado quando a reserva tem exatamente 2 noites. Preencha os quatro para ativar.
        </p>
        <div style={grade}>
          <Campo label="Semana — baixa (R$)">
            {id => <MoneyInput id={id} value={f.pkg2_weekday_low} onChange={v => set('pkg2_weekday_low', v)} style={input} />}
          </Campo>
          <Campo label="Semana — alta (R$)">
            {id => <MoneyInput id={id} value={f.pkg2_weekday_high} onChange={v => set('pkg2_weekday_high', v)} style={input} />}
          </Campo>
          <Campo label="Fim de semana — baixa (R$)">
            {id => <MoneyInput id={id} value={f.pkg2_weekend_low} onChange={v => set('pkg2_weekend_low', v)} style={input} />}
          </Campo>
          <Campo label="Fim de semana — alta (R$)">
            {id => <MoneyInput id={id} value={f.pkg2_weekend_high} onChange={v => set('pkg2_weekend_high', v)} style={input} />}
          </Campo>
        </div>
      </div>

      {/* Taxas */}
      <div style={secao}>
        <h3 style={tituloSecao}>Taxas</h3>
        <p style={ajuda}>Cobranças além da diária.</p>
        <div style={grade}>
          <Campo label="Taxa de limpeza (R$)" hint="Cobrada uma vez por reserva.">
            {id => <MoneyInput id={id} value={f.cleaning_fee} onChange={v => set('cleaning_fee', v)} style={input} />}
          </Campo>
          <Campo label="Taxa de pet (R$)">
            {id => <MoneyInput id={id} value={f.pet_fee} onChange={v => set('pet_fee', v)} style={input} />}
          </Campo>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.pet_fee_per_night}
            onChange={e => set('pet_fee_per_night', e.target.checked)}
            style={{ width: '16px', height: '16px' }} />
          <span style={{ color: 'var(--text)', fontSize: '14px' }}>Cobrar a taxa de pet por noite (em vez de uma vez por reserva)</span>
        </label>
      </div>

      {/* Hóspede adicional por idade */}
      <div style={secao}>
        <h3 style={tituloSecao}>Hóspede adicional por idade</h3>
        <p style={ajuda}>
          A diária cobre a ocupação base; cada pessoa a mais é cobrada por noite conforme a idade.
          Deixe os valores em zero para não cobrar por pessoa.
        </p>
        <div style={grade}>
          <Campo label="A diária cobre quantos hóspedes" hint="Acima disso, começa a cobrança por pessoa.">
            {id => (
              <input id={id} type="number" min="1" value={f.included_guests}
                onChange={e => set('included_guests', e.target.value)} style={input} />
            )}
          </Campo>
          <Campo label="Bebês até (anos)" hint="Nessa idade ou menos: não paga e não conta.">
            {id => (
              <input id={id} type="number" min="0" max="17" value={f.free_guest_age}
                onChange={e => set('free_guest_age', e.target.value)} style={input} />
            )}
          </Campo>
          <Campo label="Criança até (anos)" hint="Acima disso, cobra como adulto.">
            {id => (
              <input id={id} type="number" min="0" max="17" value={f.child_max_age}
                onChange={e => set('child_max_age', e.target.value)} style={input} />
            )}
          </Campo>
          <Campo label="Criança adicional (R$/noite)">
            {id => <MoneyInput id={id} value={f.extra_child_fee} onChange={v => set('extra_child_fee', v)} style={input} />}
          </Campo>
          <Campo label="Adulto adicional (R$/noite)">
            {id => <MoneyInput id={id} value={f.extra_adult_fee} onChange={v => set('extra_adult_fee', v)} style={input} />}
          </Campo>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '12px', lineHeight: 1.5 }}>
          Exemplo: diária cobre 2, bebês até 2, criança até 12, criança R$ 100, adulto R$ 200.
          Um casal com 1 filho de 8 anos paga R$ 100 a mais por noite; um bebê de 1 ano não paga.
        </p>
      </div>

      {/* Sinal e descontos */}
      <div style={secao}>
        <h3 style={tituloSecao}>Sinal e descontos</h3>
        <p style={ajuda}>Descontos por permanência são aplicados sozinhos quando a estadia é longa.</p>
        <div style={grade}>
          <Campo label="Sinal (%)" hint="Percentual pedido para confirmar a reserva.">
            {id => (
              <input id={id} type="number" min="0" max="100" value={f.deposit_percent}
                onChange={e => set('deposit_percent', e.target.value)} style={input} />
            )}
          </Campo>
          <Campo label="Desconto semanal (%)" hint="A partir de 7 noites.">
            {id => (
              <input id={id} type="number" min="0" max="100" value={f.weekly_discount_percent}
                onChange={e => set('weekly_discount_percent', e.target.value)} style={input} />
            )}
          </Campo>
          <Campo label="Desconto mensal (%)" hint="A partir de 28 noites.">
            {id => (
              <input id={id} type="number" min="0" max="100" value={f.monthly_discount_percent}
                onChange={e => set('monthly_discount_percent', e.target.value)} style={input} />
            )}
          </Campo>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
        {msg && (
          <p style={{
            fontSize: '13.5px', fontWeight: 500, margin: 0,
            color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
          }}>
            {msg.texto}
          </p>
        )}
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            backgroundColor: 'var(--purple)', border: 'none', color: '#fff',
            borderRadius: '9px', padding: '12px 26px', fontSize: '14px', fontWeight: 600,
            cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1,
          }}
        >
          {salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}
