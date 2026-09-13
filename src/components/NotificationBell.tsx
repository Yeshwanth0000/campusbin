"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";
import { describeNotification, timeAgo, type NotificationLike } from "@/lib/notificationDisplay";
import { announceOverlayOpen, onOtherOverlayOpen } from "@/lib/overlayBus";
import { createClient } from "@/lib/supabase/client";
import { pushSupported, getExistingSubscription, enablePushNotifications } from "@/lib/push";

type PushState = "checking" | "unsupported" | "denied" | "off" | "on";

const OVERLAY_ID = "notifications";
// The panel scrolls, but nothing trims the list otherwise -- cap it so a
// long session sitting on one page doesn't grow this unbounded.
const MAX_LIVE_NOTIFICATIONS = 20;

export default function NotificationBell({
  userId,
  unreadCount,
  recentNotifications,
}: {
  userId: string;
  unreadCount: number;
  recentNotifications: NotificationLike[];
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(recentNotifications);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    getExistingSubscription().then((sub) => setPushState(sub ? "on" : "off"));
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError(null);
    const { error } = await enablePushNotifications();
    setPushBusy(false);
    if (error) {
      setPushError(error);
      setPushState(Notification.permission === "denied" ? "denied" : "off");
    } else {
      setPushState("on");
    }
  }

  useEffect(() => {
    if (!open) return;
    announceOverlayOpen(OVERLAY_ID);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => onOtherOverlayOpen(OVERLAY_ID, () => setOpen(false)), []);

  // Live delivery: previously the bell only reflected whatever Header last
  // server-rendered, so a message arriving while you sat on another page
  // went unnoticed until you navigated. RLS already scopes `notifications`
  // to `recipient_id = auth.uid()`, and Realtime enforces that same policy,
  // so this channel only ever receives this user's own rows.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as NotificationLike;
          setNotifications((prev) => [row, ...prev].slice(0, MAX_LIVE_NOTIFICATIONS));
          setLocalUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleItemClick(n: NotificationLike) {
    if (!n.read_at) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setLocalUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(n.id);
    }
    setOpen(false);
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setLocalUnreadCount(0);
    markAllNotificationsRead();
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={localUnreadCount > 0 ? `Notifications, ${localUnreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {localUnreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {localUnreadCount > 9 ? "9+" : localUnreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <div
              role="dialog"
              aria-label="Notifications"
              className="fixed left-4 right-4 top-16 z-50 origin-top animate-notif-panel-in overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-xl shadow-slate-900/10 backdrop-blur-xl motion-reduce:animate-none dark:border-slate-800/70 dark:bg-slate-900/90 sm:left-auto sm:right-4 sm:top-16 sm:w-80 sm:origin-top-right"
            >
              <div className="flex items-center justify-between border-b border-slate-100/70 px-4 py-3 dark:border-slate-800/70">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
                {localUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-brand hover:text-brand-dark"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {pushState === "off" && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-100/70 bg-brand-light/50 px-4 py-2.5 dark:border-slate-800/70 dark:bg-brand/10">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Get notified even when CampusBin is closed.
                  </p>
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={pushBusy}
                    className="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    {pushBusy ? "Enabling…" : "Enable"}
                  </button>
                </div>
              )}
              {pushState === "denied" && (
                <div className="border-b border-slate-100/70 bg-slate-50 px-4 py-2.5 dark:border-slate-800/70 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notifications are blocked for CampusBin. Enable them in your browser&apos;s site settings to get
                    alerts when you&apos;re not on the page.
                  </p>
                </div>
              )}
              {pushError && (
                <p className="border-b border-slate-100/70 px-4 py-2 text-xs text-rose-600 dark:border-slate-800/70 dark:text-rose-400">
                  {pushError}
                </p>
              )}

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((n, i) => {
                    const { href, title, subtitle } = describeNotification(n);
                    const isUnread = !n.read_at;
                    return (
                      <Link
                        key={n.id}
                        href={href}
                        onClick={() => handleItemClick(n)}
                        className="flex animate-message-in items-start gap-3 px-4 py-3 transition-colors motion-reduce:animate-none hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            isUnread ? "bg-rose-500" : "bg-transparent"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm ${
                              isUnread
                                ? "font-semibold text-slate-900 dark:text-slate-100"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {title}
                          </p>
                          {subtitle && (
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
                          )}
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-400 dark:text-slate-500">
                          {timeAgo(n.created_at)}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>

              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block border-t border-slate-100/70 px-4 py-2.5 text-center text-sm font-medium text-brand transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/60"
              >
                View all
              </Link>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
