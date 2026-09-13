-- Lets the platform owner search for a student in any college and grant or
-- revoke that college's admin flag, so a campus doesn't need to wait on the
-- platform owner personally for every admin task once it has its own
-- admin. Both functions are superadmin-only -- a college admin cannot grant
-- admin rights to anyone, including within their own college, since that
-- would let them create a chain of admins outside the owner's visibility.

create or replace function public.search_users_for_admin(p_query text)
returns table (
  id uuid,
  full_name text,
  college_id uuid,
  college_name text,
  is_admin boolean,
  is_superadmin boolean
)
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
begin
  if not exists (
    select 1 from public.profiles caller where caller.id = auth.uid() and coalesce(caller.is_superadmin, false)
  ) then
    raise exception 'search_users_for_admin: not authorised';
  end if;

  return query
    select p.id, p.full_name, p.college_id, c.name as college_name, p.is_admin, p.is_superadmin
    from public.profiles p
    join public.colleges c on c.id = p.college_id
    where p_query is null or trim(p_query) = '' or p.full_name ilike '%' || trim(p_query) || '%'
    order by p.full_name
    limit 25;
end;
$function$;

create or replace function public.set_college_admin(p_target_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and coalesce(is_superadmin, false)
  ) then
    raise exception 'set_college_admin: not authorised';
  end if;

  -- The owner's own superadmin status is a direct DB edit, not a toggle in
  -- this UI -- never let it be switched off through here.
  if exists (select 1 from public.profiles where id = p_target_user_id and is_superadmin) then
    raise exception 'set_college_admin: cannot change a superadmin''s admin flag here';
  end if;

  update public.profiles set is_admin = p_is_admin where id = p_target_user_id;
end;
$function$;
