/**
 * "Hoje" no fuso das pousadas (Brasília), como 'yyyy-MM-dd'.
 *
 * `new Date().toISOString().slice(0, 10)` devolve a data em UTC. No servidor
 * (Vercel roda em UTC) e no navegador, depois das 21h de Brasília isso já é o
 * dia SEGUINTE: a tela "Hoje" esconde os check-ins/check-outs do dia, a reserva
 * que sai amanhã conta como "estadia encerrada" e o recebimento lançado à noite
 * ganha a data de amanhã.
 *
 * Brasil não tem horário de verão desde 2019, mas usar o fuso nomeado em vez de
 * "UTC-3" fixo evita depender disso.
 */
const FUSO = 'America/Sao_Paulo'

export function hojeBR(agora: Date = new Date()): string {
  // en-CA formata como yyyy-MM-dd
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(agora)
}

/** Soma dias a uma data 'yyyy-MM-dd' sem passar por fuso (aritmética em UTC). */
export function somaDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + dias))
  return t.toISOString().slice(0, 10)
}

/** Primeiro e último dia do mês de uma data 'yyyy-MM-dd'. */
export function limitesDoMes(iso: string): { inicio: string; fim: string } {
  const [y, m] = iso.split('-').map(Number)
  const fim = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  return { inicio: `${String(y)}-${String(m).padStart(2, '0')}-01`, fim }
}
