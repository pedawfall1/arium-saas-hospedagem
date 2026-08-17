import { parseISO, addDays, format, eachDayOfInterval } from "date-fns"

/**
 * Conversão entre "noites" (o que a dona entende) e o armazenamento das duas
 * tabelas — que interpretam a data final de formas OPOSTAS:
 *
 *   feriado (holidays):      date_to é EXCLUSIVO (check-out). Última noite = date_to - 1.
 *   regra   (pricing_rules): valid_until é INCLUSIVO. Última noite = valid_until.
 *
 * Toda a interface passa a falar em noites; esta camada faz a tradução certa
 * para cada tabela. O critério de aceite é o IDA-E-VOLTA: abrir um registro e
 * salvar sem mudar nada não pode alterar nenhuma data.
 *
 * Datas são sempre strings 'yyyy-MM-dd' e tudo opera no horário local (nunca
 * toISOString), para não escorregar de fuso.
 */

export type TipoData = 'feriado' | 'regra'

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const parse = (s: string) => parseISO(s)

/** Primeira e última NOITE a partir dos campos crus da tabela. */
export function noitesDoRegistro(tipo: TipoData, row: any): { primeira: string; ultima: string } {
  if (tipo === 'feriado') {
    return { primeira: row.date_from, ultima: iso(addDays(parse(row.date_to), -1)) }
  }
  return { primeira: row.valid_from, ultima: row.valid_until }
}

/** Converte primeira/última noite para os campos que vão ao banco. */
export function paraArmazenamento(tipo: TipoData, primeira: string, ultima: string): Record<string, string> {
  if (tipo === 'feriado') {
    return { date_from: primeira, date_to: iso(addDays(parse(ultima), 1)) }
  }
  return { valid_from: primeira, valid_until: ultima }
}

/** Todas as noites cobertas por um registro (inclusive nas duas pontas). */
export function noitesCobertas(tipo: TipoData, row: any): string[] {
  const { primeira, ultima } = noitesDoRegistro(tipo, row)
  return noitesEntre(primeira, ultima)
}

export function noitesEntre(primeira: string, ultima: string): string[] {
  if (!primeira || !ultima) return []
  const a = parse(primeira), b = parse(ultima)
  if (b < a) return []
  return eachDayOfInterval({ start: a, end: b }).map(iso)
}

/** "3 noites: 24, 25 e 26/12" — mês só aparece onde muda ou na última. */
export function descreveNoites(noites: string[]): string {
  if (noites.length === 0) return 'nenhuma noite'
  const partes = noites.map((n, i) => {
    const d = parse(n)
    const dia = format(d, 'dd')
    const ultimoOuMudaMes = i === noites.length - 1 || n.slice(5, 7) !== noites[i + 1].slice(5, 7)
    return ultimoOuMudaMes ? `${dia}/${format(d, 'MM')}` : dia
  })
  let lista: string
  if (partes.length === 1) lista = partes[0]
  else lista = partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]
  const contagem = noites.length === 1 ? '1 noite' : `${noites.length} noites`
  return `${contagem}: ${lista}`
}

export type Problema =
  | { kind: 'duplicata'; ids: string[]; resumo: string }
  | { kind: 'buraco'; faltando: string[]; nomeGrupo: string }

/**
 * Analisa um grupo de registros de MESMO nome (mesma cabana, mesma tabela):
 *  - contíguas (23→24, 24→25...) que cobrem tudo: NÃO alerta.
 *  - assinatura idêntica (mesmas noites): alerta como duplicata.
 *  - vão entre as noites cobertas: alerta como buraco.
 */
export function detectarProblemas(tipo: TipoData, nomeGrupo: string, rows: any[]): Problema[] {
  const problemas: Problema[] = []
  if (rows.length < 2) return problemas

  // Duplicatas: mesma primeira+última noite
  const porAssinatura = new Map<string, any[]>()
  for (const r of rows) {
    const { primeira, ultima } = noitesDoRegistro(tipo, r)
    const chave = `${primeira}|${ultima}`
    const lista = porAssinatura.get(chave)
    if (lista) lista.push(r); else porAssinatura.set(chave, [r])
  }
  for (const [chave, lista] of porAssinatura) {
    if (lista.length > 1) {
      const [primeira, ultima] = chave.split('|')
      problemas.push({ kind: 'duplicata', ids: lista.map(r => r.id), resumo: descreveNoites(noitesEntre(primeira, ultima)) })
    }
  }

  // Buraco: só vãos CURTOS (1–2 noites) entre blocos cobertos. Um vão pequeno
  // quase sempre é engano (foi o que custou R$430 no Natal). Vãos grandes são
  // períodos separados de propósito (ex.: "férias" em semanas diferentes) e
  // NÃO devem alertar, senão viram ruído.
  const GAP_MAX = 2
  const cobertas = new Set<string>()
  for (const r of rows) for (const n of noitesCobertas(tipo, r)) cobertas.add(n)
  const ordenadas = [...cobertas].sort()
  if (ordenadas.length >= 2) {
    const todas = noitesEntre(ordenadas[0], ordenadas[ordenadas.length - 1])
    // Agrupa noites faltantes em corridas consecutivas
    let corrida: string[] = []
    const fecha = () => {
      if (corrida.length > 0 && corrida.length <= GAP_MAX) {
        problemas.push({ kind: 'buraco', faltando: [...corrida], nomeGrupo })
      }
      corrida = []
    }
    for (const n of todas) {
      if (cobertas.has(n)) fecha()
      else corrida.push(n)
    }
    fecha()
  }

  return problemas
}
