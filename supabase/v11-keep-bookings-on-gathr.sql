-- Gathr v11: keep bookings on Gathr.
--
-- Until a booking is confirmed, messages may not carry contact details. A
-- BEFORE INSERT trigger on public.messages replaces phone numbers, emails,
-- links and @handles with a placeholder when the thread is an inquiry
-- (conversation_id) or a booking that is not yet confirmed or completed.
--
-- The API applies the same rules in apps/api/src/lib/contact-mask.ts so it
-- can tell the client the message was masked. This trigger is the backstop for
-- any client that inserts into public.messages directly under RLS.
--
-- Apply after v10-security-hardening.sql. Idempotent.

begin;

create or replace function public.mask_contact_before_confirm()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_mask constant text := '[hidden until the booking is confirmed]';
begin
  if new.booking_id is not null then
    select b.status into v_status from public.bookings b where b.id = new.booking_id;
    if v_status in ('confirmed', 'completed') then
      return new;
    end if;
  end if;

  -- Order matters: emails before handles, URLs before bare domains inside them.
  new.body := regexp_replace(new.body, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', v_mask, 'g');
  new.body := regexp_replace(new.body, '\m(?:https?://|www\.)\S+', v_mask, 'gi');
  new.body := regexp_replace(new.body, '\m[A-Za-z0-9-]+\.(?:com|ph|net|org|co|io|me|link|page|site|app|xyz|info)\M(?:/\S*)?', v_mask, 'gi');
  -- Ten or more digits with at most one separator between each pair (") " after an area code counts as one).
  new.body := regexp_replace(new.body, '\+?\(?\d(?:(?:[\s().-]|\)\s)?\d){9,}', v_mask, 'g');
  new.body := regexp_replace(new.body, '(?<![\w@])@[A-Za-z0-9_.]{3,}', v_mask, 'g');
  return new;
end $$;

revoke execute on function public.mask_contact_before_confirm() from public, anon, authenticated;

drop trigger if exists messages_mask_contact_before_confirm on public.messages;
create trigger messages_mask_contact_before_confirm
  before insert on public.messages
  for each row execute function public.mask_contact_before_confirm();

commit;
