-- =====================================================================
-- Prazo de acesso de 6 meses (compras Hotmart)
-- ANTES de aplicar em produção, rode supabase/manual/preview_access_expiration.sql
-- (somente leitura) e confira o resultado.
-- Idempotente: pode ser executada de novo sem alterar o que já foi preenchido.
-- =====================================================================

-- 1. Data REAL de aprovação da compra (Hotmart purchase.approved_date).
alter table public.entitlements add column if not exists purchase_approved_at timestamptz;

-- 2. Regra única do prazo (igual a lib/access-period.ts):
--    6 meses de calendário a partir da data de aprovação em São Paulo; o acesso vale até o
--    fim do último dia. Devolve o instante EXCLUSIVO de término (00h00 do dia seguinte).
--    Ex.: 31/08/2026 -> último dia 28/02/2027 -> retorna 2027-03-01 00:00 (São Paulo).
create or replace function public.access_period_end(p_approved timestamptz, p_months integer default 6)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (
    ((p_approved at time zone 'America/Sao_Paulo')::date + make_interval(months => p_months))::date + 1
  )::timestamp at time zone 'America/Sao_Paulo'
$$;
revoke execute on function public.access_period_end(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.access_period_end(timestamptz, integer) to service_role;

-- 3. Acessos Hotmart já existentes (ex.: a compra de teste real):
--    3a. data de aprovação = approved_date do evento de compra recebido; na falta, a data de liberação.
update public.entitlements e
set purchase_approved_at = coalesce(
  (
    select min(
      case
        when v ~ '^\d{11,}$' then to_timestamp(v::bigint / 1000.0)   -- milissegundos (formato oficial)
        when v ~ '^\d{1,10}$' then to_timestamp(v::bigint)          -- segundos
        when v ~ '^\d{4}-\d{2}-\d{2}' then v::timestamptz           -- ISO
      end
    )
    from public.webhook_events w
    cross join lateral (select w.payload -> 'data' -> 'purchase' ->> 'approved_date' as v) x
    where w.provider = 'hotmart'
      and w.transaction = e.transaction
      and w.event_type in ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE')
  ),
  e.granted_at
)
where e.source = 'hotmart'
  and e.purchase_approved_at is null
  and (
    e.status = 'active'
    or exists (
      select 1 from public.webhook_events w
      where w.provider = 'hotmart' and w.transaction = e.transaction
        and w.event_type in ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE')
    )
  );

--    3b. vencimento = aprovação + 6 meses, só onde ainda não existe (nunca prorroga).
update public.entitlements
set access_expires_at = public.access_period_end(purchase_approved_at, 6)
where source = 'hotmart'
  and access_expires_at is null
  and purchase_approved_at is not null;
