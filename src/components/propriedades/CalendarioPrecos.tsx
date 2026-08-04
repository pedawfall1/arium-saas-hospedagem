"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { precoDoDia } from "@/lib/precoDoDia"
import { MoneyInput } from "@/components/ui/MoneyInput"
import { Campo } from "@/components/ui/Campo"
import { parseMoney } from "@/lib/money"
import { executar } from "@/lib/salvar"

const input = {
  backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '10px 13px', color: 'var(--text)', fontSize: '15px', width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
}

/**
 * Calendário de preços: clicar no dia (ou arrastar a seleção por vários) e
 * definir preço e/ou mínimo de noites daquela data exata.
 *
 * É o que substitui a gambiarra de criar um "feriado" por par de datas — hoje
 * há 48 feriados cadastrados, com "natal" repetido 8 vezes.
 */
export function CalendarioPrecos({ property, dailyRates, rules, holidays }: any) {
  const supabase = createClient()
  const router = useRouter()

  const [mes, setMes] = useState(startOfMonth(new Date()))
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [preco, setPreco] = useState('')
  const [minNoites, setMinNoites] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string, tipo: 'ok' | 'err' } | null>(null)

  const daily = useMemo(
    () => dailyRates.filter((d: any) => d.property_id === property.id),
    [dailyRates, property.id]
  )
  const regras = useMemo(
    () => rules.filter((r: any) => r.property_id === property.id),
    [rules, property.id]
  )
  const feriados = useMemo(
    () => holidays.filter((h: any) => h.property_id === property.id),
    [holidays, property.id]
  )

  const dias = eachDayOfInterval({
    start: startOfWeek(mes),
    end: endOfWeek(endOfMonth(mes)),
  })

  const hoje = startOfMonth(new Date())

  const alternar = (dataStr: string) => {
    setMsg(null)
    setSelecionados(s => s.includes(dataStr) ? s.filter(d => d !== dataStr) : [...s, dataStr])
  }

  const selecionarMes = () => {
    setMsg(null)
    const doMes = dias.filter(d => isSameMonth(d, mes)).map(d => format(d, 'yyyy-MM-dd'))
    const todosJa = doMes.every(d => selecionados.includes(d))
    setSelecionados(todosJa ? [] : doMes)
  }

  const aplicar = async () => {
    setMsg(null)
    if (selecionados.length === 0) return

    const temPreco = preco.trim() !== ''
    const temMin = minNoites.trim() !== ''
    if (!temPreco && !temMin) {
      return setMsg({ texto: 'Informe um preço, um mínimo de noites, ou os dois.', tipo: 'err' })
    }

    let valor: number | null = null
    if (temPreco) {
      valor = parseMoney(preco)
      if (isNaN(valor) || valor < 0) {
        return setMsg({ texto: 'Preço inválido. Use por exemplo 900 ou 1.200,50.', tipo: 'err' })
      }
    }
    let min: number | null = null
    if (temMin) {
      min = Number(minNoites)
      if (!Number.isInteger(min) || min < 1 || min > 30) {
        return setMsg({ texto: 'Mínimo de noites precisa ser um número de 1 a 30.', tipo: 'err' })
      }
    }

    // Mantém o que já existe quando a dona preenche só um dos dois campos.
    const linhas = selecionados.map(data => {
      const atual = daily.find((d: any) => d.date === data)
      return {
        property_id: property.id,
        date: data,
        price: temPreco ? valor : (atual?.price ?? null),
        min_nights: temMin ? min : (atual?.min_nights ?? null),
      }
    })

    setSalvando(true)
    const r = await executar(
      supabase.from('daily_rates').upsert(linhas, { onConflict: 'property_id,date' })
    )
    setSalvando(false)
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })

    setMsg({
      texto: `${selecionados.length} ${selecionados.length === 1 ? 'dia atualizado' : 'dias atualizados'}.`,
      tipo: 'ok',
    })
    setSelecionados([])
    setPreco(''); setMinNoites('')
    router.refresh()
  }

  const limpar = async () => {
    setMsg(null)
    if (selecionados.length === 0) return
    setSalvando(true)
    const r = await executar(
      supabase.from('daily_rates').delete().eq('property_id', property.id).in('date', selecionados)
    )
    setSalvando(false)
    if (!r.ok) return setMsg({ texto: r.erro, tipo: 'err' })
    setMsg({ texto: 'Dias voltaram ao preço padrão.', tipo: 'ok' })
    setSelecionados([])
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
        }}>05</span>
        <h2 style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600 }}>Preço por dia</h2>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.55 }}>
        Toque nos dias que quer mudar e defina o preço e/ou o mínimo de noites.
        Serve para aquele feriado que exige 2 diárias, ou para subir o valor de uma data específica.
      </p>

      {/* Navegação do mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMes(m => addMonths(m, -1))}
            disabled={!isBefore(hoje, mes)}
            aria-label="Mês anterior"
            style={{
              padding: '7px', borderRadius: '8px', border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)', color: 'var(--text)',
              cursor: isBefore(hoje, mes) ? 'pointer' : 'not-allowed',
              opacity: isBefore(hoje, mes) ? 1 : 0.35, display: 'flex',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px', textTransform: 'capitalize', minWidth: '150px', textAlign: 'center' }}>
            {format(mes, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setMes(m => addMonths(m, 1))}
            aria-label="Próximo mês"
            style={{
              padding: '7px', borderRadius: '8px', border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', display: 'flex',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={selecionarMes}
          style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
            backgroundColor: 'transparent', color: 'var(--muted)', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Selecionar o mês inteiro
        </button>
      </div>

      {/* Grade */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
        {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d, i) => (
          <div key={i} style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 600, textAlign: 'center', padding: '6px 0' }}>
            {d}
          </div>
        ))}

        {dias.map(dia => {
          const dataStr = format(dia, 'yyyy-MM-dd')
          const doMes = isSameMonth(dia, mes)
          const p = precoDoDia(dataStr, property, daily, regras, feriados)
          const marcado = selecionados.includes(dataStr)
          const temOverride = daily.some((d: any) => d.date === dataStr)

          return (
            <button
              key={dataStr}
              onClick={() => alternar(dataStr)}
              disabled={!doMes}
              title={doMes ? `${p.rotulo} · mínimo ${p.minNoites} noite${p.minNoites !== 1 ? 's' : ''}` : ''}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '3px',
                padding: '7px 6px', minHeight: '62px', borderRadius: '9px', textAlign: 'left',
                cursor: doMes ? 'pointer' : 'default',
                opacity: doMes ? 1 : 0.25,
                backgroundColor: marcado ? 'var(--purple)' : temOverride ? 'var(--purple-dim)' : 'var(--bg)',
                border: `1px solid ${marcado ? 'var(--purple)' : temOverride ? 'var(--purple)' : 'var(--border)'}`,
                transition: 'background-color .12s',
              }}
            >
              <span style={{
                fontSize: '12px', fontWeight: 700,
                color: marcado ? '#fff' : isToday(dia) ? 'var(--accent)' : 'var(--muted)',
              }}>
                {format(dia, 'd')}
              </span>

              <span style={{
                fontSize: '11.5px', fontWeight: 600, lineHeight: 1.2,
                color: marcado ? '#fff' : p.personalizado ? 'var(--accent)' : 'var(--text)',
              }}>
                {p.preco === null ? '—' : p.preco.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>

              {p.minNoites > 1 && (
                <span style={{
                  fontSize: '10px', lineHeight: 1,
                  color: marcado ? 'rgba(255,255,255,.85)' : 'var(--muted)',
                }}>
                  mín {p.minNoites}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '12px', lineHeight: 1.5 }}>
        Valores em roxo são personalizados (preço do dia, regra ou feriado).
        Dias de semana reservados sozinhos usam o preço de <strong>Isolada Dia Útil</strong>.
      </p>

      {/* Ações da seleção */}
      {selecionados.length > 0 && (
        <div style={{
          marginTop: '18px', padding: '18px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg)', border: '1px solid var(--purple)',
        }}>
          <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>
            {selecionados.length} {selecionados.length === 1 ? 'dia selecionado' : 'dias selecionados'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <Campo label="Preço da diária (R$)" hint="Deixe vazio para não mexer no preço.">
              {id => <MoneyInput id={id} value={preco} onChange={setPreco} style={input} />}
            </Campo>
            <Campo label="Mínimo de noites" hint="Deixe vazio para não mexer no mínimo.">
              {id => (
                <input id={id} type="number" min="1" max="30" placeholder="não alterar"
                  value={minNoites} onChange={e => setMinNoites(e.target.value)} style={input} />
              )}
            </Campo>
          </div>

          {msg && (
            <p style={{
              fontSize: '13.5px', fontWeight: 500, marginBottom: '12px',
              color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
            }}>
              {msg.texto}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={aplicar}
              disabled={salvando}
              style={{
                flex: '1 1 160px', padding: '11px 20px', borderRadius: '9px', border: 'none',
                backgroundColor: 'var(--purple)', color: '#fff', fontWeight: 600, fontSize: '14px',
                cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1,
              }}
            >
              {salvando ? 'Aplicando...' : 'Aplicar aos dias selecionados'}
            </button>
            <button
              onClick={limpar}
              disabled={salvando}
              title="Volta ao preço padrão da cabana"
              style={{
                padding: '11px 16px', borderRadius: '9px',
                border: '1px solid var(--border)', backgroundColor: 'transparent',
                color: 'var(--muted)', fontWeight: 600, fontSize: '14px',
                cursor: salvando ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              <RotateCcw size={15} /> Voltar ao padrão
            </button>
            <button
              onClick={() => { setSelecionados([]); setMsg(null) }}
              style={{
                padding: '11px 16px', borderRadius: '9px',
                border: '1px solid var(--border)', backgroundColor: 'transparent',
                color: 'var(--muted)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg && selecionados.length === 0 && (
        <p style={{
          marginTop: '14px', fontSize: '13.5px', fontWeight: 500,
          color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
        }}>
          {msg.texto}
        </p>
      )}
    </div>
  )
}
