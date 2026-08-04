"use client"

import { useState } from "react"
import { formatMoney, parseMoney } from "@/lib/money"

/**
 * Campo de dinheiro.
 *
 * É type="text" de propósito: com type="number" o navegador devolve string
 * VAZIA quando o conteúdo não é um número válido para ele, e "2000,00" — o
 * jeito que se digita no Brasil — não é. O valor sumia e virava 0 ao salvar.
 *
 * O estado guardado é sempre o texto cru digitado; quem salva converte com
 * parseMoney(). Fora de foco mostramos o valor formatado, mas se o texto não
 * for interpretável ele é mantido à vista para a pessoa ver o que digitou.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  disabled,
  placeholder = "R$ 0,00",
  style,
  autoFocus,
}: {
  id?: string
  value: string
  onChange: (raw: string) => void
  disabled?: boolean
  placeholder?: string
  style?: React.CSSProperties
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)

  const semValor = value === "" || value === null || value === undefined
  const invalido = !semValor && isNaN(parseMoney(value))

  const display = focused || semValor || invalido ? value : formatMoney(value)

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={style}
    />
  )
}
