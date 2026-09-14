"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { markAsSold, deleteListing, relistListing } from "@/app/actions/listings";
import { toast } from "@/lib/toast";

export default function SellerQuickActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleMarkSold(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    startTransition(async () => {
      await markAsSold(listingId);
      toast("Marked as sold.");
    });
  }

  function handleRelist(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    startTransition(async () => {
      // Redirects to the new listing on success, so we only ever get here on error.
      const result = await relistListing(listingId);
      if (result?.error) toast(result.error, "error");
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this listing? This can't be undone — its photos and chat history will be gone.")) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      await deleteListing(listingId);
      toast("Listing deleted.");
    });
  }

  return (
    // stopPropagation on the whole wrapper keeps every click here (including
    // the Edit link) from bubbling up into the card's own <Link> to the
    // listing detail page.
    <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        aria-label="Listing actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:text-brand disabled:pointer-events-none disabled:opacity-60 dark:bg-slate-900/80 dark:text-slate-300"
      >
        {isPending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-10 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          {status === "available" && (
            <>
              <Link
                href={`/listings/${listingId}/edit`}
                role="menuitem"
                className="block px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Edit
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleMarkSold}
                className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Mark as sold
              </button>
            </>
          )}
          {(status === "sold" || status === "expired") && (
            <button
              type="button"
              role="menuitem"
              onClick={handleRelist}
              className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Relist
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
