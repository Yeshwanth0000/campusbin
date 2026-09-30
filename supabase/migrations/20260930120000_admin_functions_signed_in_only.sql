-- Supabase's security advisor flagged these SECURITY DEFINER functions as
-- callable by logged-out visitors. The admin ones already refuse anyone who
-- isn't a superadmin or admin, so this removes exposure rather than a hole.
-- Functions get EXECUTE for PUBLIC by default, so it has to come off PUBLIC
-- as well as anon. (get_public_listing_preview is meant to be public: it's
-- the listing preview shown to logged-out visitors.)
revoke execute on function public.admin_dashboard_overview(uuid, text) from public, anon;
revoke execute on function public.search_users_for_admin(text) from public, anon;
revoke execute on function public.set_college_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_dashboard_overview(uuid, text) to authenticated, service_role;
grant execute on function public.search_users_for_admin(text) to authenticated, service_role;
grant execute on function public.set_college_admin(uuid, boolean) to authenticated, service_role;

-- A trigger function (it clears a conversation's notifications when the
-- conversation is deleted). Triggers fire without EXECUTE, so nobody needs
-- to call it through the API, same as notify_new_message.
revoke execute on function public.cleanup_conversation_notifications() from public, anon, authenticated;
