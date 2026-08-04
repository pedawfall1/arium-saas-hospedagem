import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Limite de requisições compartilhado entre todas as instâncias do servidor.
 *
 * A contagem fica no Postgres, então vale de verdade mesmo com o app rodando em
 * várias instâncias (o Map em memória do middleware não valia).
 *
 * Devolve `true` quando a requisição pode seguir. Se o banco falhar, libera —
 * é preferível atender do que derrubar o painel por causa do contador.
 */
export async function permitir(
  chave: string,
  max = 30,
  janelaSegundos = 60
): Promise<boolean> {
  try {
    // Precisa da chave de serviço: a função é revogada de anon/authenticated
    // para ninguém conseguir estourar a cota alheia com a chave pública.
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_bucket: chave,
      p_max: max,
      p_window_seconds: janelaSegundos,
    })
    if (error) {
      console.error('[rateLimit] falhou, liberando:', error.message)
      return true
    }
    return data !== false
  } catch (e: any) {
    console.error('[rateLimit] exceção, liberando:', e?.message)
    return true
  }
}

/** Resposta padrão de limite excedido. */
export function respostaLimite() {
  return Response.json(
    { error: 'Muitas tentativas. Aguarde um minuto e tente de novo.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}
