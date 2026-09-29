"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

export default function LoadMore({
  href,
  shown,
  total,
  nextCount,
  autoLoad,
}: {
  href: string;
  shown: number;
  total: number;
  nextCount: number;
  autoLoad: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const [pending, startTransition] = useTransition();

  // One navigation per href. A successful load changes the URL, which
  // re-renders this with the next page's href and clears the guard below,
  // so an in-flight request can't be fired twice by a jittery scroll.
  const firedRef = useRef(false);
  useEffect(() => {
    firedRef.current = false;
  }, [href]);

  const load = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    startTransition(() => {
      // scroll:false is the whole point — appending rows must not yank the
      // user back to the top of the grid.
      router.push(href, { scroll: false });
    });
  }, [href, router]);

  useEffect(() => {
    if (!autoLoad) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) load();
      },
      // Fire a little before the button is actually on screen so the next
      // rows are usually already there when the user arrives.
      { rootMargin: "400px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoLoad, load]);

  const pct = total > 0 ? Math.round((shown / total) * 100) : 0;

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <Link
        ref={ref}
        href={href}
        scroll={false}
        onClick={(event) => {
          // Plain left clicks load in place; modifier and middle clicks fall
          // through to the real href so "open in new tab" still works.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          load();
        }}
        aria-busy={pending}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand dark:hover:text-brand"
      >
        {pending ? (
          <>
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
            Loading…
          </>
        ) : (
          `Load ${nextCount} more`
        )}
      </Link>

      <div className="flex flex-col items-center gap-1.5">
        <div
          className="h-1 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={shown}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Listings loaded"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {shown} of {total}
        </p>
      </div>
    </div>
  );
}
