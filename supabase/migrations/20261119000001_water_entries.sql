-- Controle de consumo de água (meta diária = 35 ml × peso atual).
-- Migração ADITIVA e idempotente: cria apenas a tabela nova; não altera nenhuma
-- tabela, dado ou política existente. Pode ser executada mais de uma vez.

create table if not exists public.water_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  amount_ml integer not null check (amount_ml between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists water_entries_user_date_idx on public.water_entries (user_id, entry_date);

alter table public.water_entries enable row level security;

-- Mesmo padrão dos demais dados da aluna: cada uma vê e altera só os próprios
-- registros, e apenas com acesso ativo. Visitantes não autenticados não acessam.
revoke all on public.water_entries from anon;
grant select, insert, delete on public.water_entries to authenticated;

drop policy if exists water_entries_own on public.water_entries;
create policy water_entries_own on public.water_entries
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.has_active_access()))
  with check (user_id = (select auth.uid()) and (select public.has_active_access()));
