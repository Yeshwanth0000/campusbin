"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

export default function StatCounter({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    // With reduced motion there's no count-up; the value is shown as-is below.
    if (!el || reducedMotion) return;

    function animate() {
      if (started.current) return;
      started.current = true;

      const duration = 1100;
      const start = performance.now();

      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    // Reused on pages (e.g. profile) where these counters sit above the
    // fold from the first paint — don't rely solely on the observer's
    // initial callback to catch that case, check synchronously too.
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
      animate();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animate();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);

    // Belt-and-suspenders: some environments never fire the observer even
    // once the element is genuinely on screen, so re-check manually on
    // scroll/resize too — cheap, and a no-op once animate() has run.
    function onScroll() {
      const r = el!.getBoundingClientRect();
      if (r.height > 0 && r.top < window.innerHeight * 0.9 && r.bottom > 0) animate();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [value, reducedMotion]);

  return (
    <div ref={ref} className="text-center sm:text-left">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100 sm:text-4xl">
        {reducedMotion ? value : display}
        {suffix}
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
