\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'security assertion failed: %', message;
  end if;
end $$;

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.erase_message_bodies(uuid,boolean)', 'EXECUTE'),
  'anon can execute erase_message_bodies'
);
select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'authenticated can execute trigger-only handle_new_user'
);
select pg_temp.assert_true(
  coalesce((select proconfig @> array['search_path='] from pg_proc where oid = 'public.erase_message_bodies(uuid,boolean)'::regprocedure), false),
  'erase_message_bodies does not pin an empty search_path'
);
select pg_temp.assert_true(
  coalesce((select pg_get_functiondef('public.erase_message_bodies(uuid,boolean)'::regprocedure)
    like '%auth.uid() is distinct from p_user_id%'
    and pg_get_functiondef('public.erase_message_bodies(uuid,boolean)'::regprocedure)
    like '%hard deletion requires service role%'), false),
  'erase_message_bodies is not self-scoped'
);
select pg_temp.assert_true(
  coalesce((select pg_get_functiondef('public.guard_profile_role()'::regprocedure)
    like '%new.role is distinct from old.role%'
    and pg_get_functiondef('public.guard_profile_role()'::regprocedure)
    like '%42501%'
    and pg_get_functiondef('public.guard_profile_role()'::regprocedure)
    like '%service_role%'), false),
  'guard_profile_role does not freeze non-service roles'
);
select pg_temp.assert_true(
  coalesce((select pg_get_triggerdef(t.oid) ilike '%before update of role%'
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and t.tgname = 'profiles_role_guard'
      and not t.tgisinternal), false),
  'profiles_role_guard is not a BEFORE UPDATE OF role trigger'
);
select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'public.guard_profile_role()', 'EXECUTE'),
  'authenticated can execute guard_profile_role directly'
);

rollback;
