"use client"

import { addDays, format, parseISO } from "date-fns"
import { noitesEntre } from "@/lib/datasEspeciais"
import { precoDoDia } from "@/lib/precoDoDia"
import { parseMoney } from "@/lib/money"
import { formatCurrency } from "@/lib/utils"

/**
 * Prévia das noites afetadas ANTES de salvar. Mostra cada noite coberta com o
 * preço que a regra/feriado vai aplicar, e as noites de fronteira (uma antes e
 * uma depois) com o preço normal — para o buraco aparecer na hora.
 */
export function PreviaNoites({
  property, dailyRates, rules, holidays,
  primeira, ultima, precoDraft, minDraft,
}: {
  property: any
  dailyRates: any[]
  rules: any[]
  holidays: any[]
  primeira: string
  ultima: string
  precoDraft: string
  minDraft?: string
}) {
  if (!primeira || !ultima) return null
  const cobertas = noitesEntre(primeira, ultima)
  if (cobertas.length === 0) {
    return (
      <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px' }}>
        A última noite não pode ser antes da primeira.
      </p>
    )
  }

  const precoNum = parseMoney(precoDraft)
  const temPreco = precoDraft !== '' && !isNaN(precoNum) && precoNum > 0

  const iso = (d: Date) => format(d, 'yyyy-MM-dd')
  const antes = iso(addDays(parseISO(primeira), -1))
  const depois = iso(addDays(parseISO(ultima), 1))

  const dailyDoImovel = dailyRates.filter((d: any) => d.property_id === property.id)
  const rulesDoImovel = rules.filter((r: any) => r.property_id === property.id)
  const holDoImovel = holidays.filter((h: any) => h.property_id === property.id)
  const precoNormal = (data: string) =>
    precoDoDia(data, property, dailyDoImovel, rulesDoImovel, holDoImovel).preco

  const rotulo = (data: string) => {
    const d = parseISO(data)
    return format(d, 'EEEEEE dd/MM').replace('.', '')
  }

  const linhas = [
    { data: antes, dentro: false },
    ...cobertas.map(d => ({ data: d, dentro: true })),
    { data: depois, dentro: false },
  ]

  return (
    <div style={{
      marginTop: '14px', padding: '14px 16px', borderRadius: '10px',
      backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
    }}>
      <p style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
        Prévia — como ficam as noites{minDraft && Number(minDraft) > 1 ? ` · mínimo ${minDraft} noites para check-in nestas datas` : ''}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: '6px' }}>
        {linhas.map(({ data, dentro }) => {
          const valor = dentro
            ? (temPreco ? precoNum : precoNormal(data))
            : precoNormal(data)
          return (
            <div key={data} style={{
              padding: '8px 10px', borderRadius: '8px',
              backgroundColor: dentro ? 'rgba(124,58,237,0.12)' : 'transparent',
              border: `1px solid ${dentro ? 'var(--purple)' : 'var(--border)'}`,
              opacity: dentro ? 1 : 0.6,
            }}>
              <p style={{ color: 'var(--text)', fontSize: '12px', textTransform: 'capitalize' }}>{rotulo(data)}</p>
              <p style={{ color: dentro ? 'var(--accent)' : 'var(--muted)', fontSize: '13px', fontWeight: 700 }}>
                {valor === null ? '—' : formatCurrency(valor)}
                {!dentro && <span style={{ fontSize: '10px', fontWeight: 400 }}> normal</span>}
              </p>
            </div>
          )
        })}
      </div>
      {!temPreco && (
        <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '8px' }}>
          Sem preço informado, as noites mantêm o valor normal.
        </p>
      )}
    </div>
  )
}
