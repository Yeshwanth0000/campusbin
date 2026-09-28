"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-6.716-4.35-9.428-8.06C.66 10.42 1.1 6.9 3.9 5.28c2.35-1.36 5.02-.6 6.6 1.32.5.6.9 1.2 1.5 1.2s1-.6 1.5-1.2c1.58-1.92 4.25-2.68 6.6-1.32 2.8 1.62 3.24 5.14 1.33 7.66C18.716 16.65 12 21 12 21z"
      />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
      />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
};

export default function BottomNav({ hasUnread = false }: { hasUnread?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 transform-gpu border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-1.5">
        <NavItem href="/browse" label="Browse" icon={ICONS.home} active={isActive("/browse")} />
        <NavItem href="/saved" label="Saved" icon={ICONS.heart} active={isActive("/saved")} />
        <Link
          href="/sell"
          aria-label="Sell an item"
          className="-mt-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30"
        >
          {ICONS.plus}
        </Link>
        <NavItem
          href="/chat"
          label="Chat"
          icon={ICONS.chat}
          active={isActive("/chat")}
          showDot={hasUnread}
        />
        <NavItem href="/profile" label="Profile" icon={ICONS.user} active={isActive("/profile")} />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  showDot,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  showDot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors duration-200 ${
        active ? "text-brand" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      {icon}
      {label}
      <span
        className={`absolute -bottom-0.5 h-1 w-1 rounded-full bg-brand transition-opacity duration-200 motion-reduce:transition-none ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      {showDot && (
        <span className="absolute right-1 top-0.5 h-2 w-2 rounded-full bg-rose-500" />
      )}
    </Link>
  );
}
