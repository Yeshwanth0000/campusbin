"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Below this scroll distance the header always stays put — it only starts
// hiding once you've scrolled past the top area (roughly where the category
// strip / page content begins), so it doesn't flicker on tiny scroll bounces.
const REVEAL_ZONE_PX = 80;
const SCROLL_DELTA_THRESHOLD_PX = 8;

// An open conversation is its own screen on a phone: the thread already has
// a header carrying the other person, a back button and the safety menu, so
// this bar would be a second one stacked above it costing 57px. Tablet and up
// keep it — that's where the nav links live, and there's room for both.
function isOpenConversation(pathname: string | null) {
  if (!pathname) return false;
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "chat";
}

export default function FloatingHeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const inConversation = isOpenConversation(usePathname());

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 16);

      const delta = y - lastY.current;
      if (y < REVEAL_ZONE_PX) {
        setHidden(false);
      } else if (delta > SCROLL_DELTA_THRESHOLD_PX) {
        setHidden(true);
      } else if (delta < -SCROLL_DELTA_THRESHOLD_PX) {
        setHidden(false);
      }
      lastY.current = y;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-30 transition-all duration-300 ease-out ${
        inConversation ? "hidden sm:block" : ""
      } ${scrolled ? "px-3 pt-3 sm:px-6" : "px-0 pt-0"} ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <header
        className={`mx-auto w-full max-w-none transition-all duration-300 ease-out sm:max-w-[min(94vw,96rem)] ${
          scrolled
            ? "rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-800/60 dark:bg-slate-950 dark:shadow-black/30 lg:bg-white/75 lg:backdrop-blur-xl lg:dark:bg-slate-950/60"
            : "rounded-none border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:bg-white/95 lg:backdrop-blur lg:dark:bg-slate-950/95"
        }`}
      >
        {children}
      </header>
    </div>
  );
}
