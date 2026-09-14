-- BUG: the messages/conversations INSERT policies checked for a block by
-- querying blocked_users inline -- but blocked_users' own SELECT policy
-- ("blocker_id = auth.uid()") means that subquery, evaluated as the
-- CURRENT sender, can only see blocks *they* placed, never blocks placed
-- *against* them. Net effect: blocking someone only stopped the blocker
-- from messaging the blocked person, not the other way around -- the
-- direction that actually matters for safety was silently non-functional.
-- Fix: a SECURITY DEFINER helper bypasses the caller's own RLS on
-- blocked_users, so the check is symmetric regardless of who's asking.
create or replace function private.is_blocked_pair(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = user_a and b.blocked_id = user_b)
       or (b.blocker_id = user_b and b.blocked_id = user_a)
  );
$$;

drop policy if exists "users can send messages in their conversations" on public.messages;
create policy "users can send messages in their conversations"
  on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
        and not private.is_blocked_pair(c.buyer_id, c.seller_id)
    )
  );

drop policy if exists "users can create conversations they're part of" on public.conversations;
create policy "users can create conversations they're part of"
  on public.conversations for insert
  with check (
    (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()))
    and exists (
      select 1 from public.listings l
      where l.id = conversations.listing_id and l.seller_id = conversations.seller_id
    )
    and not private.is_blocked_pair(conversations.buyer_id, conversations.seller_id)
  );
