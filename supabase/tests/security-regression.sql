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

rollback;
