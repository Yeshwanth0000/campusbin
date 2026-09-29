"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/app/actions/safety";
import { toast } from "@/lib/toast";
import ReportDialog from "./ReportDialog";

export default function SafetyMenu({
  userId,
  listingId,
  initialBlocked = false,
}: {
  userId: string;
  listingId?: string;
  initialBlocked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggleBlock() {
    const next = !blocked;
    setBlocked(next);
    setOpen(false);
    startTransition(async () => {
      if (next) {
        await blockUser(userId);
        toast("User blocked — their listings are hidden from you now.");
      } else {
        await unblockUser(userId);
        toast("User unblocked.");
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Safety options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Safety options"
          className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setShowReport(true);
            }}
            className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Report
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={toggleBlock}
            disabled={isPending}
            className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {blocked ? "Unblock user" : "Block user"}
          </button>
        </div>
      )}

      {showReport && (
        <ReportDialog
          userId={userId}
          listingId={listingId}
          onClose={() => {
            setShowReport(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
