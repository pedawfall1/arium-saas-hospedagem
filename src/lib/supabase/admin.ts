import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente com a chave de serviço — IGNORA todas as políticas de segurança
 * (RLS) do banco.
 *
 * Use SOMENTE em código que roda no servidor e apenas para operações de
 * infraestrutura que não pertencem a um tenant, como o contador de limite de
 * requisições. Nunca importe isto em componente de cliente, nunca use para ler
 * dados de reserva: a proteção que separa uma pousada da outra passa pelo RLS,
 * e este cliente passa por cima dela.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
