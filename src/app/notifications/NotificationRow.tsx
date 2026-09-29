"use client";

import Link from "next/link";
import { markNotificationRead } from "@/app/actions/notifications";
import { describeNotification, timeAgo, type NotificationLike } from "@/lib/notificationDisplay";

export default function NotificationRow({
  notification,
  index = 0,
}: {
  notification: NotificationLike;
  index?: number;
}) {
  const isUnread = !notification.read_at;
  const { href, title, subtitle } = describeNotification(notification);

  return (
    <li
      className="animate-message-in motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      <Link
        href={href}
        onClick={() => {
          if (isUnread) markNotificationRead(notification.id);
        }}
        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
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
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <span className="shrink-0 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
          {timeAgo(notification.created_at)}
        </span>
      </Link>
    </li>
  );
}
