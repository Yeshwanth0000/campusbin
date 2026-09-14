-- Homepage "students joined" stat was counting every row in profiles,
-- including admin accounts. After wiping test/dummy data down to just the
-- admin account, this would have shown "1 student joined" with zero real
-- users. Exclude admin/superadmin rows so the counter reflects actual
-- student signups only.
create or replace function public.get_homepage_stats()
returns table (active_listings bigint, students_joined bigint)
language sql
stable
as $$
  select
    (select count(*) from public.listings where status = 'available'),
    (select count(*) from public.profiles where is_admin = false and is_superadmin = false);
$$;
