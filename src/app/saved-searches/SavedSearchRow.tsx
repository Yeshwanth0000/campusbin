"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteSavedSearch, touchSavedSearch } from "@/app/actions/savedSearches";

type Search = {
  id: string;
  query: string | null;
  condition: string | null;
  posted: string | null;
  category_id: string | null;
  categories: { name: string; slug: string } | null;
  newCount: number;
};

function buildBrowseUrl(s: Search) {
  const params = new URLSearchParams();
  if (s.categories?.slug) params.set("category", s.categories.slug);
  if (s.query) params.set("q", s.query);
  if (s.condition) params.set("condition", s.condition);
  if (s.posted) params.set("posted", s.posted);
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

function summarize(s: Search): string {
  const parts: string[] = [];
  if (s.query) parts.push(`"${s.query}"`);
  if (s.categories?.name) parts.push(s.categories.name);
  if (s.condition) parts.push(s.condition);
  if (s.posted) parts.push(`posted: ${s.posted}`);
  return parts.length > 0 ? parts.join(" · ") : "All listings";
}

export default function SavedSearchRow({ search }: { search: Search }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link
        href={buildBrowseUrl(search)}
        onClick={() => touchSavedSearch(search.id)}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {summarize(search)}
        </p>
        {search.newCount > 0 && (
          <p className="mt-0.5 text-xs font-semibold text-brand">
            {search.newCount} new listing{search.newCount === 1 ? "" : "s"}
          </p>
        )}
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteSavedSearch(search.id))}
        aria-label="Delete saved search"
        className="shrink-0 rounded-md p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}
