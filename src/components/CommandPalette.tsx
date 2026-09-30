"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { categoryIcon } from "@/lib/categoryIcons";
import { addRecentSearch, clearRecentSearches, getRecentSearches } from "@/lib/recentSearches";
import { announceOverlayOpen, onOtherOverlayOpen, onSearchOpenRequest } from "@/lib/overlayBus";
import { quickSearchListings, type QuickSearchResult } from "@/app/actions/listings";

const OVERLAY_ID = "search";

// navigator.platform never changes, so there's nothing to subscribe to.
function subscribeToNothing() {
  return () => {};
}

function isMacPlatform() {
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

type Category = { id: string; name: string; slug: string };

type ResultItem =
  | { kind: "search"; label: string; query: string }
  | { kind: "recent"; label: string; query: string }
  | { kind: "category"; label: string; slug: string }
  | { kind: "listing"; label: string; id: string; price: number; image: string | null };

export default function CommandPalette({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const isMac = useSyncExternalStore(subscribeToNothing, isMacPlatform, () => false);
  const [listingMatches, setListingMatches] = useState<QuickSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    setListingMatches([]);
  }, []);

  // Recent searches live in localStorage, so they're read each time the
  // palette opens rather than while rendering.
  const openPalette = useCallback(() => {
    setRecent(getRecentSearches());
    setActiveIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRecent(getRecentSearches());
        setActiveIndex(0);
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    announceOverlayOpen(OVERLAY_ID);
    // Focus immediately rather than only via requestAnimationFrame — some
    // environments never fire that callback, which left the dialog open
    // but the input unfocused, so typing right after opening did nothing.
    inputRef.current?.focus();
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => onOtherOverlayOpen(OVERLAY_ID, close), [close]);

  useEffect(() => onSearchOpenRequest(openPalette), [openPalette]);

  const trimmed = query.trim();

  useEffect(() => {
    // Emptying the query clears the matches where it happens (onChange, close).
    if (!trimmed) return;
    let cancelled = false;
    const id = setTimeout(() => {
      quickSearchListings(trimmed).then((matches) => {
        if (!cancelled) setListingMatches(matches);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [trimmed]);

  const results: ResultItem[] = useMemo(() => {
    const lower = trimmed.toLowerCase();
    const matchingCategories = categories.filter((c) =>
      lower ? c.name.toLowerCase().includes(lower) : true
    );

    if (!trimmed) {
      return [
        ...recent.map((q): ResultItem => ({ kind: "recent", label: q, query: q })),
        ...matchingCategories.map((c): ResultItem => ({ kind: "category", label: c.name, slug: c.slug })),
      ];
    }

    return [
      ...listingMatches.map(
        (l): ResultItem => ({ kind: "listing", label: l.title, id: l.id, price: l.price, image: l.image })
      ),
      { kind: "search", label: trimmed, query: trimmed },
      ...matchingCategories.map((c): ResultItem => ({ kind: "category", label: c.name, slug: c.slug })),
    ];
  }, [trimmed, recent, categories, listingMatches]);

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const go = useCallback(
    (item: ResultItem) => {
      if (item.kind === "category") {
        router.push(`/browse?category=${item.slug}`);
      } else if (item.kind === "listing") {
        router.push(`/listings/${item.id}`);
      } else {
        addRecentSearch(item.query);
        router.push(`/browse?q=${encodeURIComponent(item.query)}`);
      }
      close();
    },
    [router, close]
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) go(item);
    }
  }

  const showRecentHeader = !trimmed && recent.length > 0;
  const recentCount = !trimmed ? recent.length : 0;

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="group hidden w-full max-w-xs items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 transition hover:border-brand/50 hover:bg-white hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand/40 dark:hover:bg-slate-900/80 dark:hover:text-slate-200 sm:flex"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-brand" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m21 21-4.3-4.3" />
        </svg>
        <span className="flex-1 text-left">Search listings…</span>
        <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/80 px-4 pt-[12vh]"
            style={{ animation: "palette-backdrop-in 0.15s ease-out" }}
            onClick={close}
          >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white/98 shadow-2xl shadow-slate-900/25 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/98"
            style={{ animation: "palette-panel-in 0.18s var(--ease-premium)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                  if (!e.target.value.trim()) setListingMatches([]);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Search listings or jump to a category…"
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                aria-autocomplete="list"
              />
              <kbd className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
              {results.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No matches. Press Enter to search anyway.
                </p>
              )}

              {showRecentHeader && (
                <div className="flex items-center justify-between px-4 pb-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Recent searches
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                    }}
                    className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-brand"
                  >
                    Clear
                  </button>
                </div>
              )}

              {results.map((item, i) => {
                const isCategoryStart = item.kind === "category" && (i === 0 || results[i - 1].kind !== "category");
                const isListingStart = item.kind === "listing" && (i === 0 || results[i - 1].kind !== "listing");
                return (
                  <div key={`${item.kind}-${item.label}-${i}`}>
                    {isListingStart && (
                      <div className="px-4 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Listings
                      </div>
                    )}
                    {isCategoryStart && recentCount + (trimmed ? 1 : 0) > 0 && (
                      <div className="px-4 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Categories
                      </div>
                    )}
                    <button
                      type="button"
                      data-active={activeIndex === i}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(item)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        activeIndex === i
                          ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item.kind === "listing" && (
                        <>
                          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                            {item.image ? (
                              <Image src={item.image} alt="" fill sizes="36px" className="object-cover" />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <span className="shrink-0 text-xs font-semibold text-brand">
                            {item.price > 0 ? `₹${item.price.toLocaleString("en-IN")}` : "Free"}
                          </span>
                        </>
                      )}
                      {item.kind === "search" && (
                        <>
                          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <path strokeLinecap="round" d="m21 21-4.3-4.3" />
                          </svg>
                          <span>
                            Search for <span className="font-semibold">&ldquo;{item.label}&rdquo;</span>
                          </span>
                        </>
                      )}
                      {item.kind === "recent" && (
                        <>
                          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-50" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                          </svg>
                          <span>{item.label}</span>
                        </>
                      )}
                      {item.kind === "category" && (
                        <>
                          <span aria-hidden className="text-base">
                            {categoryIcon(item.slug)}
                          </span>
                          <span>{item.label}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 px-1 py-0.5 font-mono dark:border-slate-700">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 px-1 py-0.5 font-mono dark:border-slate-700">↵</kbd>
                select
              </span>
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
