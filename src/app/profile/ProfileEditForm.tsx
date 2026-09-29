"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileResult } from "@/app/actions/profile";
import { toast } from "@/lib/toast";
import SubmitButton from "@/components/SubmitButton";

const initialState: ProfileResult = { error: null };

export default function ProfileEditForm({
  fullName,
  hostelOrBranch,
}: {
  fullName: string;
  hostelOrBranch: string;
}) {
  const [editing, setEditing] = useState(false);
  // Reacting to the save's own result, not to `state` in an effect: an effect
  // with a skip-the-first-run ref fired "Profile updated." on page load
  // whenever the component mounted twice (React dev mode, remounts).
  const [state, formAction] = useActionState(async (prev: ProfileResult, formData: FormData) => {
    const result = await updateProfile(prev, formData);
    if (!result.error) {
      toast("Profile updated.");
      setEditing(false);
    }
    return result;
  }, initialState);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Edit profile
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 max-w-sm space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div>
        <label htmlFor="fullName" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          maxLength={100}
          defaultValue={fullName}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="hostelOrBranch" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Hostel / Branch
        </label>
        <input
          id="hostelOrBranch"
          name="hostelOrBranch"
          type="text"
          maxLength={100}
          defaultValue={hostelOrBranch}
          placeholder="e.g. CSE, Hostel 12"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <div className="flex-1">
          <SubmitButton>Save</SubmitButton>
        </div>
      </div>
    </form>
  );
}
