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

export type ExpenseInput = {
  description: string;
  category: string;
  amount: number;
  currency: string;
  incurred_on: string;
  is_recurring: boolean;
  recurring_interval: "monthly" | "yearly" | null;
  notes: string | null;
};

export type ExpenseResult = { error: string | null };

// RLS is what actually enforces "superadmin only" here (see the
// platform_expenses policies) -- this action is just the form handler, not
// the security boundary. A non-superadmin's insert/delete is silently
// rejected by Postgres, which surfaces as a generic RLS error below.
export async function addExpense(input: ExpenseInput): Promise<ExpenseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("platform_expenses").insert({
    ...input,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ExpenseResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("platform_expenses").update(input).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}

export async function deleteExpense(id: string): Promise<ExpenseResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("platform_expenses").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}
