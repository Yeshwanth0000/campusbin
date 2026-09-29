-- CRITICAL FIX: the "users can update own listings" RLS policy only checks
-- that the seller owns the row, not which columns change, and
-- `authenticated` can write every listings column. So a seller could call
-- the API directly (skipping the app's server actions) and undo an admin's
-- removal by setting status, removed_at and removed_reason back themselves,
-- inflate view_count, or move created_at forward to stay at the top of the
-- newest-first feed and out of reach of the 60-day expiry. Inserts had the
-- same hole, and a backdated created_at also slipped past the hourly
-- posting limit, which counts by created_at.
--
-- A trigger rather than column grants (as 20260914110527 did for profiles
-- and messages): admins remove listings as the same `authenticated` role,
-- through the "admins can remove listings in their college" policy, so only
-- the admin flag can tell them apart from sellers. Only direct requests
-- from signed-in users are limited. SECURITY DEFINER functions such as
-- increment_listing_view and expire_stale_listings run as their owner, so
-- view counting and expiry are unaffected, as are the service role and the
-- dashboard.

create or replace function private.protect_listing_moderation_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- Set by the database, never by the seller.
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.view_count := 0;
    new.removed_at := null;
    new.removed_reason := null;
    return new;
  end if;

  new.created_at := old.created_at;
  new.view_count := old.view_count;

  -- Removing a listing, or undoing a removal, is an admin decision. This is
  -- private.is_admin() written out: this function runs as the signed-in
  -- user, who has no access to the private schema (RLS policies can call it
  -- only because they're compiled when they're created).
  if (new.status is distinct from old.status and 'removed' in (old.status, new.status))
     or new.removed_at is distinct from old.removed_at
     or new.removed_reason is distinct from old.removed_reason then
    if not coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false) then
      raise exception 'Only an admin can remove a listing or undo a removal.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_protect_moderation_columns on public.listings;
create trigger listings_protect_moderation_columns
  before insert or update on public.listings
  for each row
  execute function private.protect_listing_moderation_columns();
