-- Saved searches were removed from the app on 2026-09-29 (commit 2140cf1):
-- no student ever used them, and the page promised match notifications that
-- never existed. The table only held the owner's one test search. Dropping
-- it takes its RLS policies and rate-limit trigger with it; nothing else
-- references it (account deletion doesn't touch it).
drop table if exists public.saved_searches;
drop function if exists public.enforce_saved_search_rate_limit();
