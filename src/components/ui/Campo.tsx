"use client"

import { useId } from "react"

/**
 * Rótulo + campo, já ligados.
 *
 * O projeto não tinha um único `htmlFor`: clicar em "Valor total" não levava o
 * cursor para o campo, e leitor de tela não conseguia associar os dois. Aqui o
 * id é gerado e entregue ao filho, então a ligação nunca fica para trás.
 *
 *   <Campo label="Valor">
 *     {id => <MoneyInput id={id} value={v} onChange={setV} />}
 *   </Campo>
 */
export function Campo({
  label,
  hint,
  children,
  style,
}: {
  label: string
  hint?: string
  children: (id: string) => React.ReactNode
  style?: React.CSSProperties
}) {
  const id = useId()
  return (
    <div style={style}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          color: 'var(--muted)',
          fontSize: '13px',
          marginBottom: '6px',
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      {children(id)}
      {hint && (
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '5px', lineHeight: 1.45 }}>
          {hint}
        </p>
      )}
    </div>
  )
}
