-- The notification bell only ever reflected server-rendered props from the
-- last page load/navigation -- a message arriving while you sat on another
-- page went unnoticed until you moved. `messages` was already in this
-- publication (for the open chat thread); adding `notifications` lets the
-- bell itself subscribe to its own live inserts. RLS already scopes
-- `notifications` to `recipient_id = auth.uid()` (see "Users can view their
-- own notifications"), and Realtime enforces that same policy, so this is
-- safe to add without any new policy.
alter publication supabase_realtime add table public.notifications;
