-- Step 2 of stopping photo uploads that skip moderation (step 1 is
-- 20260930100000_storage_delete_by_folder). Apply only once the app stores
-- photos with the service-role key (src/lib/supabase/admin.ts).
--
-- Moderation runs in the server actions, but those used the signed-in user's
-- own session to upload, so anyone could call Supabase directly with the
-- same session: upload any photo, then point a listing or their profile at
-- it. Now only the server can put files into storage, and files it stores
-- have no owner, so "no owner" marks a photo as checked. A listing or profile
-- can only point at such a file in its own user's folder. Signed-in users
-- are the only ones limited: SECURITY DEFINER functions, the service role and
-- the dashboard run as other roles.

drop policy if exists "authenticated users can upload listing images" on storage.objects;
drop policy if exists "users can upload their own avatar" on storage.objects;
drop policy if exists "users can replace their own avatar" on storage.objects;

-- A listing may show photos the app stored for its seller, or photos it
-- already had, or that another of the seller's listings has (relisting copies
-- them). Photos from before this check keep working: their URLs are often
-- percent-encoded, so they're matched as listing URLs, not as file names.
create or replace function private.require_checked_listing_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_prefix constant text := 'https://clpfcygjtkjeafvscdwb.supabase.co/storage/v1/object/public/listing-images/';
  v_url text;
  v_name text;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  foreach v_url in array coalesce(new.images, '{}') loop
    if tg_op = 'UPDATE' and v_url = any(coalesce(old.images, '{}')) then
      continue;
    end if;
    if exists (select 1 from public.listings l where l.seller_id = new.seller_id and v_url = any(l.images)) then
      continue;
    end if;
    v_name := substr(v_url, length(v_prefix) + 1);
    if left(v_url, length(v_prefix)) = v_prefix
       and split_part(v_name, '/', 1) = new.seller_id::text
       and exists (
         select 1 from storage.objects o
         where o.bucket_id = 'listing-images' and o.name = v_name and o.owner is null
       ) then
      continue;
    end if;
    raise exception 'Listing photos have to be uploaded through CampusBin.'
      using errcode = '42501';
  end loop;

  return new;
end;
$$;

drop trigger if exists listings_require_checked_photos on public.listings;
create trigger listings_require_checked_photos
  before insert or update of images on public.listings
  for each row
  execute function private.require_checked_listing_photos();

-- A profile picture may only be a file the app stored in the user's folder.
create or replace function private.require_checked_avatar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_prefix constant text := 'https://clpfcygjtkjeafvscdwb.supabase.co/storage/v1/object/public/avatars/';
  v_name text;
begin
  if current_user <> 'authenticated'
     or new.avatar_url is null
     or new.avatar_url is not distinct from old.avatar_url then
    return new;
  end if;

  -- The app adds ?v=<timestamp> to get past caches; the file is what's before it.
  v_name := split_part(substr(new.avatar_url, length(v_prefix) + 1), '?', 1);
  if left(new.avatar_url, length(v_prefix)) = v_prefix
     and split_part(v_name, '/', 1) = new.id::text
     and exists (
       select 1 from storage.objects o
       where o.bucket_id = 'avatars' and o.name = v_name and o.owner is null
     ) then
    return new;
  end if;

  raise exception 'Profile pictures have to be uploaded through CampusBin.'
    using errcode = '42501';
end;
$$;

drop trigger if exists profiles_require_checked_avatar on public.profiles;
create trigger profiles_require_checked_avatar
  before update of avatar_url on public.profiles
  for each row
  execute function private.require_checked_avatar();
