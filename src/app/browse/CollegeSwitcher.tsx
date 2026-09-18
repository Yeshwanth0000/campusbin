"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function CollegeSwitcher({
  colleges,
  current,
}: {
  colleges: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="mb-4 flex items-center gap-2">
      <label htmlFor="college-switch" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Viewing
      </label>
      <select
        id="college-switch"
        defaultValue={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === "all") {
            params.delete("college");
          } else {
            params.set("college", e.target.value);
          }
          const qs = params.toString();
          router.push(`/browse${qs ? `?${qs}` : ""}`);
        }}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="all">All colleges</option>
        {colleges.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
