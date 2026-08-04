/**
 * Geração de arquivos para download.
 *
 * Detalhes que decidem se o contador consegue abrir o arquivo ou não:
 *
 * - O Excel em português usa PONTO E VÍRGULA como separador, não vírgula.
 *   Com vírgula ele joga a linha inteira numa célula só.
 * - Número precisa sair com VÍRGULA decimal, senão "1234.56" vira texto.
 * - O arquivo precisa começar com BOM, senão acentos viram "JoÃ£o".
 */

const BOM = '﻿'
const SEP = ';'

/**
 * Número no formato que o Excel brasileiro entende como número.
 *
 * Campo vazio sai vazio — nunca "0,00". Num relatório contábil, transformar
 * dado ausente em zero é mentira: o contador não consegue distinguir "não
 * informado" de "custou nada".
 */
export function numeroBR(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (isNaN(n)) return ''
  return n.toFixed(2).replace('.', ',')
}

/** Data yyyy-MM-dd -> dd/MM/yyyy */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : String(iso)
}

/** Escapa um valor para célula de CSV. */
function celula(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Aspas duplas viram duplicadas; campo entre aspas quando tem separador,
  // aspas ou quebra de linha.
  if (s.includes('"') || s.includes(SEP) || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export type Coluna<T> = {
  titulo: string
  valor: (linha: T) => string | number | null | undefined
}

/** Monta o conteúdo de um CSV a partir de colunas nomeadas. */
export function montarCSV<T>(colunas: Coluna<T>[], linhas: T[]): string {
  const cabecalho = colunas.map(c => celula(c.titulo)).join(SEP)
  const corpo = linhas.map(l => colunas.map(c => celula(c.valor(l))).join(SEP))
  return BOM + [cabecalho, ...corpo].join('\r\n')
}

function baixar(conteudo: string, nomeArquivo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Libera a memória do blob depois que o navegador começou o download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function baixarCSV<T>(nomeArquivo: string, colunas: Coluna<T>[], linhas: T[]) {
  baixar(montarCSV(colunas, linhas), nomeArquivo, 'text/csv;charset=utf-8;')
}

export function baixarJSON(nomeArquivo: string, dados: unknown) {
  baixar(JSON.stringify(dados, null, 2), nomeArquivo, 'application/json;charset=utf-8;')
}

/** Nome de arquivo sem acento/espaço, com a data de hoje. */
export function nomeArquivo(base: string, extensao: string, sufixo?: string): string {
  const hoje = new Date().toISOString().slice(0, 10)
  const limpo = base
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return [limpo, sufixo, hoje].filter(Boolean).join('_') + '.' + extensao
}
