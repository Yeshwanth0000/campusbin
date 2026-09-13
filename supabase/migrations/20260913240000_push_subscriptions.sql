-- Web Push subscriptions -- one row per browser/device a student has
-- enabled notifications on. Purely user-owned infrastructure, not scoped
-- to a college, so RLS is a simple "you can only touch your own rows".
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "users can add their own push subscriptions"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());
