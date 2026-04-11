import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-"
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString)
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  } catch (err) {
    return dateString || "-"
  }
}
