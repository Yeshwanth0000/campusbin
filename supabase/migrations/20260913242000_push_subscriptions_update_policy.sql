-- upsert-on-endpoint (re-subscribing the same browser) needs an UPDATE
-- policy too -- Postgres checks it for the ON CONFLICT DO UPDATE branch
-- even though the row is owned by the same user doing the insert.
create policy "users can update their own push subscriptions"
  on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
