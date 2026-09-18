-- Gives admin report resolution real teeth: a "removed" listing status,
-- context columns so the owner sees why, and an RLS policy letting admins
-- actually update (remove) listings in their own college. Without this,
-- resolveReport() only closed the report ticket while the reported listing
-- stayed live — the exact gap that let junk listings pile up unchecked.

alter table public.listings
  drop constraint listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status = any (array['available', 'sold', 'expired', 'removed']));

alter table public.listings
  add column removed_reason text,
  add column removed_at timestamptz;

create policy "admins can remove listings in their college"
on public.listings
for update
using (private.is_admin() and college_id = private.current_college_id())
with check (private.is_admin() and college_id = private.current_college_id());
