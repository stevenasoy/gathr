-- Gathr v10: lock privileged functions and profile roles.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter default privileges in schema public revoke execute on functions from public;
revoke execute on all functions in schema public from public, anon, authenticated;

drop trigger if exists reviews_refresh_stats on public.reviews;
drop trigger if exists reviews_refresh_review_stats_insert on public.reviews;
drop trigger if exists reviews_refresh_review_stats_update on public.reviews;
drop trigger if exists reviews_refresh_review_stats_delete on public.reviews;
drop function if exists public.refresh_venue_review_stats();
drop function if exists public.refresh_review_stats();
-- Task 4 intentionally replaces the removed review-refresh materialized view
-- path with a safe view.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 120), 'gatherer')
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = pg_catalog.now();
  return new;
end $$;

create or replace function public.erase_message_bodies(
  p_user_id uuid,
  p_hard_delete boolean default false
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected int;
  caller_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if caller_role <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'message erasure is limited to the current user' using errcode = '42501';
  end if;
  if p_hard_delete and caller_role <> 'service_role' then
    raise exception 'hard deletion requires service role' using errcode = '42501';
  end if;

  if p_hard_delete then
    delete from public.messages where sender_id = p_user_id;
  else
    update public.messages
       set body = '[deleted]', updated_at = pg_catalog.now()
     where sender_id = p_user_id;
  end if;
  get diagnostics affected = row_count;
  return affected;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.erase_message_bodies(uuid, boolean) from public, anon;
grant execute on function public.erase_message_bodies(uuid, boolean) to authenticated, service_role;

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'profile roles are server-managed' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
before update of role on public.profiles
for each row execute function public.guard_profile_role();

revoke all on function public.guard_profile_role() from public, anon, authenticated;

commit;
