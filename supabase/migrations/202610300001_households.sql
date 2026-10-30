begin;
create extension if not exists pgcrypto;

create table if not exists cashy.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  invite_code text not null unique check (length(invite_code) = 8),
  created_by text not null check (length(created_by) between 1 and 100),
  created_at timestamptz not null default now()
);
create table if not exists cashy.memberships (
  user_id text primary key check (length(user_id) between 1 and 100),
  household_id uuid not null references cashy.households(id) on delete cascade,
  role text not null check (role in ('dad', 'manager')),
  display_name text not null check (length(display_name) between 1 and 100),
  joined_at timestamptz not null default now()
);
create table if not exists cashy.household_workspaces (
  household_id uuid primary key references cashy.households(id) on delete cascade,
  revision integer not null check (revision > 0),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'version' = '1'),
  updated_at timestamptz not null default now()
);

alter table cashy.households enable row level security;
alter table cashy.households force row level security;
alter table cashy.memberships enable row level security;
alter table cashy.memberships force row level security;
alter table cashy.household_workspaces enable row level security;
alter table cashy.household_workspaces force row level security;
revoke all on cashy.households, cashy.memberships, cashy.household_workspaces from public, anon, authenticated, cashy_runtime;

create or replace function cashy.family_status()
returns jsonb language sql stable security definer set search_path = cashy, pg_temp as $$
  select case when m.user_id is null then null else jsonb_build_object(
    'id', h.id, 'name', h.name, 'inviteCode', h.invite_code,
    'role', m.role, 'displayName', m.display_name,
    'members', coalesce((select jsonb_agg(jsonb_build_object('displayName', mm.display_name, 'role', mm.role) order by mm.joined_at) from memberships mm where mm.household_id = h.id), '[]'::jsonb)
  ) end
  from (select nullif(current_setting('cashy.user_id', true), '') as user_id) u
  left join memberships m on m.user_id = u.user_id
  left join households h on h.id = m.household_id;
$$;

create or replace function cashy.create_family(family_name text, family_role text, member_name text, initial_data jsonb)
returns jsonb language plpgsql security definer set search_path = cashy, pg_temp as $$
declare uid text := nullif(current_setting('cashy.user_id', true), ''); hid uuid; code text;
begin
  if uid is null or family_role not in ('dad','manager') or length(trim(family_name)) not between 1 and 100 or length(trim(member_name)) not between 1 and 100 then raise exception 'invalid family'; end if;
  if exists(select 1 from memberships where user_id = uid) then raise exception 'already joined'; end if;
  loop
    code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists(select 1 from households where invite_code = code);
  end loop;
  insert into households(name, invite_code, created_by) values(trim(family_name), code, uid) returning id into hid;
  insert into memberships(user_id, household_id, role, display_name) values(uid, hid, family_role, trim(member_name));
  insert into household_workspaces(household_id, revision, data) values(hid, 1, initial_data);
  return family_status();
end;
$$;

create or replace function cashy.join_family(code text, family_role text, member_name text)
returns jsonb language plpgsql security definer set search_path = cashy, pg_temp as $$
declare uid text := nullif(current_setting('cashy.user_id', true), ''); hid uuid;
begin
  if uid is null or family_role not in ('dad','manager') or length(trim(member_name)) not between 1 and 100 then raise exception 'invalid family member'; end if;
  if exists(select 1 from memberships where user_id = uid) then raise exception 'already joined'; end if;
  select id into hid from households where invite_code = upper(trim(code));
  if hid is null then raise exception 'invalid invite'; end if;
  insert into memberships(user_id, household_id, role, display_name) values(uid, hid, family_role, trim(member_name));
  return family_status();
end;
$$;

create or replace function cashy.read_family_workspace()
returns table(revision integer, data jsonb) language sql stable security definer set search_path = cashy, pg_temp as $$
  select w.revision, w.data from memberships m join household_workspaces w on w.household_id = m.household_id
  where m.user_id = nullif(current_setting('cashy.user_id', true), '');
$$;

create or replace function cashy.write_family_workspace(expected_revision integer, next_data jsonb)
returns integer language sql security definer set search_path = cashy, pg_temp as $$
  update household_workspaces w set data = next_data, revision = w.revision + 1, updated_at = now()
  from memberships m where m.user_id = nullif(current_setting('cashy.user_id', true), '')
    and m.household_id = w.household_id and w.revision = expected_revision
  returning w.revision;
$$;

revoke all on function cashy.family_status(), cashy.create_family(text,text,text,jsonb), cashy.join_family(text,text,text), cashy.read_family_workspace(), cashy.write_family_workspace(integer,jsonb) from public;
grant execute on function cashy.family_status(), cashy.create_family(text,text,text,jsonb), cashy.join_family(text,text,text), cashy.read_family_workspace(), cashy.write_family_workspace(integer,jsonb) to cashy_runtime;
commit;
