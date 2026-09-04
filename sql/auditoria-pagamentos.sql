-- =====================================================================
-- Auditoria: reservas confirmadas sem pagamento registrado
-- =====================================================================
--
-- Para que serve
-- --------------
-- O site publico cria a reserva e manda o hospede pro checkout do
-- MercadoPago. Quando o pagamento cai, o WEBHOOK deve voltar e gravar o
-- mp_payment_id + mudar o payment_status. Se o webhook falha, o dinheiro
-- entra no MercadoPago mas o painel nao sabe — e a dona cobra de novo, ou
-- perde a reserva de vista.
--
-- Rode esta consulta DEPOIS de mexer no webhook, e de tempos em tempos.
--
-- Como ela evita ruido
-- --------------------
-- O campo mp_preference_id e a chave: ele so existe quando o hospede
-- passou pelo checkout do site. Reserva de WhatsApp que a dona lanca na
-- mao nao tem preference — e nela e NORMAL nao haver rastro de pagamento
-- (a dona marca "pago" como controle dela). Sem essa separacao, metade da
-- base aparece como problema.
--
-- Tambem ficam de fora:
--   is_courtesy      -> diaria cedida, zero de proposito
--   total_amount = 0 -> bloqueio/manutencao lancado como reserva
--   awaiting_settlement -> a dona MARCOU que o dinheiro ainda nao entrou
--
-- Os tres sinais de dinheiro que a consulta procura
-- -------------------------------------------------
--   1. mp_payment_id            -> o webhook registrou
--   2. linha em booking_payments -> a dona lancou o recebimento na mao
--   3. payment_status            -> o que o sistema AFIRMA sobre o pagamento
--
-- O problema aparece quando (3) diz que pagou mas (1) e (2) estao vazios.
-- =====================================================================

with base as (
  select
    b.id, b.guest_name, b.guest_phone,
    b.check_in, b.check_out, b.created_at,
    b.status, b.payment_status,
    b.total_amount, b.deposit_amount,
    b.mp_payment_id,
    t.business_name,
    p.name as cabana,
    (b.mp_preference_id is not null) as veio_do_site,
    (b.mp_payment_id    is not null) as webhook_registrou,
    exists (
      select 1 from public.booking_payments bp where bp.booking_id = b.id
    ) as lancou_na_mao,
    coalesce(
      (select sum(bp.amount) from public.booking_payments bp where bp.booking_id = b.id),
      0
    ) as total_lancado
  from public.bookings b
  join public.properties p              on p.id = b.property_id
  join public.saas_reserva_tenants t    on t.id = p.tenant_id
  where b.is_courtesy = false     -- cortesia e zero de proposito
    and b.total_amount > 0        -- bloqueio/manutencao nao e venda
),

classificada as (
  select *,
    case
      -- Dinheiro entrou e a reserva foi cancelada depois.
      -- Se tem mp_payment_id, o valor esta no MercadoPago: confira estorno.
      when status = 'cancelled'
       and (webhook_registrou or lancou_na_mao
            or payment_status in ('deposit_paid', 'fully_paid'))
        then '1. PAGOU E FOI CANCELADA (conferir estorno)'

      -- Veio do site, o sistema diz que pagou, mas nao ha NENHUM rastro.
      -- Esta e a assinatura classica de webhook que nao voltou.
      when status in ('confirmed', 'checked_in', 'completed')
       and payment_status in ('deposit_paid', 'fully_paid')
       and veio_do_site
       and not webhook_registrou
       and not lancou_na_mao
        then '2. DIZ QUE PAGOU MAS NAO TEM RASTRO (webhook?)'

      -- Confirmada sem nenhum sinal de dinheiro. Costuma ser a dona
      -- confirmando no WhatsApp pra receber depois — nao e erro por si so,
      -- mas e o balde onde some dinheiro esquecido.
      when status in ('confirmed', 'checked_in', 'completed')
       and payment_status = 'awaiting_deposit'
       and not webhook_registrou
       and not lancou_na_mao
       and not awaiting_settlement
        then '3. CONFIRMADA SEM PAGAMENTO NENHUM'

      else '0. ok'
    end as problema
  from base
)

select
  problema,
  business_name           as pousada,
  cabana,
  guest_name              as hospede,
  guest_phone             as telefone,
  check_in, check_out,
  created_at::date        as reserva_criada_em,
  status,
  payment_status,
  total_amount            as valor_total,
  deposit_amount          as sinal,
  total_lancado           as ja_lancado_no_painel,
  mp_payment_id           as id_pagamento_mercadopago,
  veio_do_site
from classificada
where problema <> '0. ok'
order by problema, check_in;

-- ---------------------------------------------------------------------
-- Versao resumida: troque o SELECT final acima por este para ver so os
-- totais por pousada e categoria.
-- ---------------------------------------------------------------------
-- select problema,
--        business_name as pousada,
--        count(*)      as qtd,
--        sum(total_amount) as valor_envolvido
-- from classificada
-- where problema <> '0. ok'
-- group by problema, business_name
-- order by problema, business_name;

-- ---------------------------------------------------------------------
-- Termometro do webhook: se as reservas com pagamento registrado seguem
-- ate hoje, o webhook esta vivo. Se pararam numa data, ele quebrou ali.
-- ---------------------------------------------------------------------
-- select (mp_payment_id is not null) as webhook_registrou,
--        count(*) as qtd,
--        min(created_at)::date as primeira,
--        max(created_at)::date as ultima
-- from public.bookings
-- where mp_preference_id is not null
-- group by 1;
