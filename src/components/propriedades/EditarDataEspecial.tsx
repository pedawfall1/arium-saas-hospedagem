"use client"

import { Campo } from "@/components/ui/Campo"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { AriumDatePicker } from "@/components/ui/DatePicker"
import { PreviaNoites } from "@/components/propriedades/PreviaNoites"

const inputStyle = {
  backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '12px 16px', color: 'var(--text)', fontSize: '14px', width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
}

/**
 * Edição de um feriado ou de uma regra especial, no mesmo padrão visual do
 * formulário de "Adicionar": rótulo em cima de cada campo, campos do mesmo
 * tamanho, prévia das noites e botões com texto. Regra não tem mínimo de
 * noites, então o campo só aparece para feriado.
 */
export function EditarDataEspecial({
  tipo, dados, onChange, onSalvar, onCancelar, salvando,
  property, dailyRates, rules, holidays,
}: {
  tipo: 'feriado' | 'regra'
  dados: any
  onChange: (dados: any) => void
  onSalvar: () => void
  onCancelar: () => void
  salvando: boolean
  property: any
  dailyRates: any[]
  rules: any[]
  holidays: any[]
}) {
  const campoNome = tipo === 'feriado' ? 'name' : 'label'
  const set = (campo: string, valor: string) => onChange({ ...dados, [campo]: valor })

  // A prévia não deve enxergar o próprio registro em edição, senão as noites
  // de fronteira aparecem com o preço antigo dele.
  const outrasRegras = tipo === 'regra' ? rules.filter((r: any) => r.id !== dados.id) : rules
  const outrosFeriados = tipo === 'feriado' ? holidays.filter((h: any) => h.id !== dados.id) : holidays

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSalvar() }}
      style={{ padding: '20px', borderLeft: '3px solid var(--purple)', borderRadius: '8px' }}
    >
      <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
        {tipo === 'feriado' ? 'Editar feriado' : 'Editar regra'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        <Campo label={tipo === 'feriado' ? 'Nome do feriado' : 'Nome da regra'} style={{ gridColumn: '1 / -1' }}>
          {id => (
            <input id={id} required value={dados[campoNome] || ''} onChange={e => set(campoNome, e.target.value)} style={inputStyle} />
          )}
        </Campo>
        <Campo label="Primeira noite">
          {() => <AriumDatePicker required value={dados.primeira} onChange={v => set('primeira', v)} />}
        </Campo>
        <Campo label="Última noite">
          {() => <AriumDatePicker required value={dados.ultima} onChange={v => set('ultima', v)} />}
        </Campo>
        <Campo label="Preço/noite">
          {id => <MoneyInput id={id} value={dados.price ?? ''} onChange={v => set('price', v)} placeholder={tipo === 'feriado' ? 'Opcional' : 'R$ 0,00'} style={inputStyle} />}
        </Campo>
        {tipo === 'feriado' && (
          <Campo label="Mínimo de noites" hint="Vale para quem faz check-in nestas datas.">
            {id => (
              <input id={id} type="number" min="1" required value={dados.min_nights ?? ''} onChange={e => set('min_nights', e.target.value)} style={inputStyle} />
            )}
          </Campo>
        )}
      </div>

      {dados.primeira && dados.ultima && (
        <PreviaNoites
          property={property} dailyRates={dailyRates} rules={outrasRegras} holidays={outrosFeriados}
          primeira={dados.primeira} ultima={dados.ultima}
          precoDraft={dados.price == null ? '' : String(dados.price)}
          minDraft={tipo === 'feriado' ? String(dados.min_nights ?? '') : undefined}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onCancelar} disabled={salvando} style={{ backgroundColor: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="submit" disabled={salvando} style={{ backgroundColor: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.6 : 1 }}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
