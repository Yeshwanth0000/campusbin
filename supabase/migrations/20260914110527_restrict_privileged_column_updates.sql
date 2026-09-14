-- CRITICAL FIX: the "users can update own profile" RLS policy only checks
-- row ownership (id = auth.uid()), not which columns are being changed.
-- Combined with Supabase's default full-table UPDATE grant to `authenticated`,
-- any signed-in user could call the client SDK directly (bypassing the app's
-- UI/server actions entirely) to set is_admin, is_superadmin, or college_id
-- on their own row -- granting themselves platform-superadmin access, or
-- jumping into another college's private marketplace. The sanctioned path
-- for changing admin status (set_college_admin) is a SECURITY DEFINER
-- function owned by a role with full table privileges, so restricting the
-- authenticated role's column grants does not affect it.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, hostel_or_branch, avatar_url, phone_number)
  on public.profiles to authenticated;

-- Same class of issue on messages: the "recipients can mark messages as
-- read" policy only checks conversation participation, not which columns
-- change, so a recipient could rewrite the content/sender of any message
-- in their conversations. The app only ever sets read_at from client code.
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;
