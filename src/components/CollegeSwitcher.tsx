"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function CollegeSwitcher({
  colleges,
  className,
}: {
  colleges: { id: string; name: string }[];
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Renders in the header on every page, not just Browse, so there's no
  // reliable server-provided "current college" prop to pass in — this reads
  // whatever ?college= happens to be in the URL right now (absent on any
  // page other than a filtered Browse), falling back to "all".
  const current = searchParams.get("college") ?? "all";

  return (
    <select
      id="college-switch"
      key={current}
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
      className={
        className ??
        "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      }
    >
      <option value="all">All colleges</option>
      {colleges.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
