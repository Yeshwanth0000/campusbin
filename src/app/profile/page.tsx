import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MyListingsGrid from "./MyListingsGrid";
import ProfileEditForm from "./ProfileEditForm";
import UnblockButton from "@/components/UnblockButton";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import ExportDataButton from "@/components/ExportDataButton";
import StatCounter from "@/components/StatCounter";
import AvatarUpload from "@/components/AvatarUpload";

export const metadata = { title: "Your profile — CampusBin" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // None of these four depend on each other's results — only on user.id —
  // so they run concurrently instead of one round-trip at a time.
  const [{ data: profile }, { data: myListings }, { data: blocked }, { count: savedCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, hostel_or_branch, created_at, avatar_url, colleges(name)")
        .eq("id", user.id)
        .single(),
      supabase
        .from("listings")
        .select("id, title, price, images, status, condition, created_at, removed_reason, categories(name)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("blocked_users")
        .select("blocked_id, profiles!blocked_users_blocked_id_fkey(full_name)")
        .eq("blocker_id", user.id),
      supabase
        .from("saved_listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const totalListings = myListings?.length ?? 0;
  const activeListings = myListings?.filter((l) => l.status === "available").length ?? 0;
  const soldListings = myListings?.filter((l) => l.status === "sold").length ?? 0;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="mx-auto w-full max-w-none px-3 py-4 sm:max-w-[min(94vw,96rem)] sm:px-4 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="relative h-28 overflow-hidden bg-gradient-to-br from-brand via-accent to-[var(--mesh-violet)] sm:h-36">
          <div className="mesh-grain absolute inset-0" />
        </div>

        <div className="px-6 pb-6">
          {/* Only the avatar carries the negative margin so it overlaps the
              banner as intended — if the name/email text shared that margin
              too (as a single offset row), its own height pushed it up far
              enough to clip into the banner on mobile, where the shorter
              banner leaves less clearance. */}
          <div className="flex items-end gap-4">
            <AvatarUpload
              avatarUrl={profile?.avatar_url ?? null}
              fallbackLetter={(profile?.full_name ?? "S").charAt(0).toUpperCase()}
            />
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {profile?.full_name ?? "Your profile"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {profile?.colleges?.name} community
            {profile?.hostel_or_branch ? ` · ${profile.hostel_or_branch}` : ""}
            {memberSince ? ` · Member since ${memberSince}` : ""}
          </p>
          <ProfileEditForm
            fullName={profile?.full_name ?? ""}
            hostelOrBranch={profile?.hostel_or_branch ?? ""}
          />

          <div className="mt-6 grid grid-cols-2 gap-6 border-t border-slate-200/70 pt-5 dark:border-slate-800/70 sm:grid-cols-4">
            <StatCounter value={totalListings} label="Listings" />
            <StatCounter value={activeListings} label="Active" />
            <StatCounter value={soldListings} label="Sold" />
            <StatCounter value={savedCount ?? 0} label="Saved" />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">My listings</h2>
        <Link
          href="/sell"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + New listing
        </Link>
      </div>

      {myListings && myListings.length > 0 ? (
        <MyListingsGrid listings={myListings} />
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          You haven&rsquo;t posted anything yet.
        </div>
      )}

      {blocked && blocked.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Blocked users</h2>
          <ul className="mt-3 max-w-sm space-y-2">
            {blocked.map((b) => (
              <li
                key={b.blocked_id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-300">{b.profiles?.full_name ?? "Student"}</span>
                <UnblockButton userId={b.blocked_id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Your data</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Download a copy of your profile, listings, saved items, and messages.
        </p>
        <div className="mt-3">
          <ExportDataButton />
        </div>
      </div>

      <DeleteAccountSection />
    </div>
  );
}
