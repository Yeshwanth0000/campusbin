-- is_admin means "admin of my own college" everywhere it's already checked
-- (admin_dashboard_stats, the /admin page). A platform owner who needs to
-- see every college, and grant is_admin to people in OTHER colleges, needs
-- a separate flag so a future per-college admin never inherits cross-college
-- access just by being an admin.
alter table public.profiles add column if not exists is_superadmin boolean not null default false;

update public.profiles
set is_superadmin = true
where id = 'f9671e38-ca2f-47dc-8107-610504f09dff'; -- Yeshwanth Pendyala, platform owner
