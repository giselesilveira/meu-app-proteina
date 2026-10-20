-- =====================================================================
-- App Maratona 21 — esquema inicial
-- Supabase / PostgreSQL 15+
-- Todas as tabelas de dados da aluna têm RLS: cada aluna só enxerga
-- e altera os próprios registros, e somente com acesso (entitlement) ativo.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------

-- Texto normalizado para busca: minúsculo e sem acentos. IMMUTABLE para
-- poder ser usado em colunas geradas e índices.
create or replace function public.normalize_search(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  full_name text check (char_length(full_name) <= 120),
  hotmart_buyer_ucode text,
  timezone text not null default 'America/Sao_Paulo',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (email);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- ENTITLEMENTS — direito de acesso. Pode existir antes do primeiro login
-- (user_id nulo); é associado ao usuário no primeiro login pelo e-mail.
-- ---------------------------------------------------------------------
create table public.entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null check (email = lower(btrim(email)) and email like '%@%'),
  source text not null check (source in ('hotmart', 'manual')),
  product_ucode text,
  offer_code text,
  transaction text,
  hotmart_buyer_ucode text,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  access_expires_at timestamptz,
  last_event_at timestamptz,
  last_event_type text,
  granted_by text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlements_hotmart_has_transaction check (source <> 'hotmart' or transaction is not null),
  constraint entitlements_source_transaction_key unique (source, transaction)
);
create index entitlements_email_idx on public.entitlements (email);
create index entitlements_user_idx on public.entitlements (user_id);
create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();

-- Acesso ativo = existe entitlement ativo e não expirado ligado ao usuário.
-- has_access_for(uuid) é interno (não exposto à API); has_active_access()
-- só responde pelo próprio usuário autenticado.
create or replace function public.has_access_for(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1
    from public.entitlements e
    where e.user_id = p_user_id
      and e.status = 'active'
      and (e.access_expires_at is null or e.access_expires_at > now())
  )
$$;

create or replace function public.has_active_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_access_for(auth.uid())
$$;

-- Chamado logo após o login: associa entitlements do e-mail confirmado ao
-- usuário, cria o profile (idempotente) e devolve se há acesso ativo.
create or replace function public.claim_my_entitlements()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_buyer text;
begin
  if v_uid is null then
    return false;
  end if;

  select lower(btrim(u.email)) into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;

  if v_email is null then
    return false;
  end if;

  update public.entitlements
     set user_id = v_uid
   where email = v_email
     and user_id is null;

  select e.hotmart_buyer_ucode into v_buyer
  from public.entitlements e
  where e.user_id = v_uid and e.hotmart_buyer_ucode is not null
  order by e.granted_at desc
  limit 1;

  insert into public.profiles (user_id, email, hotmart_buyer_ucode)
  values (v_uid, v_email, v_buyer)
  on conflict (user_id) do update
    set hotmart_buyer_ucode = coalesce(public.profiles.hotmart_buyer_ucode, excluded.hotmart_buyer_ucode);

  return public.has_access_for(v_uid);
end;
$$;

-- ---------------------------------------------------------------------
-- NUTRITION PROFILES e histórico de metas
-- ---------------------------------------------------------------------
create table public.nutrition_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weight_kg numeric(5, 2) not null check (weight_kg between 25 and 350),
  protein_factor numeric(3, 1) not null check (protein_factor in (1.5, 1.8, 2.0)),
  protein_target_g numeric(6, 1) not null check (protein_target_g > 0),
  calorie_target integer check (calorie_target between 500 and 6000),
  fat_target_g numeric(6, 1) check (fat_target_g between 1 and 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger nutrition_profiles_updated_at before update on public.nutrition_profiles
  for each row execute function public.set_updated_at();

-- Meta vigente em cada dia (para o histórico mostrar a meta daquele dia).
create table public.nutrition_target_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_date date not null,
  weight_kg numeric(5, 2) not null,
  protein_factor numeric(3, 1) not null,
  protein_target_g numeric(6, 1) not null,
  calorie_target integer,
  fat_target_g numeric(6, 1),
  created_at timestamptz not null default now(),
  constraint nutrition_target_history_day_key unique (user_id, effective_date)
);

-- ---------------------------------------------------------------------
-- FOOD CATALOG — nutrientes sempre por 100 g
-- ---------------------------------------------------------------------
create table public.food_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  display_name text not null,
  taco_name text,
  brand text,
  category text not null,
  preparation text,
  protein_per_100g numeric(7, 2) check (protein_per_100g >= 0 and protein_per_100g <= 100),
  calories_per_100g numeric(7, 2) check (calories_per_100g >= 0 and calories_per_100g <= 900),
  fat_per_100g numeric(7, 2) check (fat_per_100g >= 0 and fat_per_100g <= 100),
  carbohydrate_per_100g numeric(7, 2) check (carbohydrate_per_100g >= 0 and carbohydrate_per_100g <= 100),
  fiber_per_100g numeric(7, 2) check (fiber_per_100g >= 0 and fiber_per_100g <= 100),
  sodium_mg_per_100g numeric(8, 2) check (sodium_mg_per_100g >= 0 and sodium_mg_per_100g <= 40000),
  default_serving_g numeric(7, 2) check (default_serving_g > 0 and default_serving_g <= 2000),
  serving_label text,
  source_type text not null check (source_type in ('TACO', 'label', 'manual_authorized')),
  source_reference text not null check (char_length(btrim(source_reference)) > 0),
  taco_code integer unique,
  source_flags jsonb not null default '{}'::jsonb,
  added_by text,
  added_at timestamptz not null default now(),
  is_active boolean not null default true,
  search_blob text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_catalog_taco_code check (source_type <> 'TACO' or taco_code is not null),
  constraint food_catalog_active_has_core check (
    not is_active or (protein_per_100g is not null and calories_per_100g is not null)
  )
);
create index food_catalog_search_trgm on public.food_catalog using gin (search_blob extensions.gin_trgm_ops);
create index food_catalog_active_idx on public.food_catalog (is_active);

create table public.food_aliases (
  id bigint generated always as identity primary key,
  food_id uuid not null references public.food_catalog (id) on delete cascade,
  alias text not null check (char_length(btrim(alias)) between 2 and 80),
  alias_normalized text generated always as (public.normalize_search(alias)) stored,
  created_at timestamptz not null default now(),
  constraint food_aliases_unique unique (food_id, alias_normalized)
);
create index food_aliases_trgm on public.food_aliases using gin (alias_normalized extensions.gin_trgm_ops);

-- search_blob = nome amigável + nome TACO + marca + aliases (normalizados)
create or replace function public.food_catalog_search_blob()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_blob := public.normalize_search(
    concat_ws(' ', new.display_name, new.taco_name, new.name, new.brand,
      (select string_agg(a.alias, ' ') from public.food_aliases a where a.food_id = new.id))
  );
  new.updated_at := now();
  return new;
end;
$$;
create trigger food_catalog_search before insert or update on public.food_catalog
  for each row execute function public.food_catalog_search_blob();

create or replace function public.food_aliases_touch_food()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.food_catalog set updated_at = now()
   where id = coalesce(new.food_id, old.food_id);
  return null;
end;
$$;
create trigger food_aliases_touch after insert or update or delete on public.food_aliases
  for each row execute function public.food_aliases_touch_food();

-- Busca: todos os termos precisam aparecer (nome, nome TACO, marca ou alias).
-- Ordena por: começa com o termo > similaridade > nome mais curto.
create or replace function public.search_foods(p_tokens text[], p_query text, p_limit integer default 20)
returns setof public.food_catalog
language sql
stable
security invoker
set search_path = ''
as $$
  select f.*
  from public.food_catalog f
  where f.is_active
    and coalesce(array_length(p_tokens, 1), 0) > 0
    and not exists (
      select 1 from unnest(p_tokens) t(tok)
      where position(public.normalize_search(t.tok) in f.search_blob) = 0
    )
  order by
    (public.normalize_search(f.display_name) like public.normalize_search(p_query) || '%') desc,
    extensions.similarity(f.search_blob, public.normalize_search(p_query)) desc,
    char_length(f.display_name) asc
  limit least(greatest(p_limit, 1), 50)
$$;

-- ---------------------------------------------------------------------
-- FOOD ENTRIES — com snapshot nutricional obrigatório
-- ---------------------------------------------------------------------
create table public.food_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid references public.food_catalog (id) on delete set null,
  entry_date date not null,
  meal text check (meal in ('breakfast', 'lunch', 'snack', 'dinner', 'supper', 'other')),
  amount_g numeric(7, 2) not null check (amount_g > 0 and amount_g <= 3000),
  food_name_snapshot text not null,
  preparation_snapshot text,
  protein_per_100g_snapshot numeric(7, 2) not null,
  calories_per_100g_snapshot numeric(7, 2) not null,
  fat_per_100g_snapshot numeric(7, 2),
  carbohydrate_per_100g_snapshot numeric(7, 2),
  protein_snapshot numeric(9, 3) not null,
  calories_snapshot numeric(9, 3) not null,
  fat_snapshot numeric(9, 3),
  carbohydrate_snapshot numeric(9, 3),
  source_snapshot jsonb not null,
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_entries_user_day_idx on public.food_entries (user_id, entry_date);
create index food_entries_user_created_idx on public.food_entries (user_id, created_at desc);

-- Garante a integridade do snapshot: no INSERT os valores por 100 g vêm SEMPRE
-- do catálogo (o cliente não consegue enviar valores próprios); no UPDATE os
-- valores por 100 g ficam congelados e só a quantidade/refeição/data mudam.
-- Fórmula: nutriente consumido = (valor por 100 g / 100) × gramas.
create or replace function public.food_entries_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.food_catalog%rowtype;
begin
  if tg_op = 'INSERT' then
    select * into f from public.food_catalog c where c.id = new.food_id and c.is_active;
    if not found then
      raise exception 'food_not_available' using errcode = 'P0002';
    end if;
    new.food_name_snapshot := f.display_name;
    new.preparation_snapshot := f.preparation;
    new.protein_per_100g_snapshot := f.protein_per_100g;
    new.calories_per_100g_snapshot := f.calories_per_100g;
    new.fat_per_100g_snapshot := f.fat_per_100g;
    new.carbohydrate_per_100g_snapshot := f.carbohydrate_per_100g;
    new.source_snapshot := jsonb_build_object(
      'source_type', f.source_type,
      'source_reference', f.source_reference,
      'taco_code', f.taco_code,
      'taco_name', f.taco_name,
      'brand', f.brand
    );
  else
    new.user_id := old.user_id;
    new.food_id := old.food_id;
    new.food_name_snapshot := old.food_name_snapshot;
    new.preparation_snapshot := old.preparation_snapshot;
    new.protein_per_100g_snapshot := old.protein_per_100g_snapshot;
    new.calories_per_100g_snapshot := old.calories_per_100g_snapshot;
    new.fat_per_100g_snapshot := old.fat_per_100g_snapshot;
    new.carbohydrate_per_100g_snapshot := old.carbohydrate_per_100g_snapshot;
    new.source_snapshot := old.source_snapshot;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;

  new.protein_snapshot := new.protein_per_100g_snapshot / 100 * new.amount_g;
  new.calories_snapshot := new.calories_per_100g_snapshot / 100 * new.amount_g;
  new.fat_snapshot := new.fat_per_100g_snapshot / 100 * new.amount_g;
  new.carbohydrate_snapshot := new.carbohydrate_per_100g_snapshot / 100 * new.amount_g;
  return new;
end;
$$;
create trigger food_entries_snapshot before insert or update on public.food_entries
  for each row execute function public.food_entries_snapshot();

-- ---------------------------------------------------------------------
-- FAVORITOS
-- ---------------------------------------------------------------------
create table public.favorite_foods (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid not null references public.food_catalog (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

-- ---------------------------------------------------------------------
-- EVOLUÇÃO CORPORAL
-- ---------------------------------------------------------------------
create table public.body_checkins (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  checkin_date date not null,
  weight_kg numeric(5, 2) check (weight_kg between 25 and 350),
  waist_cm numeric(5, 1) check (waist_cm between 30 and 250),
  abdomen_cm numeric(5, 1) check (abdomen_cm between 30 and 250),
  hip_cm numeric(5, 1) check (hip_cm between 30 and 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_checkins_day_key unique (user_id, checkin_date),
  constraint body_checkins_some_value check (
    weight_kg is not null or waist_cm is not null or abdomen_cm is not null or hip_cm is not null
  )
);
create trigger body_checkins_updated_at before update on public.body_checkins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- WEBHOOK EVENTS (somente servidor)
-- ---------------------------------------------------------------------
create table public.webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null default 'hotmart',
  external_event_id text not null,
  event_type text not null,
  transaction text,
  payload jsonb not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  attempts integer not null default 1,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  constraint webhook_events_provider_event_key unique (provider, external_event_id)
);
create index webhook_events_transaction_idx on public.webhook_events (transaction);
create index webhook_events_received_idx on public.webhook_events (received_at desc);

-- ---------------------------------------------------------------------
-- LOG DE AÇÕES ADMINISTRATIVAS (somente servidor)
-- ---------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ANALYTICS BÁSICO (sem dados sensíveis)
-- ---------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  event_name text not null check (event_name in (
    'app_login', 'onboarding_completed', 'food_added', 'favorite_added', 'body_checkin_added'
  )),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (event_name, created_at desc);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.nutrition_profiles enable row level security;
alter table public.nutrition_target_history enable row level security;
alter table public.food_catalog enable row level security;
alter table public.food_aliases enable row level security;
alter table public.food_entries enable row level security;
alter table public.favorite_foods enable row level security;
alter table public.body_checkins enable row level security;
alter table public.webhook_events enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.analytics_events enable row level security;

-- Visitantes não autenticados não acessam nenhuma tabela.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
-- O Supabase concede EXECUTE em funções novas para "authenticated" por padrão:
-- retiramos de tudo que é interno (consulta de terceiros e funções de trigger).
revoke execute on function
  public.has_access_for(uuid),
  public.set_updated_at(),
  public.food_catalog_search_blob(),
  public.food_aliases_touch_food(),
  public.food_entries_snapshot()
  from authenticated;

-- Tabelas exclusivas do servidor (service role ignora RLS).
revoke all on public.webhook_events, public.admin_audit_log from authenticated;

-- PROFILES: lê o próprio; altera só nome, fuso e onboarding (e-mail é fixo).
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, timezone, onboarding_completed_at) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()) and public.has_active_access())
  with check (user_id = (select auth.uid()));

-- ENTITLEMENTS: somente leitura do próprio acesso.
revoke insert, update, delete on public.entitlements from authenticated;
grant select on public.entitlements to authenticated;
create policy entitlements_select_own on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));

-- Dados da aluna: CRUD do próprio registro, apenas com acesso ativo.
grant select, insert, update, delete on
  public.nutrition_profiles, public.nutrition_target_history, public.food_entries,
  public.favorite_foods, public.body_checkins
  to authenticated;

create policy nutrition_profiles_own on public.nutrition_profiles
  for all to authenticated
  using (user_id = (select auth.uid()) and public.has_active_access())
  with check (user_id = (select auth.uid()) and public.has_active_access());

create policy nutrition_target_history_own on public.nutrition_target_history
  for all to authenticated
  using (user_id = (select auth.uid()) and public.has_active_access())
  with check (user_id = (select auth.uid()) and public.has_active_access());

create policy food_entries_own on public.food_entries
  for all to authenticated
  using (user_id = (select auth.uid()) and public.has_active_access())
  with check (user_id = (select auth.uid()) and public.has_active_access());

create policy favorite_foods_own on public.favorite_foods
  for all to authenticated
  using (user_id = (select auth.uid()) and public.has_active_access())
  with check (user_id = (select auth.uid()) and public.has_active_access());

create policy body_checkins_own on public.body_checkins
  for all to authenticated
  using (user_id = (select auth.uid()) and public.has_active_access())
  with check (user_id = (select auth.uid()) and public.has_active_access());

-- Catálogo: leitura dos itens ativos, apenas para quem tem acesso.
revoke insert, update, delete on public.food_catalog, public.food_aliases from authenticated;
grant select on public.food_catalog, public.food_aliases to authenticated;
create policy food_catalog_read on public.food_catalog
  for select to authenticated using (is_active and public.has_active_access());
create policy food_aliases_read on public.food_aliases
  for select to authenticated using (public.has_active_access());

-- Analytics: a aluna só insere eventos próprios; não lê.
revoke all on public.analytics_events from authenticated;
grant insert (event_name, properties) on public.analytics_events to authenticated;
create policy analytics_insert_own on public.analytics_events
  for insert to authenticated with check (user_id = (select auth.uid()) and public.has_active_access());

grant execute on function public.has_active_access() to authenticated;
grant execute on function public.claim_my_entitlements() to authenticated;
grant execute on function public.search_foods(text[], text, integer) to authenticated;
grant execute on function public.normalize_search(text) to authenticated;
