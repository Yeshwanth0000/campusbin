import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MAX_ACTIVE_LISTINGS } from "@/lib/listingLimits";
import SellForm from "./SellForm";

export const metadata = { title: "Sell an item — CampusBin" };

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: categories }, { data: profile }, { count: activeCount }] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("profiles").select("phone_number").eq("id", user.id).single(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "available"),
  ]);

  const used = activeCount ?? 0;
  const atLimit = used >= MAX_ACTIVE_LISTINGS;
  const nearLimit = !atLimit && used >= MAX_ACTIVE_LISTINGS - 2;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sell an item</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Your listing will only be visible to students on your own campus.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Active listings</span>
          <span
            className={
              atLimit
                ? "font-semibold text-red-600 dark:text-red-400"
                : nearLimit
                  ? "font-semibold text-amber-600 dark:text-amber-400"
                  : "font-semibold text-slate-900 dark:text-slate-100"
            }
          >
            {used} / {MAX_ACTIVE_LISTINGS}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={
              "h-full rounded-full transition-[width] " +
              (atLimit ? "bg-red-500" : nearLimit ? "bg-amber-500" : "bg-emerald-500")
            }
            style={{ width: `${Math.min(100, (used / MAX_ACTIVE_LISTINGS) * 100)}%` }}
          />
        </div>
        {atLimit && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            You&apos;ve reached the limit. Mark a listing as sold or delete one before posting another.
          </p>
        )}
      </div>

      <SellForm categories={categories ?? []} savedPhoneNumber={profile?.phone_number ?? ""} />
    </div>
  );
}
