"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AdminResult = { error: string } | { error: null };

export async function resolveReport(
  reportId: string,
  status: "resolved" | "dismissed"
): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  // The real gate is RLS ("admins can resolve reports in their college") —
  // this update simply fails silently (0 rows) for a non-admin. Checking
  // here too just gives a real error message instead of a quiet no-op.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { error: "You don't have permission to do that." };
  }

  // Fetched before the update so a "resolved" verdict against a listing can
  // actually remove it below — otherwise resolving a report just closes the
  // ticket while the junk listing stays up, which is the exact gap that let
  // useless listings pile up unchecked on a previous version of this idea.
  const { data: report } = await supabase
    .from("reports")
    .select("reported_listing_id, reason")
    .eq("id", reportId)
    .single();

  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", reportId);

  if (error) {
    return { error: error.message };
  }

  if (status === "resolved" && report?.reported_listing_id) {
    await supabase
      .from("listings")
      .update({
        status: "removed",
        removed_at: new Date().toISOString(),
        removed_reason: report.reason,
      })
      .eq("id", report.reported_listing_id);

    revalidatePath(`/listings/${report.reported_listing_id}`);
    revalidatePath("/browse");
    revalidatePath("/profile");
  }

  revalidatePath("/admin/reports");
  return { error: null };
}
