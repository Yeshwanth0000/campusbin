"use client";

import { toast } from "@/lib/toast";

export default function ShareButton({ title }: { title: string }) {
  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} — CampusBin`, url });
      } catch (err) {
        // AbortError just means the user closed the native share sheet —
        // not a failure worth surfacing.
        if ((err as Error)?.name !== "AbortError") {
          toast("Couldn't share — try copying the link instead.", "error");
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard");
    } catch {
      toast("Couldn't copy the link", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this listing"
      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    </button>
  );
}
