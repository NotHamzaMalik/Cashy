begin;
create schema if not exists cashy;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'cashy_runtime') then
    create role cashy_runtime nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end $$;
create table if not exists cashy.workspaces (
  user_id text primary key check (length(user_id) between 1 and 100),
  revision integer not null check (revision > 0),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'version' = '1'),
  updated_at timestamptz not null default now()
);
alter table cashy.workspaces enable row level security;
alter table cashy.workspaces force row level security;
drop policy if exists workspace_owner on cashy.workspaces;
create policy workspace_owner on cashy.workspaces to cashy_runtime
  using (user_id = nullif(current_setting('cashy.user_id', true), ''))
  with check (user_id = nullif(current_setting('cashy.user_id', true), ''));
revoke all on schema cashy from public, anon, authenticated;
revoke all on cashy.workspaces from public, anon, authenticated;
grant usage on schema cashy to cashy_runtime;
grant select, insert, update on cashy.workspaces to cashy_runtime;
commit;
