-- Flagged by the Supabase security advisor: this function lacked a pinned
-- search_path. Low severity here since it's a plain (not SECURITY DEFINER)
-- function, but every other function in this codebase pins it, so this
-- closes the one straggler for consistency.
create or replace function public.get_homepage_stats()
returns table (active_listings bigint, students_joined bigint)
language sql
stable
set search_path = public
as $$
  select
    (select count(*) from public.listings where status = 'available'),
    (select count(*) from public.profiles where is_admin = false and is_superadmin = false);
$$;
