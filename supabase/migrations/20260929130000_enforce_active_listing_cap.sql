-- The 10-active-listings cap (MAX_ACTIVE_LISTINGS in src/lib/listingLimits.ts)
-- was only checked in the app's server actions. A seller calling the API
-- directly could post past it, or switch sold and expired listings straight
-- back to available. This enforces it in the database whenever one of a
-- seller's listings becomes available, with the same message the app shows.
--
-- Only signed-in users acting on their own listings are checked. An admin
-- undoing a removal, SECURITY DEFINER functions, the service role and the
-- dashboard aren't limited. The advisory lock makes simultaneous posts from
-- one seller take turns, so they can't all slip in under the cap together.

create or replace function private.enforce_active_listing_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count int;
begin
  if current_user <> 'authenticated'
     or new.status <> 'available'
     or new.seller_id is distinct from auth.uid()
     or (tg_op = 'UPDATE' and old.status = 'available') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('active_listing_cap:' || new.seller_id::text));

  select count(*) into v_count
  from public.listings
  where seller_id = new.seller_id and status = 'available';

  -- Keep in step with MAX_ACTIVE_LISTINGS in src/lib/listingLimits.ts.
  if v_count >= 10 then
    raise exception 'You''ve reached the limit of 10 active listings. Mark one as sold or delete it before posting another.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Postgres runs BEFORE triggers in name order, and this one is named to sort
-- after listings_protect_moderation_columns: a seller trying to undo an
-- admin's removal should be told only an admin can do that, not that
-- they're at the cap. (Applied as listings_enforce_active_cap, then
-- renamed by the run_active_listing_cap_after_removal_check migration.)
drop trigger if exists listings_seller_active_cap on public.listings;
create trigger listings_seller_active_cap
  before insert or update of status on public.listings
  for each row
  execute function private.enforce_active_listing_cap();
