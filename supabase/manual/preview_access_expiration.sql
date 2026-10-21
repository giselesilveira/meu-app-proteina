-- SOMENTE LEITURA: mostra o que a migração 20261022000001_access_expiration.sql vai preencher.
-- Rode no SQL Editor do Supabase ANTES de aplicar a migração. Não altera nada.
with approval as (
  select w.transaction,
    min(case
      when v ~ '^\d{11,}$' then to_timestamp(v::bigint / 1000.0)
      when v ~ '^\d{1,10}$' then to_timestamp(v::bigint)
      when v ~ '^\d{4}-\d{2}-\d{2}' then v::timestamptz
    end) as approved_at
  from public.webhook_events w
  cross join lateral (select w.payload -> 'data' -> 'purchase' ->> 'approved_date' as v) x
  where w.provider = 'hotmart' and w.event_type in ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE')
  group by w.transaction
)
select
  e.email,
  e.transaction,
  e.status,
  to_char(e.granted_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as liberado_em,
  to_char(coalesce(a.approved_at, e.granted_at) at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as aprovacao_usada,
  case when a.approved_at is null then 'data de liberação (sem approved_date no evento)' else 'approved_date da Hotmart' end as origem_da_data,
  to_char(
    ((coalesce(a.approved_at, e.granted_at) at time zone 'America/Sao_Paulo')::date + interval '6 months')::date,
    'DD/MM/YYYY'
  ) as acesso_ate
from public.entitlements e
left join approval a on a.transaction = e.transaction
where e.source = 'hotmart' and e.access_expires_at is null
order by e.granted_at;
