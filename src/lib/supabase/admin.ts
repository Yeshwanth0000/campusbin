import { createClient } from "@supabase/supabase-js";

// Full-access Supabase client, for the one write a signed-in user must never
// make on their own: putting a photo into storage. Storage refuses uploads
// from users, so every photo in it has been through moderation in a server
// action first. Returns null when the key isn't configured.
//
// Server code only: the key bypasses RLS. It has no NEXT_PUBLIC_ prefix, so
// Next never puts it in a browser bundle.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
