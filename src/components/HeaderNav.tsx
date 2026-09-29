"use client";

import Link from "next/link";
import { signOut } from "@/app/actions/auth";

const LOGGED_IN_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/sell", label: "Sell" },
  { href: "/saved", label: "Saved" },
  { href: "/chat", label: "Chat" },
  { href: "/profile", label: "Profile" },
];

function confirmLogout(e: React.FormEvent<HTMLFormElement>) {
  if (!window.confirm("Log out of CampusBin?")) {
    e.preventDefault();
  }
}

export default function HeaderNav({
  isLoggedIn,
  hasUnread = false,
  isAdmin = false,
}: {
  isLoggedIn: boolean;
  hasUnread?: boolean;
  isAdmin?: boolean;
}) {
  if (!isLoggedIn) {
    return (
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/login"
          className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="whitespace-nowrap rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Sign up
        </Link>
      </nav>
    );
  }

  return (
    <nav className="relative">
      {/* Desktop nav — below lg, the bottom tab bar is used instead. That
          same lg cutoff matches BottomNav's own breakpoint: the header's
          full text-link nav needs closer to 950px+ to fit without
          overflowing, well past the older sm (640px) switchover, which
          left a band where neither layout actually worked. */}
      <div className="hidden items-center gap-1 lg:flex">
        {LOGGED_IN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="relative rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {link.label}
            {link.href === "/chat" && hasUnread && (
              <span className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
          >
            Admin
          </Link>
        )}
        <form action={signOut} onSubmit={confirmLogout}>
          <button
            type="submit"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Log out
          </button>
        </form>
      </div>

      {/* Below lg: just a log out icon — everything else lives in the bottom tab bar */}
      <form action={signOut} onSubmit={confirmLogout} className="lg:hidden">
        <button
          type="submit"
          aria-label="Log out"
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </form>
    </nav>
  );
}
