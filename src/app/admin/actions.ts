"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SetAdminResult = { error: string | null };

export async function setCollegeAdmin(userId: string, makeAdmin: boolean): Promise<SetAdminResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_college_admin", {
    p_target_user_id: userId,
    p_is_admin: makeAdmin,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/team");
  return { error: null };
}
