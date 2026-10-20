-- Simula o ambiente Supabase num PostgreSQL comum, SOMENTE para testes locais
-- (papéis anon/authenticated/service_role, schema auth e privilégios padrão).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists extensions;
create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  email_confirmed_at timestamptz
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

grant usage on schema public, extensions, auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Como no Supabase: tabelas novas do schema public recebem todos os privilégios
-- para anon/authenticated/service_role por padrão (a RLS é quem protege).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
alter default privileges in schema extensions grant execute on functions to anon, authenticated, service_role;
