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
-- Booking invariants run as fixed actors so this file catches both RLS and
-- trigger regressions without relying on a developer's local auth users.
insert into auth.users
  (id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'task3-guest@example.test', '', now(), '{}'::jsonb,
   '{"full_name":"Task 3 Guest"}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'task3-host@example.test', '', now(), '{}'::jsonb,
   '{"full_name":"Task 3 Host","role":"host"}'::jsonb, now(), now())
 on conflict (id) do nothing;

insert into public.venues
  (id, owner_id, name, city, capacity, price_per_hour, price_unit, status)
values
  ('20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002', 'Task 3 Hourly Venue', 'Cebu',
   10, 1000, 'hour', 'live'),
  ('20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002', 'Task 3 Head Venue', 'Cebu',
   10, 250, 'head', 'live')
 on conflict (id) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

insert into public.bookings
  (id, user_id, venue_id, venue_name, event_date, hours, guests, total_php, status)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'forged venue name', current_date + 30,
   4, 4, 1, 'confirmed');

select pg_temp.assert_true(
  (select total_php = 4400 and status = 'requested'
     and venue_name = 'Task 3 Hourly Venue'
   from public.bookings b
  where b.id = '30000000-0000-0000-0000-000000000001'),
  'hourly booking total/status/name are not canonical'
);

do $$
begin
  begin
    update public.bookings
       set status = 'confirmed'
     where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'guest confirmation unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'guest confirmation unexpectedly succeeded' then
      raise;
    end if;
  end;
end $$;

insert into public.bookings
  (user_id, venue_id, venue_name, event_date, hours, guests, total_php, status)
values
  ('10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000002', 'forged venue name', current_date + 31,
   1, 3, 1, 'requested');

select pg_temp.assert_true(
  (select total_php = 825 and venue_name = 'Task 3 Head Venue'
   from public.bookings
   where venue_id = '20000000-0000-0000-0000-000000000002'
     and user_id = '10000000-0000-0000-0000-000000000001'),
  'per-head booking total/name are not canonical'
);

do $$
begin
  begin
    insert into public.bookings
      (user_id, venue_id, venue_name, event_date, hours, guests, total_php, status)
    values
      ('10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000002', 'forged venue name', current_date + 32,
       1, 11, 1, 'requested');
    raise exception 'over-capacity booking unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'over-capacity booking unexpectedly succeeded' then
      raise;
    end if;
  end;
end $$;

-- The soft-delete columns and all cross-party content FKs must be present and
-- restrictive; account-owned cleanup FKs remain cascades.
select pg_temp.assert_true(
  to_regclass('public.bookings') is not null
  and exists (select 1 from pg_attribute where attrelid = 'public.bookings'::regclass and attname = 'deleted_at')
  and exists (select 1 from pg_attribute where attrelid = 'public.venues'::regclass and attname = 'deleted_at'),
  'soft-delete columns are missing'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.bookings', 'DELETE')
  and not has_table_privilege('authenticated', 'public.venues', 'DELETE'),
  'authenticated can hard-delete bookings or venues'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from pg_constraint
    where conrelid in ('public.bookings'::regclass, 'public.venues'::regclass,
                       'public.conversations'::regclass, 'public.messages'::regclass,
                       'public.reviews'::regclass)
      and contype = 'f'
      and confdeltype = 'c'
      and confrelid in ('public.bookings'::regclass, 'public.venues'::regclass,
                        'public.conversations'::regclass, 'public.messages'::regclass,
                        'public.reviews'::regclass)
  ),
  'cross-party foreign key still cascades on delete'
);

rollback;
