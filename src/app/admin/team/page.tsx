import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamManager from "./TeamManager";

export const metadata = { title: "Manage Admins — CampusBin" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  // Only the platform owner can grant or revoke a college's admin flag --
  // see set_college_admin's own check for why this isn't a college-admin
  // capability.
  if (!profile?.is_superadmin) notFound();

  const { data, error } = await supabase.rpc("search_users_for_admin", { p_query: "" });

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage admins</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Grant a student admin rights over their own college&rsquo;s dashboard.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          ← Dashboard
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-dashed border-rose-300 bg-rose-50/60 p-6 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          Couldn&rsquo;t load students: {error.message}
        </div>
      ) : (
        <div className="mt-6">
          <TeamManager initialUsers={data ?? []} />
        </div>
      )}
    </div>
  );
}
