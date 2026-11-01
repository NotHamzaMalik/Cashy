begin;
create or replace function cashy.create_family(family_name text, family_role text, member_name text, initial_data jsonb)
returns jsonb language plpgsql security definer set search_path = cashy, pg_temp as $$
declare uid text := nullif(current_setting('cashy.user_id', true), ''); hid uuid; code text;
begin
  if uid is null or family_role not in ('dad','manager') or length(trim(family_name)) not between 1 and 100 or length(trim(member_name)) not between 1 and 100 then raise exception 'invalid family'; end if;
  if exists(select 1 from memberships where user_id = uid) then raise exception 'already joined'; end if;
  loop
    code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists(select 1 from households where invite_code = code);
  end loop;
  insert into households(name, invite_code, created_by) values(trim(family_name), code, uid) returning id into hid;
  insert into memberships(user_id, household_id, role, display_name) values(uid, hid, family_role, trim(member_name));
  insert into household_workspaces(household_id, revision, data) values(hid, 1, initial_data);
  return family_status();
end;
$$;
revoke all on function cashy.create_family(text,text,text,jsonb) from public;
grant execute on function cashy.create_family(text,text,text,jsonb) to cashy_runtime;
commit;
