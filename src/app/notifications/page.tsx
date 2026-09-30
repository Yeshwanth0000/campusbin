import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import EmptyState from "@/components/EmptyState";
import NotificationRow from "./NotificationRow";

export const metadata = { title: "Notifications — CampusBin" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const hasUnread = notifications?.some((n) => !n.read_at) ?? false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayNotifications = notifications?.filter((n) => new Date(n.created_at) >= startOfToday) ?? [];
  const earlierNotifications = notifications?.filter((n) => new Date(n.created_at) < startOfToday) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="mt-6 space-y-6">
          {todayNotifications.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
              <p className="border-b border-slate-100/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
                Today
              </p>
              <ul className="divide-y divide-slate-100/70 dark:divide-slate-800/70">
                {todayNotifications.map((n, i) => (
                  <NotificationRow key={n.id} notification={n} index={i} />
                ))}
              </ul>
            </div>
          )}
          {earlierNotifications.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
              <p className="border-b border-slate-100/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
                Earlier
              </p>
              <ul className="divide-y divide-slate-100/70 dark:divide-slate-800/70">
                {earlierNotifications.map((n, i) => (
                  <NotificationRow key={n.id} notification={n} index={todayNotifications.length + i} />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          }
          title="No notifications yet"
          description="You'll see new messages and updates about your listings here."
          actionHref="/browse"
          actionLabel="Browse listings"
        />
      )}
    </div>
  );
}

function MarkAllReadButton() {
  return (
    <form action={markAllNotificationsRead}>
      <button
        type="submit"
        className="text-sm font-medium text-brand hover:text-brand-dark"
      >
        Mark all as read
      </button>
    </form>
  );
}
