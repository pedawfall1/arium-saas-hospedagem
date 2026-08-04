/**
 * Envelope para gravações no banco.
 *
 * O padrão antigo era `await supabase.from(...).delete()...` sem olhar o
 * retorno: se a rede caísse ou o RLS recusasse, o item sumia da tela e
 * continuava no banco. A dona só descobria ao recarregar.
 *
 * Use sempre `executar()`; ele devolve `{ ok, erro }` e nunca lança.
 */

export type Resultado = { ok: true } | { ok: false; erro: string }

/** Traduz os erros do Postgres para algo que a dona entenda. */
function traduzir(error: any): string {
  const msg: string = error?.message ?? 'Erro desconhecido'
  const code: string = error?.code ?? ''

  // Violação de CHECK — valor fora da lista aceita
  if (code === '23514') return 'Esse valor não é aceito neste campo. Recarregue a página e tente de novo.'
  // Violação de NOT NULL
  if (code === '23502') return 'Faltou preencher um campo obrigatório.'
  // Chave estrangeira
  if (code === '23503') return 'Este item está ligado a outro registro e não pode ser alterado assim.'
  // Duplicado
  if (code === '23505') return 'Esse lançamento já existe.'
  // Sem permissão (RLS)
  if (code === '42501' || msg.includes('row-level security')) {
    return 'Você não tem permissão para alterar este item.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Sem conexão. Verifique a internet e tente de novo.'
  }
  return msg
}

/**
 * Executa uma operação do Supabase e normaliza o resultado.
 *
 *   const r = await executar(supabase.from('expenses').delete().eq('id', id))
 *   if (!r.ok) return setErro(r.erro)
 */
export async function executar(query: PromiseLike<{ error: any }>): Promise<Resultado> {
  try {
    const { error } = await query
    if (error) {
      console.error('[salvar]', error)
      return { ok: false, erro: traduzir(error) }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[salvar]', e)
    return { ok: false, erro: traduzir(e) }
  }
}
