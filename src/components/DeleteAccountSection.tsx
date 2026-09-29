"use client";

import { useState } from "react";
import DeleteAccountDialog from "./DeleteAccountDialog";

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
      <h2 className="text-sm font-bold text-red-700 dark:text-red-400">Danger zone</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Permanently delete your account and everything tied to it — profile, listings,
        messages, and saved items.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete account
      </button>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
