"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setCollegeAdmin } from "../actions";

type UserRow = {
  id: string;
  full_name: string;
  college_id: string;
  college_name: string;
  is_admin: boolean;
  is_superadmin: boolean;
};

export default function TeamManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("search_users_for_admin", { p_query: query });
      if (!error && data) setUsers(data as UserRow[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function toggle(user: UserRow) {
    const next = !user.is_admin;
    setPendingId(user.id);
    startTransition(async () => {
      const { error } = await setCollegeAdmin(user.id, next);
      if (error) {
        setToast(error);
      } else {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_admin: next } : u)));
        setToast(`${user.full_name} is ${next ? "now" : "no longer"} an admin of ${user.college_name}.`);
      }
      setPendingId(null);
    });
  }

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students by name…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      {toast && (
        <div className="mt-3 rounded-lg border border-brand/20 bg-brand-light px-3 py-2 text-xs font-medium text-brand-dark dark:border-brand/20 dark:bg-brand/10 dark:text-brand">
          {toast}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-800/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/70 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-400">
              <th className="px-4 py-2.5">Student</th>
              <th className="px-4 py-2.5">College</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{u.full_name}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{u.college_name}</td>
                <td className="px-4 py-2.5">
                  {u.is_superadmin ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                      Platform owner
                    </span>
                  ) : u.is_admin ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      College admin
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Student</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.is_superadmin ? (
                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending && pendingId === u.id}
                      onClick={() => toggle(u)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                        u.is_admin
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                          : "bg-brand text-white hover:bg-brand-dark"
                      }`}
                    >
                      {isPending && pendingId === u.id ? "…" : u.is_admin ? "Revoke admin" : "Make admin"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No students match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
