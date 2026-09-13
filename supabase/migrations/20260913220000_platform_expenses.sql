-- Project running costs (domain, hosting, email, etc.) -- entirely separate
-- from the marketplace data model. This is the platform owner's own
-- business record, not scoped to any college, so RLS locks it to
-- is_superadmin specifically rather than is_admin: a future per-college
-- admin should never see what the platform costs to run.
create table public.platform_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'INR',
  incurred_on date not null default current_date,
  is_recurring boolean not null default false,
  recurring_interval text check (recurring_interval in ('monthly', 'yearly') or recurring_interval is null),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.platform_expenses enable row level security;

create policy "superadmin can view expenses"
  on public.platform_expenses for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_superadmin));

create policy "superadmin can add expenses"
  on public.platform_expenses for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_superadmin));

create policy "superadmin can edit expenses"
  on public.platform_expenses for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_superadmin));

create policy "superadmin can delete expenses"
  on public.platform_expenses for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and is_superadmin));
