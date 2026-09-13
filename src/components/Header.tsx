import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "./HeaderNav";
import SearchIconButton from "./SearchIconButton";
import CommandPalette from "./CommandPalette";
import ThemeToggle from "./ThemeToggle";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";
import FloatingHeaderShell from "./FloatingHeaderShell";
import type { NotificationLike } from "@/lib/notificationDisplay";

export default async function Header() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: categories },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("categories").select("id, name, slug").order("name"),
  ]);

  let collegeName: string | null = null;
  let isAdmin = false;
  let hasUnread = false;
  let unreadNotificationCount = 0;
  let recentNotifications: NotificationLike[] = [];
  if (user) {
    const [{ data: profile }, { count }, { count: notifCount }, { data: notifRows }] =
      await Promise.all([
        supabase.from("profiles").select("is_admin, colleges(name)").eq("id", user.id).single(),
        supabase
          .from("messages")
          .select("id, conversations!inner(buyer_id, seller_id)", {
            count: "exact",
            head: true,
          })
          .is("read_at", null)
          .neq("sender_id", user.id)
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`, {
            foreignTable: "conversations",
          }),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
        supabase
          .from("notifications")
          .select("id, type, payload, read_at, created_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
    collegeName = profile?.colleges?.name ?? null;
    isAdmin = profile?.is_admin ?? false;
    hasUnread = (count ?? 0) > 0;
    unreadNotificationCount = notifCount ?? 0;
    recentNotifications = notifRows ?? [];
  }

  return (
    <>
      <FloatingHeaderShell>
        <div className="flex w-full items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
          <Link href="/" className="flex shrink-0 items-baseline gap-2">
            <span className="text-xl font-bold text-brand">CampusBin</span>
            {collegeName && (
              <span className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:inline">
                {collegeName}
              </span>
            )}
          </Link>

          {user && (
            <div className="hidden flex-1 sm:flex">
              <CommandPalette categories={categories ?? []} />
            </div>
          )}

          <div className="ml-auto flex items-center gap-1">
            {user && <SearchIconButton />}
            {user && (
              <NotificationBell
                userId={user.id}
                unreadCount={unreadNotificationCount}
                recentNotifications={recentNotifications}
              />
            )}
            <ThemeToggle />
            <HeaderNav isLoggedIn={!!user} hasUnread={hasUnread} isAdmin={isAdmin} />
          </div>
        </div>
      </FloatingHeaderShell>

      {user && <BottomNav hasUnread={hasUnread} />}
    </>
  );
}
