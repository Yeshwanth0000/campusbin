"use client";

import { useEffect, useState } from "react";
import type { ToastType } from "@/lib/toast";

type ToastItem = { id: number; message: string; type: ToastType; leaving: boolean };

let counter = 0;
const EXIT_MS = 200;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function dismiss(id: number) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_MS);
  }

  useEffect(() => {
    function handler(e: Event) {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      const id = ++counter;
      // An identical toast that's still on screen already says it — skip the
      // duplicate (a component mounting twice, or a quick double click).
      setToasts((prev) =>
        prev.some((t) => t.message === message && t.type === type && !t.leaving)
          ? prev
          : [...prev, { id, message, type, leaving: false }]
      );
      setTimeout(() => dismiss(id), 3000);
    }
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-full py-2.5 pl-4 pr-2 text-sm font-medium text-white shadow-lg transition-all duration-200 ease-out motion-reduce:transition-none ${
            t.leaving ? "translate-y-1 opacity-0" : "animate-toast-in opacity-100"
          } ${
            t.type === "error"
              ? "bg-red-600"
              : t.type === "info"
                ? "bg-slate-900 dark:bg-slate-700"
                : "bg-emerald-600"
          }`}
        >
          {t.type === "success" && <span aria-hidden>✓</span>}
          {t.type === "error" && <span aria-hidden>✕</span>}
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
